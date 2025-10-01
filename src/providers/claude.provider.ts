import { Injectable } from '@nestjs/common';
import { BaseAIProvider } from './base-ai.provider';

@Injectable()
export class ClaudeProvider extends BaseAIProvider {
  readonly name = 'claude' as const;

  constructor() {
    super('ClaudeProvider');
  }

  protected getCliCommand(): string {
    return 'claude';
  }

  protected getDefaultArgs(): string[] {
    return ['-p'];
  }

  protected getExecuteArgs(): string[] {
    // Set basic execution mode only. All security options are controlled in agents.yaml
    return ['-p'];
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
}