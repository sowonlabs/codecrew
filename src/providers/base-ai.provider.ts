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
    // Default implementation: return error if stderr is not empty.
    if (stderr) {
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
      const path = execSync(`which ${cliCommand}`, { encoding: 'utf-8' }).trim();
      this.logger.log(`✅ Found ${this.name} CLI at: ${path}`);
      this.cachedPath = path;
      return path;
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
    const toolPath = await this.getToolPath();
    
    if (!toolPath) {
      return {
        content: '',
        provider: this.name,
        command: `${this.getCliCommand()} (not found)`,
        success: false,
        error: this.getNotInstalledMessage(),
        taskId,
      };
    }

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

      return new Promise((resolve, reject) => {
        const child = spawn(toolPath, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: options.workingDirectory || process.cwd(),
          env: process.env,
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          const output = data.toString();
          stdout += output;
          this.appendTaskLog(taskId, 'STDOUT', output);
        });

        child.stderr.on('data', (data) => {
          const output = data.toString();
          stderr += output;
          this.appendTaskLog(taskId, 'STDERR', output);
        });

        const timeout = setTimeout(() => {
          this.appendTaskLog(taskId, 'ERROR', `Process timeout after ${options.timeout || 600000}ms`);
          child.kill('SIGTERM');
          resolve({
            content: '',
            provider: this.name,
            command,
            success: false,
            error: `${this.name} CLI response timeout`,
            taskId,
          });
        }, options.timeout || 600000);

        child.on('close', (code) => {
          clearTimeout(timeout);
          this.appendTaskLog(taskId, 'INFO', `Process closed with exit code: ${code}`);
          
          if (stderr) {
            this.logger.warn(`[${taskId}] ${this.name} stderr: ${stderr}`);
          }

          // Handle failure if exit code is non-zero or provider detects an error
          // NOTE: We check providerError even when code === 0 because some CLI tools
          // incorrectly return exit code 0 even when they encounter errors.
          // The parseProviderError method checks stderr/stdout for error patterns like
          // 'authentication', 'session limit', etc. to catch these cases.
          const providerError = this.parseProviderError(stderr, stdout);
          if (code !== 0 || providerError.error) {
            const errorMessage = providerError.message || stderr || `Exit code ${code}`;
            this.appendTaskLog(taskId, 'ERROR', `${this.name} CLI failed: ${errorMessage}`);
            this.logger.error(`[${taskId}] ${this.name} provider-level error detected: ${errorMessage}`);
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
          resolve({
            content: stdout.trim(),
            provider: this.name,
            command,
            success: true,
            taskId,
          });
        });

        child.on('error', (error: any) => {
          clearTimeout(timeout);
          this.appendTaskLog(taskId, 'ERROR', `Process error: ${error.message}`);
          resolve({
            content: '',
            provider: this.name,
            command,
            success: false,
            error: error.code === 'ENOENT' ? 
              this.getNotInstalledMessage() :
              error.message,
            taskId,
          });
        });

        // Handle stdin - only if prompt is not included in args
        if (!this.getPromptInArgs()) {
          this.appendTaskLog(taskId, 'INFO', 'Sending prompt via stdin');
          child.stdin.write(prompt);
          child.stdin.end();
        } else {
          child.stdin.end(); // Close stdin
        }
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
    const toolPath = await this.getToolPath();
    
    if (!toolPath) {
      return {
        content: '',
        provider: this.name,
        command: `${this.getCliCommand()} execute (not found)`,
        success: false,
        error: this.getNotInstalledMessage(),
        taskId,
      };
    }

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
        const child = spawn(toolPath, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: options.workingDirectory || process.cwd(),
          env: process.env,
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          const output = data.toString();
          stdout += output;
          this.appendTaskLog(taskId, 'STDOUT', output);
        });

        child.stderr.on('data', (data) => {
          const output = data.toString();
          stderr += output;
          this.appendTaskLog(taskId, 'STDERR', output);
        });

        const timeout = setTimeout(() => {
          this.appendTaskLog(taskId, 'ERROR', `Process timeout after ${options.timeout || 1200000}ms`);
          child.kill();
          resolve({
            content: '',
            provider: this.name,
            command,
            success: false,
            error: `${this.name} CLI execute timeout`,
            taskId,
          });
        }, options.timeout || 1200000); // 20min default for execute mode

        child.on('close', (code) => {
          clearTimeout(timeout);
          this.appendTaskLog(taskId, 'INFO', `Process closed with exit code: ${code}`);
          
          if (stderr) {
            this.logger.warn(`[${taskId}] ${this.name} execute stderr: ${stderr}`);
          }

          // Handle failure if exit code is non-zero or provider detects an error
          // NOTE: We check providerError even when code === 0 because some CLI tools
          // incorrectly return exit code 0 even when they encounter errors.
          // The parseProviderError method checks stderr/stdout for error patterns like
          // 'authentication', 'session limit', etc. to catch these cases.
          const providerError = this.parseProviderError(stderr, stdout);
          if (code !== 0 || providerError.error) {
            const errorMessage = providerError.message || stderr || `Exit code ${code}`;
            this.appendTaskLog(taskId, 'ERROR', `${this.name} CLI execute failed: ${errorMessage}`);
            this.logger.error(`[${taskId}] ${this.name} provider-level error detected: ${errorMessage}`);
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
          resolve({
            content: stdout.trim(),
            provider: this.name,
            command,
            success: true,
            taskId,
          });
        });

        child.on('error', (error: any) => {
          clearTimeout(timeout);
          this.appendTaskLog(taskId, 'ERROR', `Process error: ${error.message}`);
          resolve({
            content: '',
            provider: this.name,
            command,
            success: false,
            error: error.code === 'ENOENT' ? 
              this.getNotInstalledMessage() :
              error.message,
            taskId,
          });
        });

        // Handle stdin - only if prompt is not included in args
        if (!this.getPromptInArgs()) {
          this.appendTaskLog(taskId, 'INFO', 'Sending prompt via stdin');
          child.stdin.write(prompt);
          child.stdin.end();
        } else {
          this.appendTaskLog(taskId, 'INFO', 'Prompt included in command args');
          child.stdin.end(); // Close stdin
        }
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