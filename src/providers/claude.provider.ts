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

  protected parseProviderError(stderr: string, stdout: string): string {
    const errorMessage = stderr || stdout;
    
    // Check for session limit error
    if (errorMessage.includes('Session limit reached')) {
      const resetMatch = errorMessage.match(/resets (\d+(?::\d+)?(?:am|pm))/i);
      const resetTime = resetMatch ? resetMatch[1] : 'later today';
      
      return `Claude Pro session limit reached. Your limit will reset at ${resetTime}. Please try again after the reset or use another AI agent (Gemini or Copilot) in the meantime.`;
    }
    
    // Check for authentication errors
    if (errorMessage.includes('authentication') || errorMessage.includes('login')) {
      return 'Claude CLI authentication required. Please run `claude login` to authenticate.';
    }
    
    // Check for network errors
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return 'Network connection error. Please check your internet connection and try again.';
    }
    
    // Default to original error message
    return errorMessage;
  }
}