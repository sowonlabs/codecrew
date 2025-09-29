import { Injectable } from '@nestjs/common';
import { BaseAIProvider } from './base-ai.provider';

@Injectable()
export class CopilotProvider extends BaseAIProvider {
  readonly name = 'copilot' as const;

  constructor() {
    super(CopilotProvider.name);
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
}