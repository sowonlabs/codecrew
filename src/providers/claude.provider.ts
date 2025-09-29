import { Injectable } from '@nestjs/common';
import { BaseAIProvider } from './base-ai.provider';

@Injectable()
export class ClaudeProvider extends BaseAIProvider {
  readonly name = 'claude' as const;

  constructor() {
    super(ClaudeProvider.name);
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
}