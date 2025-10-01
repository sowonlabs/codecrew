import { Injectable } from '@nestjs/common';
import { BaseAIProvider } from './base-ai.provider';
import { AIQueryOptions, AIResponse } from './ai-provider.interface';
import { ToolCallService, Tool } from '../services/tool-call.service';

@Injectable()
export class ClaudeProvider extends BaseAIProvider {
  readonly name = 'claude' as const;

  constructor(private readonly toolCallService?: ToolCallService) {
    super('ClaudeProvider');
  }

  protected getCliCommand(): string {
    return 'claude';
  }

  protected getDefaultArgs(): string[] {
    return ['--verbose'];
  }

  protected getExecuteArgs(): string[] {
    // Set basic execution mode only. All security options are controlled in agents.yaml
    return ['--verbose'];
  }

  protected getNotInstalledMessage(): string {
    return 'Claude CLI is not installed. Please install it from https://claude.ai/download.';
  }

  public parseProviderError(
    stderr: string,
    stdout: string,
  ): { error: boolean; message: string } {
    // NOTE: This method is used to detect errors even when CLI tools return exit code 0.
    // Some AI CLI tools incorrectly return success exit codes even when encountering errors.
    // We check stderr first, as it's more likely to contain actual error messages.
    // Be careful not to treat normal response content as errors.
    
    const combinedOutput = stderr || stdout; // Only for session limit check

    // Check for session limit (definite error)
    if (combinedOutput.includes('Session limit reached')) {
      const resetMatch = combinedOutput.match(/resets (\d+(?::\d+)?(?:am|pm))/i);
      const resetTime = resetMatch ? resetMatch[1] : 'later today';
      return {
        error: true,
        message: `Claude Pro session limit reached. Your limit will reset at ${resetTime}. Please try again after the reset or use another AI agent (Gemini or Copilot) in the meantime.`,
      };
    }

    // Check for authentication errors
    if (stderr && (stderr.includes('authentication required') || stderr.includes('Please run `claude login`'))) {
      return {
        error: true,
        message:
          'Claude CLI authentication required. Please run `claude login` to authenticate.',
      };
    }

    // If stdout exists and has content, the command succeeded
    // stderr is just debug logs from Claude CLI (follow-redirects, spawn-rx, etc)
    if (stdout && stdout.trim().length > 0) {
      return { error: false, message: '' };
    }

    // No stdout - check if stderr contains actual error messages
    if (stderr && stderr.trim().length > 0) {
      // Pattern 1: Actual error messages (short, clear)
      const errorIndicators = [
        /^Error:/im,                    // Starts with "Error:"
        /^Failed:/im,                   // Starts with "Failed:"
        /^Unable to/im,                 // Starts with "Unable to"
        /command not found/i,           // Shell error
        /no such file/i,                // File error
        /permission denied/i,           // Permission error
        /ECONNREFUSED/,                 // Network error code
        /ETIMEDOUT/,                    // Timeout error code
        /ENOTFOUND/,                    // DNS error code
        /EHOSTUNREACH/,                 // Host unreachable
        /\bconnection refused\b/i,      // Word boundary for "connection refused"
        /\bnetwork error\b/i,           // Word boundary for "network error"
        /\brequest failed\b/i,          // Word boundary for "request failed"
      ];

      // Pattern 2: Debug logs (ignore these)
      const debugLogPatterns = [
        /follow-redirects options/,     // HTTP debug
        /spawn-rx/,                     // Process spawn debug
        /\[Function:/,                  // Function objects
        /connectionListener/,           // Function name in debug
        /maxRedirects:/,                // HTTP config
        /\{[\s\S]*protocol:.*\}/,       // JSON object with protocol
      ];

      // Check if stderr is debug logs
      const isDebugLog = debugLogPatterns.some(pattern => pattern.test(stderr));
      if (isDebugLog) {
        return { error: false, message: '' };
      }

      // Check if stderr contains actual errors
      const hasError = errorIndicators.some(pattern => pattern.test(stderr));
      if (hasError) {
        // Extract first line as error message (usually the most relevant)
        const lines = stderr.split('\n');
        const firstLine = lines[0]?.trim() || stderr.trim();
        return { error: true, message: firstLine };
      }
    }

    // No stdout and no clear error in stderr
    return { error: false, message: '' };
  }

  /**
   * Build a prompt that includes tool definitions for Claude
   */
  private buildPromptWithTools(prompt: string, tools: Tool[]): string {
    if (!tools || tools.length === 0) {
      return prompt;
    }

    const toolsSection = `

Available tools:
${tools.map(t => `- ${t.name}: ${t.description}
  Input schema: ${JSON.stringify(t.input_schema, null, 2)}`).join('\n')}

To use a tool, respond with a JSON object in this format:
{
  "type": "tool_use",
  "name": "tool_name",
  "input": { ...tool parameters... }
}

If you don't need to use a tool, respond normally.
`;

    return toolsSection + '\n' + prompt;
  }

  /**
   * Build a follow-up prompt with tool execution result
   */
  private buildFollowUpPrompt(toolName: string, toolInput: any, toolResult: any): string {
    return `Tool execution result:
Tool: ${toolName}
Input: ${JSON.stringify(toolInput)}
Result: ${JSON.stringify(toolResult)}

Please continue with your response based on this tool result.`;
  }

  /**
   * Parse Claude's JSON response to detect tool usage
   */
  private parseToolUse(content: string): { isToolUse: boolean; toolName?: string; toolInput?: any } {
    try {
      const parsed = JSON.parse(content);

      // Check if it's a tool_use response
      if (parsed.type === 'tool_use' && parsed.name && parsed.input) {
        return {
          isToolUse: true,
          toolName: parsed.name,
          toolInput: parsed.input,
        };
      }

      // Check for Claude API format with content array
      if (parsed.content && Array.isArray(parsed.content)) {
        const toolUse = parsed.content.find((c: any) => c.type === 'tool_use');
        if (toolUse) {
          return {
            isToolUse: true,
            toolName: toolUse.name,
            toolInput: toolUse.input,
          };
        }
      }

      // Check for stop_reason === 'tool_use'
      if (parsed.stop_reason === 'tool_use' && parsed.content) {
        const content = Array.isArray(parsed.content) ? parsed.content : [parsed.content];
        const toolUse = content.find((c: any) => c.type === 'tool_use');
        if (toolUse) {
          return {
            isToolUse: true,
            toolName: toolUse.name,
            toolInput: toolUse.input,
          };
        }
      }
    } catch (error) {
      // Not JSON or not a tool use
    }

    return { isToolUse: false };
  }

  /**
   * Query with tool call support (multi-turn conversation)
   */
  async queryWithTools(prompt: string, options: AIQueryOptions = {}, maxTurns: number = 5): Promise<AIResponse> {
    if (!this.toolCallService) {
      this.logger.warn('ToolCallService not available, falling back to regular query');
      return this.query(prompt, options);
    }

    let turn = 0;
    let currentPrompt = prompt;
    const tools = this.toolCallService.list();

    // Add tools to the initial prompt
    currentPrompt = this.buildPromptWithTools(currentPrompt, tools);

    while (turn < maxTurns) {
      this.logger.log(`Tool call turn ${turn + 1}/${maxTurns}`);

      // Execute query
      const response = await this.query(currentPrompt, options);

      if (!response.success) {
        return response;
      }

      // Check if response contains tool use
      const toolUse = this.parseToolUse(response.content);

      if (!toolUse.isToolUse) {
        // No tool use detected, return the response
        this.logger.log('No tool use detected, returning response');
        return response;
      }

      // Execute the tool
      this.logger.log(`Executing tool: ${toolUse.toolName}`);

      try {
        const toolResult = await this.toolCallService.execute(
          toolUse.toolName!,
          toolUse.toolInput!
        );

        // Build follow-up prompt with tool result
        currentPrompt = this.buildFollowUpPrompt(
          toolUse.toolName!,
          toolUse.toolInput!,
          toolResult
        );

        turn++;
      } catch (error: any) {
        this.logger.error(`Tool execution failed: ${error.message}`);

        // Return error response
        return {
          content: '',
          provider: this.name,
          command: response.command,
          success: false,
          error: `Tool execution failed: ${error.message}`,
          taskId: response.taskId,
        };
      }
    }

    // Max turns exceeded
    this.logger.error(`Max tool call turns (${maxTurns}) exceeded`);
    return {
      content: '',
      provider: this.name,
      command: `${this.getCliCommand()} (max turns exceeded)`,
      success: false,
      error: `Maximum tool call iterations (${maxTurns}) exceeded`,
      taskId: options.taskId,
    };
  }
}