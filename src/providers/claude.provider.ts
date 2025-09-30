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
    const errorMessage = stderr || stdout;

    if (errorMessage.includes('Session limit reached')) {
      const resetMatch = errorMessage.match(/resets (\d+(?::\d+)?(?:am|pm))/i);
      const resetTime = resetMatch ? resetMatch[1] : 'later today';
      return {
        error: true,
        message: `Claude Pro session limit reached. Your limit will reset at ${resetTime}. Please try again after the reset or use another AI agent (Gemini or Copilot) in the meantime.`,
      };
    }

    if (errorMessage.includes('authentication') || errorMessage.includes('login')) {
      return {
        error: true,
        message:
          'Claude CLI authentication required. Please run `claude login` to authenticate.',
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return {
        error: true,
        message:
          'Network connection error. Please check your internet connection and try again.',
      };
    }

    if (stderr && !stdout) {
      return { error: true, message: stderr };
    }

    return { error: false, message: '' };
  }
}