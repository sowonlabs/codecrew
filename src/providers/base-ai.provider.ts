import { Injectable, Logger } from '@nestjs/common';
import { spawn, execSync } from 'child_process';
import { writeFileSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AIProvider, AIQueryOptions, AIResponse } from './ai-provider.interface';

@Injectable()
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: 'claude' | 'gemini' | 'copilot';
  protected readonly logger: Logger;
  private readonly logsDir = join(process.cwd(), '.codecrew', 'logs');
  private cachedPath: string | null = null;

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
    
    // Create log directory
    try {
      mkdirSync(this.logsDir, { recursive: true });
    } catch (error) {
      // Ignore if it already exists
    }
  }

  /**
   * CLI command name for each provider
   */
  protected abstract getCliCommand(): string;

  /**
   * Default CLI arguments for each provider (query mode)
   */
  protected abstract getDefaultArgs(): string[];

  /**
   * CLI arguments for each provider's execute mode
   */
  protected abstract getExecuteArgs(): string[];

  /**
   * Error message for each provider
   */
  protected abstract getNotInstalledMessage(): string;

  /**
   * Whether to include the prompt in args in Execute mode
   * (Gemini includes the prompt in args with --yolo, other providers use stdin)
   */
  protected getPromptInArgs(): boolean {
    return false; // Default is to use stdin
  }

  /**
   * Parse provider-specific error messages to provide better user feedback
   */
  public parseProviderError(
    stderr: string,
    stdout: string,
  ): { error: boolean; message: string } {
    // Default implementation: Only treat stderr as error if there's no stdout
    // If stdout exists (successful response), stderr likely contains warnings/debug messages
    if (stderr && !stdout) {
      return { error: true, message: stderr };
    }
    return { error: false, message: '' };
  }

  async getToolPath(): Promise<string | null> {
    if (this.cachedPath !== null) {
      return this.cachedPath;
    }

    try {
      const cliCommand = this.getCliCommand();
      // Use 'where' on Windows, 'which' on Unix-like systems
      const isWindows = process.platform === 'win32';
      const command = isWindows ? `where ${cliCommand}` : `which ${cliCommand}`;
      const path = execSync(command, { encoding: 'utf-8' }).trim();
      
      // Windows 'where' returns multiple lines if there are multiple matches
      // Prefer executables with extensions (.cmd, .exe, .bat, .ps1) over extensionless files
      let finalPath: string;
      if (isWindows) {
        const paths = path.split('\n').map(p => p.trim()).filter(p => p);
        // Find first path with a known executable extension
        const pathWithExt = paths.find(p => /\.(cmd|exe|bat|ps1)$/i.test(p));
        finalPath = pathWithExt || paths[0] || '';
      } else {
        finalPath = path;
      }
      
      this.logger.log(`✅ Found ${this.name} CLI at: ${finalPath}`);
      this.cachedPath = finalPath;
      return finalPath;
    } catch (error: any) {
      this.logger.error(`❌ ${this.name} not found in PATH: ${error.message}`);
      this.cachedPath = '';
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    const path = await this.getToolPath();
    return path !== null && path !== '';
  }

  private createTaskLogFile(taskId: string, provider: string, command: string): string {
    const logFile = join(this.logsDir, `${taskId}.log`);
    const timestamp = new Date().toLocaleString();
    const header = `=== TASK LOG: ${taskId} ===
Provider: ${provider}
Command: ${command}
Started: ${timestamp}

`;
    writeFileSync(logFile, header, 'utf8');
    return logFile;
  }

  private appendTaskLog(taskId: string, level: 'STDOUT' | 'STDERR' | 'INFO' | 'ERROR', message: string): void {
    try {
      const logFile = join(this.logsDir, `${taskId}.log`);
      const timestamp = new Date().toLocaleString();
      const logEntry = `[${timestamp}] ${level}: ${message}\n`;
      appendFileSync(logFile, logEntry, 'utf8');
    } catch (error) {
      this.logger.error(`Failed to append to task log ${taskId}:`, error);
    }
  }

  async query(prompt: string, options: AIQueryOptions = {}): Promise<AIResponse> {
    const taskId = options.taskId || `${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Use command name directly - let the shell find it in PATH
    const executablePath = this.getCliCommand();

    try {
      let args = [
        ...(options.additionalArgs || []),
        ...this.getDefaultArgs(),
      ];
      
      // Add --model option if specified
      if (options.model) {
        args.unshift(`--model=${options.model}`);
      }
      
      // Providers handle prompts differently
      if (this.getPromptInArgs()) {
        // Include prompt in args like Copilot
        args.push(prompt);
      }
      const command = `${this.getCliCommand()} ${args.join(' ')}`;
      
      // Create task log file
      this.createTaskLogFile(taskId, this.name, command);
      this.appendTaskLog(taskId, 'INFO', `Starting ${this.name} query mode`);
      this.appendTaskLog(taskId, 'INFO', `Prompt length: ${prompt.length} characters`);
      
      // Log prompt content (entire content for debugging)
      this.appendTaskLog(taskId, 'INFO', `Prompt content:\n${prompt}`);

      this.logger.log(`Executing ${this.name} with prompt (length: ${prompt.length})`);

      return new Promise((resolve) => {
        // Use command name directly with shell: true for cross-platform execution
        const child = spawn(executablePath, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: options.workingDirectory || process.cwd(),
          env: process.env,
          shell: true, // Let shell handle .cmd/.bat files on Windows
        });

        let stdout = '';
        let stderr = '';
        let exitCode: number | null = null;

        child.stdout.on('data', (data: any) => {
          const output = data.toString();
          stdout += output;
          this.appendTaskLog(taskId, 'STDOUT', output);
        });

        child.stderr.on('data', (data: any) => {
          const output = data.toString();
          stderr += output;
          this.appendTaskLog(taskId, 'STDERR', output);
        });

        child.on('close', (code: any) => {
          exitCode = code;
          this.appendTaskLog(taskId, 'INFO', `Process closed with exit code: ${exitCode}`);

          if (stderr) {
            this.logger.warn(`[${taskId}] ${this.name} stderr: ${stderr}`);
          }

          const providerError = this.parseProviderError(stderr, stdout);
          if (exitCode !== 0 || providerError.error) {
            const errorMessage = providerError.message || stderr || `Exit code ${exitCode}`;
            this.appendTaskLog(taskId, 'ERROR', `${this.name} CLI failed: ${errorMessage}`);
            resolve({
              content: '',
              provider: this.name,
              command,
              success: false,
              error: `${this.name} CLI failed: ${errorMessage}`,
              taskId,
            });
            return;
          }

          this.appendTaskLog(taskId, 'INFO', `${this.name} query completed successfully`);

          // Try to parse JSON output if available
          let parsedContent = stdout.trim();
          try {
            const jsonOutput = JSON.parse(stdout);
            // If JSON parsing succeeds, keep the original JSON string
            // The consumer will handle JSON parsing if needed
            parsedContent = stdout.trim();
            this.appendTaskLog(taskId, 'INFO', 'JSON output detected and validated');
          } catch (jsonError) {
            // Not JSON, use as plain text
            this.appendTaskLog(taskId, 'INFO', 'Plain text output (not JSON)');
          }

          resolve({
            content: parsedContent,
            provider: this.name,
            command,
            success: true,
            taskId,
          });
        });

        child.on('error', (error: any) => {
          this.appendTaskLog(taskId, 'ERROR', `Process error: ${error.message}`);
          resolve({
            content: '',
            provider: this.name,
            command,
            success: false,
            error: error.code === 'ENOENT' ? this.getNotInstalledMessage() : error.message,
            taskId,
          });
        });

        // Send prompt via stdin if not in args
        if (!this.getPromptInArgs()) {
          child.stdin.write(prompt);
          child.stdin.end();
        } else {
          child.stdin.end();
        }

        // Timeout handling
        const timeout = setTimeout(() => {
          child.kill();
          resolve({
            content: '',
            provider: this.name,
            command,
            success: false,
            error: `${this.name} CLI timeout`,
            taskId,
          });
        }, options.timeout || 600000);

        child.on('close', () => clearTimeout(timeout));
      });
    } catch (error: any) {
      this.logger.error(`${this.name} execution failed: ${error.message}`, error.stack);
      return {
        content: '',
        provider: this.name,
        command: `${this.getCliCommand()} (error)`,
        success: false,
        error: error.message || 'Unknown error occurred',
        taskId,
      };
    }
  }

  async execute(prompt: string, options: AIQueryOptions = {}): Promise<AIResponse> {
    const taskId = options.taskId || `${this.name}_execute_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Use command name directly - let the shell find it in PATH
    const executablePath = this.getCliCommand();

    try {
      let args = [
        ...(options.additionalArgs || []),
        ...this.getExecuteArgs(),
      ];
      
      // Add --model option if specified
      if (options.model) {
        args.unshift(`--model=${options.model}`);
      }
      
      // Providers handle prompts differently
      if (this.getPromptInArgs()) {
        // Include prompt in args like Copilot, Gemini
        args.push(prompt);
      }
      const command = `${this.getCliCommand()} ${args.join(' ')}`;
      
      // Create task log file
      this.createTaskLogFile(taskId, this.name, command);
      
      // Debugging: add option logging
      this.appendTaskLog(taskId, 'INFO', `Additional Args: ${JSON.stringify(options.additionalArgs || [])}`);
      this.appendTaskLog(taskId, 'INFO', `Execute Args: ${JSON.stringify(this.getExecuteArgs())}`);
      this.appendTaskLog(taskId, 'INFO', `Final Args: ${JSON.stringify(args)}`);
      this.appendTaskLog(taskId, 'INFO', `Starting ${this.name} execute mode`);
      this.appendTaskLog(taskId, 'INFO', `Prompt length: ${prompt.length} characters`);
      
      // Log prompt content
      const promptPreview = prompt.length > 500 ? 
        prompt.substring(0, 500) + '...[truncated]' : 
        prompt;
      this.appendTaskLog(taskId, 'INFO', `Prompt content:\n${promptPreview}`);

      this.logger.log(`Executing ${this.name} in execute mode (length: ${prompt.length})`);

      return new Promise((resolve) => {
        // Use command name directly with shell: true for cross-platform execution
        const child = spawn(executablePath, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: options.workingDirectory || process.cwd(),
          env: process.env,
          shell: true, // Let shell handle .cmd/.bat files on Windows
        });

        let stdout = '';
        let stderr = '';
        let exitCode: number | null = null;

        child.stdout.on('data', (data: any) => {
          const output = data.toString();
          stdout += output;
          this.appendTaskLog(taskId, 'STDOUT', output);
        });

        child.stderr.on('data', (data: any) => {
          const output = data.toString();
          stderr += output;
          this.appendTaskLog(taskId, 'STDERR', output);
        });

        child.on('close', (code: any) => {
          exitCode = code;
          this.appendTaskLog(taskId, 'INFO', `Process closed with exit code: ${exitCode}`);

          if (stderr) {
            this.logger.warn(`[${taskId}] ${this.name} stderr: ${stderr}`);
          }

          const providerError = this.parseProviderError(stderr, stdout);
          if (exitCode !== 0 || providerError.error) {
            const errorMessage = providerError.message || stderr || `Exit code ${exitCode}`;
            this.appendTaskLog(taskId, 'ERROR', `${this.name} CLI failed: ${errorMessage}`);
            resolve({
              content: '',
              provider: this.name,
              command,
              success: false,
              error: `${this.name} CLI execute failed: ${errorMessage}`,
              taskId,
            });
            return;
          }

          this.appendTaskLog(taskId, 'INFO', `${this.name} execute completed successfully`);

          // Try to parse JSON output if available
          let parsedContent = stdout.trim();
          try {
            const jsonOutput = JSON.parse(stdout);
            // If JSON parsing succeeds, keep the original JSON string
            // The consumer will handle JSON parsing if needed
            parsedContent = stdout.trim();
            this.appendTaskLog(taskId, 'INFO', 'JSON output detected and validated');
          } catch (jsonError) {
            // Not JSON, use as plain text
            this.appendTaskLog(taskId, 'INFO', 'Plain text output (not JSON)');
          }

          resolve({
            content: parsedContent,
            provider: this.name,
            command,
            success: true,
            taskId,
          });
        });

        child.on('error', (error: any) => {
          this.appendTaskLog(taskId, 'ERROR', `Process error: ${error.message}`);
          resolve({
            content: '',
            provider: this.name,
            command,
            success: false,
            error: error.code === 'ENOENT' ? this.getNotInstalledMessage() : error.message,
            taskId,
          });
        });

        // Send prompt via stdin if not in args
        if (!this.getPromptInArgs()) {
          child.stdin.write(prompt);
          child.stdin.end();
        } else {
          child.stdin.end();
        }

        // Timeout handling
        const timeout = setTimeout(() => {
          child.kill();
          resolve({
            content: '',
            provider: this.name,
            command,
            success: false,
            error: `${this.name} CLI execute timeout`,
            taskId,
          });
        }, options.timeout || 1200000); // 20min default

        child.on('close', () => clearTimeout(timeout));
      });
    } catch (error: any) {
      this.logger.error(`${this.name} execute failed: ${error.message}`, error.stack);
      return {
        content: '',
        provider: this.name,
        command: `${this.getCliCommand()} execute (error)`,
        success: false,
        error: error.message || 'Unknown error occurred',
        taskId,
      };
    }
  }
}