import { Logger } from '@nestjs/common';
import {
  ConversationThread,
  FetchHistoryOptions,
  IConversationHistoryProvider,
} from './conversation-history.interface';
import { IntelligentCompressionService } from '../services/intelligent-compression.service';

/**
 * Base implementation with common conversation history logic
 * Enhanced with intelligent compression capabilities
 */
export abstract class BaseConversationHistoryProvider
  implements IConversationHistoryProvider
{
  protected readonly logger: Logger;
  protected compressionService?: IntelligentCompressionService;

  constructor(
    loggerContext: string,
    compressionService?: IntelligentCompressionService
  ) {
    this.logger = new Logger(loggerContext);
    this.compressionService = compressionService;
  }

  abstract fetchHistory(
    threadId: string,
    options?: FetchHistoryOptions,
  ): Promise<ConversationThread>;

  abstract hasHistory(threadId: string): Promise<boolean>;

  /**
   * Format conversation history for AI context with intelligent compression
   * Note: For built-in agents (claude, gemini, copilot), conversation history
   * is now handled via template system with security keys. This method is
   * kept for backward compatibility and non-built-in agents.
   */
  async formatForAI(
    thread: ConversationThread,
    options?: FetchHistoryOptions,
  ): Promise<string> {
    const maxLength = options?.maxContextLength || 4000;
    const limit = options?.limit || 20;
    const excludeCurrent = options?.excludeCurrent ?? true;

    let messages = [...thread.messages];

    // Exclude the most recent message if requested
    if (excludeCurrent && messages.length > 0) {
      messages = messages.slice(0, -1);
    }

    // Return empty if no messages to format
    if (messages.length === 0) {
      return '';
    }

    // Use intelligent compression if available and conversation is long
    if (this.compressionService && messages.length > limit) {
      this.logger.debug(`Using intelligent compression for ${messages.length} messages`);
      
      const threadForCompression: ConversationThread = {
        ...thread,
        messages: messages
      };

      return await this.compressionService.compressConversationHistory(
        threadForCompression,
        {
          maxTokens: Math.floor(maxLength / 4), // Estimate tokens from characters
          maxMessages: limit,
          preserveRecentCount: Math.min(5, Math.floor(limit / 4)),
          preserveImportant: true
        }
      );
    }

    // Fallback to simple truncation for backward compatibility
    return this.formatForAISimple(thread, options);
  }

  /**
   * Simple formatting method (original implementation)
   */
  formatForAISimple(
    thread: ConversationThread,
    options?: FetchHistoryOptions,
  ): string {
    const maxLength = options?.maxContextLength || 4000;
    const limit = options?.limit || 20;
    const excludeCurrent = options?.excludeCurrent ?? true;

    let messages = [...thread.messages];

    // Exclude the most recent message if requested
    if (excludeCurrent && messages.length > 0) {
      messages = messages.slice(0, -1);
    }

    // Limit number of messages
    if (messages.length > limit) {
      messages = messages.slice(-limit);
    }

    // Build context string with length limit
    let context = '';
    const formattedMessages: string[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (!msg) continue;

      // Include agent ID in Assistant role if available
      const role = msg.isAssistant
        ? msg.metadata?.agent_id
          ? `Assistant (@${msg.metadata.agent_id})`
          : 'Assistant'
        : 'User';
      const formatted = `${role}: ${msg.text}`;

      // Check if adding this message would exceed max length
      if (context.length + formatted.length + 1 > maxLength) {
        this.logger.debug(
          `Context length limit reached (${maxLength} chars), truncating history`,
        );
        break;
      }

      formattedMessages.unshift(formatted);
      context = formattedMessages.join('\n');
    }

    if (formattedMessages.length < messages.length) {
      this.logger.warn(
        `Truncated conversation: ${formattedMessages.length}/${messages.length} messages included`,
      );
    }

    return context;
  }

  /**
   * Sanitize message text to remove sensitive information
   */
  protected sanitizeMessage(text: string): string {
    return text
      .replace(/password[:\s]*\S+/gi, 'password: ***')
      .replace(/token[:\s]*\S+/gi, 'token: ***')
      .replace(/api[_-]?key[:\s]*\S+/gi, 'api_key: ***')
      .replace(/secret[:\s]*\S+/gi, 'secret: ***');
  }
}
