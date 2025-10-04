import { App, LogLevel } from '@slack/bolt';
import { Logger } from '@nestjs/common';
import { CodeCrewTool } from '../codecrew.tool';
import { SlackMessageFormatter } from './formatters/message.formatter';
import { SlackConversationHistoryProvider } from '../conversation/slack-conversation-history.provider';
import { ConfigService } from '../services/config.service';
import { AIProviderService } from '../ai-provider.service';

export class SlackBot {
  private readonly logger = new Logger(SlackBot.name);
  private app: App;
  private formatter: SlackMessageFormatter;
  private conversationHistory: SlackConversationHistoryProvider;
  private defaultAgent: string;

  constructor(
    private readonly codeCrewTool: CodeCrewTool,
    private readonly configService: ConfigService,
    private readonly aiProviderService: AIProviderService,
    defaultAgent: string = 'claude'
  ) {
    // Validate agent exists (check both built-in providers and custom agents)
    const builtinProviders = this.aiProviderService.getAvailableProviders();
    const customAgents = this.configService.getAllAgentIds();
    const allAvailableAgents = [...builtinProviders, ...customAgents];
    
    if (!allAvailableAgents.includes(defaultAgent)) {
      const errorMsg = `❌ Agent '${defaultAgent}' not found. Available agents: ${allAvailableAgents.join(', ')}`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    this.defaultAgent = defaultAgent;
    this.formatter = new SlackMessageFormatter();
    this.conversationHistory = new SlackConversationHistoryProvider();

    this.logger.log(`🤖 Slack bot initialized with default agent: ${this.defaultAgent}`);
    this.logger.log(`📋 Built-in providers: ${builtinProviders.join(', ')}`);
    this.logger.log(`📋 Custom agents: ${customAgents.join(', ')}`);

    this.app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      socketMode: true, // Works behind firewalls
      appToken: process.env.SLACK_APP_TOKEN,
      logLevel: LogLevel.INFO,
    });

