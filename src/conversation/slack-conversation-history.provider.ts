import { Injectable } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import { BaseConversationHistoryProvider } from './base-conversation-history.provider';
import {
  ConversationMessage,
  ConversationThread,
  FetchHistoryOptions,
} from './conversation-history.interface';

@Injectable()
export class SlackConversationHistoryProvider extends BaseConversationHistoryProvider {
  private client?: WebClient;
  private cache: Map<
    string,
    { thread: ConversationThread; timestamp: number }
  > = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor() {
    super(SlackConversationHistoryProvider.name);
  }

  /**
   * Initialize with Slack client
   */
  initialize(client: WebClient) {
    this.client = client;
  }

  /**
   * Fetch thread history from Slack API
   */
  async fetchHistory(
    threadId: string,
    options?: FetchHistoryOptions,
  ): Promise<ConversationThread> {
    // Parse threadId format: "channel:thread_ts"
    const [channel, threadTs] = threadId.split(':');

    if (!channel || !threadTs) {
      throw new Error(
        `Invalid thread ID format. Expected "channel:thread_ts", got: ${threadId}`,
      );
    }

    // Check cache
    const cached = this.getCachedThread(threadId);
    if (cached) {
      this.logger.debug(`Using cached thread history for ${threadId}`);
      return cached;
    }

    if (!this.client) {
      throw new Error('Slack client not initialized');
    }

    try {
      this.logger.log(
        `Fetching thread history: channel=${channel}, ts=${threadTs}`,
      );

      const result = await this.client.conversations.replies({
        channel,
        ts: threadTs,
        limit: options?.limit || 100,
      });

      if (!result.ok || !result.messages) {
        this.logger.warn('Failed to fetch thread history');
        return this.createEmptyThread(threadId);
      }

      const messages: ConversationMessage[] = result.messages.map(
        (msg: any) => ({
          id: msg.ts,
          userId: msg.bot_id ? 'assistant' : msg.user,
          text: this.sanitizeMessage(this.extractMessageContent(msg)),
          timestamp: new Date(parseFloat(msg.ts) * 1000),
          isAssistant: !!msg.bot_id,
          metadata: {
            ts: msg.ts,
            thread_ts: msg.thread_ts,
            agent_id: msg.metadata?.event_payload?.agent_id,
            provider: msg.metadata?.event_payload?.provider,
          },
        }),
      );

      const thread: ConversationThread = {
        threadId,
        platform: 'slack',
        messages,
        metadata: {
          channel,
          threadTs,
        },
      };

      // Cache the result
      this.cacheThread(threadId, thread);

      this.logger.log(`Retrieved ${messages.length} messages from thread`);
      return thread;
    } catch (error: any) {
      this.logger.error(`Error fetching thread history: ${error.message}`);

      // Check for permission errors
      if (error.data?.error === 'missing_scope') {
        this.logger.error(
          'Missing required Slack scope for reading thread history',
        );
      }

      return this.createEmptyThread(threadId);
    }
  }

  /**
   * Check if thread has history
   */
  async hasHistory(threadId: string): Promise<boolean> {
    try {
      const thread = await this.fetchHistory(threadId, { limit: 1 });
      return thread.messages.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Format history with Slack-specific context
   */
  async formatForAI(
    thread: ConversationThread,
    options?: FetchHistoryOptions,
  ): Promise<string> {
    const baseContext = await super.formatForAI(thread, options);

    if (!baseContext) {
      return '';
    }

    return `Previous conversation in this Slack thread:\n${baseContext}\n`;
  }

  /**
   * Extract message content from Slack message
   * Bot messages store actual content in blocks[], not in text field
   */
  private extractMessageContent(msg: any): string {
    if (msg.bot_id && msg.blocks && Array.isArray(msg.blocks)) {
      // Extract text from section blocks, excluding header blocks
      const sections = msg.blocks
        .filter((b: any) => b.type === 'section' && b.text?.text)
        .map((b: any) => b.text.text);

      if (sections.length > 0) {
        return this.cleanSlackText(sections.join('\n\n'));
      }
    }

    // Fallback: use text field for non-bot messages or if blocks are empty
    return this.cleanSlackText(msg.text || '');
  }

  /**
   * Clean Slack-specific formatting from text
   */
  private cleanSlackText(text: string): string {
    return (
      text
        // Remove user mentions but keep the mention context
        .replace(/<@([A-Z0-9]+)>/g, '@user')
        // Remove channel mentions
        .replace(/<#([A-Z0-9]+)\|([^>]+)>/g, '#$2')
        // Remove links but keep text
        .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '$2')
        .replace(/<(https?:\/\/[^>]+)>/g, '$1')
        // Clean up extra whitespace
        .trim()
    );
  }

  /**
   * Get cached thread if still valid
   */
  private getCachedThread(threadId: string): ConversationThread | null {
    const cached = this.cache.get(threadId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.thread;
    }
    return null;
  }

  /**
   * Cache thread data
   */
  private cacheThread(threadId: string, thread: ConversationThread) {
    this.cache.set(threadId, {
      thread,
      timestamp: Date.now(),
    });

    // Clean old cache entries (simple LRU approach)
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  /**
   * Create empty thread for error cases
   */
  private createEmptyThread(threadId: string): ConversationThread {
    return {
      threadId,
      platform: 'slack',
      messages: [],
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}
