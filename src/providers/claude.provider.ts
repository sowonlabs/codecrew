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
    
    const errorMessage = stderr || stdout;

    // Check for session limit (definite error)
    if (errorMessage.includes('Session limit reached')) {
      const resetMatch = errorMessage.match(/resets (\d+(?::\d+)?(?:am|pm))/i);
      const resetTime = resetMatch ? resetMatch[1] : 'later today';
      return {
        error: true,
        message: `Claude Pro session limit reached. Your limit will reset at ${resetTime}. Please try again after the reset or use another AI agent (Gemini or Copilot) in the meantime.`,
      };
    }

    // Check for authentication errors - only in stderr or at the start of output
    // Avoid matching 'authentication' in response content by checking context
    if (stderr && (stderr.includes('authentication required') || stderr.includes('Please run `claude login`'))) {
      return {
        error: true,
        message:
          'Claude CLI authentication required. Please run `claude login` to authenticate.',
      };
    }

    // Check for network errors
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return {
        error: true,
        message:
          'Network connection error. Please check your internet connection and try again.',
      };
    }

    // Only treat stderr as error if there's no stdout (empty response)
    if (stderr && !stdout) {
      return { error: true, message: stderr };
    }

    return { error: false, message: '' };
  }
}