import { Injectable } from '@nestjs/common';
import { BaseAIProvider } from './base-ai.provider';

@Injectable()
export class GeminiProvider extends BaseAIProvider {
  readonly name = 'gemini' as const;

  constructor() {
    super('GeminiProvider');
  }

  protected getCliCommand(): string {
    return 'gemini';
  }

  protected getDefaultArgs(): string[] {
    return ['-p']; // query mode by default
  }

  protected getExecuteArgs(): string[] {
    // Gemini does not actively use tools without --yolo, so it is included by default in Execute mode
    // If the user specifies other options in agents.yaml, they will take precedence
    return ['--yolo', '-p'];
  }

  protected getPromptInArgs(): boolean {
    return true; // Gemini puts prompt in args for --yolo mode
  }

  protected getNotInstalledMessage(): string {
    return 'Gemini CLI is not installed.';
  }
}