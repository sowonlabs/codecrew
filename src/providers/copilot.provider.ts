
import { Injectable } from '@nestjs/common';
import { BaseAIProvider } from './base-ai.provider';

@Injectable()
export class CopilotProvider extends BaseAIProvider {
  readonly name = 'copilot' as const;

  constructor() {
    super('CopilotProvider');
  }

  protected getCliCommand(): string {
    return 'copilot';
  }

  protected getDefaultArgs(): string[] {
    return ['-p'];
  }

  protected getExecuteArgs(): string[] {
    // Set basic execution mode only. All security options are controlled in agents.yaml
    return ['-p'];
  }

  protected getPromptInArgs(): boolean {
    // Copilot CLI requires prompt as command line argument, not stdin
    return true;
  }

  protected getNotInstalledMessage(): string {
    return 'GitHub Copilot CLI is not installed. Please refer to https://docs.github.com/copilot/how-tos/set-up/install-copilot-cli to install it.';
  }

  /**
   * Parse Copilot CLI error messages (e.g., quota, auth, network)
   */
  public parseProviderError(
    stderr: string,
    stdout: string,
  ): { error: boolean; message: string } {
    const errorMessage = stderr || stdout;

    if (errorMessage.includes('quota') && errorMessage.includes('exceed')) {
      return {
        error: true,
        message:
          'Copilot quota exceeded. Please check your plan at https://github.com/features/copilot/plans or try again later.',
      };
    }
    if (errorMessage.includes('quota_exceeded')) {
      return {
        error: true,
        message:
          'Copilot quota exceeded. Please check your plan at https://github.com/features/copilot/plans.',
      };
    }
    if (
      errorMessage.toLowerCase().includes('auth') ||
      errorMessage.toLowerCase().includes('login')
    ) {
      return {
        error: true,
        message:
          'Copilot CLI authentication is required. Please authenticate using the `copilot login` command.',
      };
    }
    if (
      errorMessage.toLowerCase().includes('network') ||
      errorMessage.toLowerCase().includes('connection')
    ) {
      return {
        error: true,
        message: 'Network connection error. Please check your internet connection and try again.',
      };
    }

    // If there is only stderr without stdout, consider it a fatal error
    if (stderr && !stdout) {
      return { error: true, message: stderr };
    }

    return { error: false, message: '' };
  }
}