    this.registerHandlers();
  }

  private registerHandlers() {
    // Log all messages for debugging
    this.app.event('message', async ({ event, logger }) => {
      this.logger.debug(`📨 Received message event: ${JSON.stringify(event).substring(0, 200)}`);
    });

    // Handle app mentions (when bot is @mentioned)
    this.app.event('app_mention', async ({ event, say, client }) => {
      this.logger.log(`📢 Bot mentioned by user ${event.user}`);
      await this.handleCommand({ message: event, say, client });
    });

    // Also handle direct messages to the bot
    this.app.message(async ({ message, say, client }) => {
      // Ignore bot messages and threaded replies to avoid loops
      if ((message as any).subtype || (message as any).bot_id) {
        return;
      }

      // Only respond if message contains bot mention or is a DM
      const text = (message as any).text || '';
      this.logger.debug(`💬 Message received: "${text.substring(0, 50)}..."`);

      // Skip if this is an app_mention event (already handled by app_mention handler)
      // App mentions include <@BOTID> in the text
      if (text.match(/<@[A-Z0-9]+>/)) {
        this.logger.debug(`⏭️  Skipping app_mention (handled by app_mention handler)`);
        return;
      }

      // Check if message mentions codecrew (case insensitive) or is a DM
      if (text.toLowerCase().includes('codecrew') || (message as any).channel_type === 'im') {
        this.logger.log(`🎯 Processing message from ${(message as any).user}`);
        await this.handleCommand({ message, say, client });
      }
    });

    // Handle button actions
    this.app.action('view_details', async ({ ack, body, client }) => {
      await this.handleViewDetails({ ack, body, client });
    });

    this.app.action('rerun', async ({ ack, body, client }) => {
      await this.handleRerun({ ack, body, client });
    });
  }

  private async handleCommand({ message, say, client }: any) {
    try {
      const messageText = (message as any).text || '';

      // Remove only bot mention from text (Slack format: <@U123456>)
      // Keep "codecrew" in the actual message content - it might be part of the question
      let userRequest = messageText
        .replace(/<@[A-Z0-9]+>/gi, '') // Remove Slack user mentions
        .trim();

      this.logger.log(`📝 Parsed request: "${userRequest.substring(0, 100)}..."`);

      if (!userRequest) {
        await say({
          text: '❌ Please provide a request. Example: `@codecrew analyze this code`',
          thread_ts: message.ts,
        });
        return;
      }

      this.logger.log(`🚀 Processing Slack request from user ${message.user}`);

      // Add "processing" reaction to original message (eyes = watching/processing)
      try {
        await client.reactions.add({
          channel: message.channel,
          timestamp: message.ts,
          name: 'eyes', // 👀 emoji
        });
      } catch (reactionError) {
        this.logger.warn(`Could not add reaction: ${reactionError}`);
      }

      try {
        // Initialize conversation history provider with Slack client
        this.conversationHistory.initialize(client);

        // Build context with thread history (clean, no internal metadata)
        let contextText = '';

        // Get thread timestamp (parent message or current message)
        const threadTs = message.thread_ts || message.ts;

        // If this is a reply in a thread, fetch conversation history
        if (message.thread_ts) {
          const threadId = `${message.channel}:${threadTs}`;

          try {
            const thread = await this.conversationHistory.fetchHistory(threadId, {
              limit: 20,
              maxContextLength: 4000,
              excludeCurrent: true,
            });

            if (thread.messages.length > 0) {
              const historyContext = await this.conversationHistory.formatForAI(thread, {
                excludeCurrent: true,
              });

              if (historyContext) {
                contextText = historyContext; // Use only clean history, no metadata
                this.logger.log(`📚 Including ${thread.messages.length} previous messages in context`);
              }
            }
          } catch (error: any) {
            this.logger.warn(`Failed to fetch thread history: ${error.message}`);
            // Continue without history if fetch fails
          }
        }

        // Use configured default agent with executeAgent for full capabilities
        // (executeAgent supports file modifications, queryAgent is read-only)
        const result = await this.codeCrewTool.executeAgent({
          agentId: this.defaultAgent,
          task: userRequest,
          context: contextText || undefined, // Only pass context if we have thread history
        });

        this.logger.log(`📦 Received result from CodeCrew MCP`);

        // Extract actual AI response from MCP result
        // Use 'implementation' field which contains only the AI's actual response (no metadata)
        // Fallback order: implementation > content[0].text (for compatibility)
        const responseText = (result as any).implementation || 
          (result.content && result.content[0] ? result.content[0].text : 'No response');

        const blocks = this.formatter.formatExecutionResult({
          agent: (result as any).agent || this.defaultAgent,
          provider: (result as any).provider || this.defaultAgent,
          taskId: (result as any).taskId || 'unknown',
          response: responseText,
          success: (result as any).success !== false,
          error: (result as any).error,
        });

        // Send result as thread reply
        await say({
          text: `✅ Completed! (@${(result as any).agent || this.defaultAgent})`,
          blocks: blocks,
          thread_ts: message.ts,
          metadata: {
            event_type: 'agent_response',
            event_payload: {
              agent_id: (result as any).agent || this.defaultAgent,
              provider: (result as any).provider || this.defaultAgent,
              task_id: (result as any).taskId || 'unknown',
            },
          },
        });

        // Remove "processing" reaction and add "completed" reaction
        try {
          await client.reactions.remove({
            channel: message.channel,
            timestamp: message.ts,
            name: 'eyes',
          });
          await client.reactions.add({
            channel: message.channel,
            timestamp: message.ts,
            name: 'white_check_mark', // ✅ emoji
          });
        } catch (reactionError) {
          this.logger.warn(`Could not update reaction: ${reactionError}`);
        }
      } catch (error: any) {
        this.logger.error(`Error executing request:`, error);
        
        // Send error message as thread reply
        await say({
          text: `❌ Error: ${error.message}`,
          thread_ts: message.ts,
        });

        // Remove "processing" reaction and add "error" reaction
        try {
          await client.reactions.remove({
            channel: message.channel,
            timestamp: message.ts,
            name: 'eyes',
          });
          await client.reactions.add({
            channel: message.channel,
            timestamp: message.ts,
            name: 'x', // ❌ emoji
          });
        } catch (reactionError) {
          this.logger.warn(`Could not update reaction: ${reactionError}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`Error handling command:`, error);
      await say({
        text: `❌ Internal error: ${error.message}`,
        thread_ts: (message as any).ts,
      });
    }
  }

  private async handleViewDetails({ ack, body, client }: any) {
    await ack();

    const taskId = body.actions[0].value;

    try {
      // Get task logs using CodeCrewTool
      const logsResult = await this.codeCrewTool.getTaskLogs({ taskId });

      const logText = logsResult.content && logsResult.content[0] ? logsResult.content[0].text : 'No logs available';

      await client.chat.postMessage({
        channel: body.channel.id,
        thread_ts: body.message.ts,
        text: `📋 Task Logs for ${taskId}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Task Logs: ${taskId}*`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `\`\`\`${logText.substring(0, 2000)}\`\`\``,
            },
          },
        ],
      });
    } catch (error: any) {
      this.logger.error(`Error fetching task logs:`, error);
      await client.chat.postMessage({
        channel: body.channel.id,
        thread_ts: body.message.ts,
        text: `❌ Error fetching logs: ${error.message}`,
      });
    }
  }

  private async handleRerun({ ack, body, client }: any) {
    await ack();

    await client.chat.postMessage({
      channel: body.channel.id,
      thread_ts: body.message.ts,
      text: '🔄 To rerun, please send a new @codecrew message with your request.',
    });
  }

  async start() {
    await this.app.start();
    this.logger.log('⚡️ CodeCrew Slack Bot is running!');
    this.logger.log(`📱 Socket Mode: Enabled`);
    this.logger.log(`🤖 Coordinator Agent: slack-coordinator`);
    this.logger.log(`👂 Listening for: app mentions, DMs, and "codecrew" keywords`);
    this.logger.log(`💡 Test with: @CodeCrew analyze this code`);
  }

  async stop() {
    await this.app.stop();
    this.logger.log('Slack Bot stopped');
  }
}
