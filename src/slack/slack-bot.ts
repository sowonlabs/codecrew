import { App, LogLevel } from '@slack/bolt';
import { Logger } from '@nestjs/common';
import { CodeCrewTool } from '../codecrew.tool';
import { SlackMessageFormatter } from './formatters/message.formatter';

export class SlackBot {
  private readonly logger = new Logger(SlackBot.name);
  private app: App;
  private formatter: SlackMessageFormatter;

  constructor(private readonly codeCrewTool: CodeCrewTool) {
    this.formatter = new SlackMessageFormatter();

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
      
      // Remove bot mention from text (Slack format: <@U123456>)
      let userRequest = messageText
        .replace(/<@[A-Z0-9]+>/gi, '') // Remove Slack user mentions
        .replace(/codecrew/gi, '')       // Remove codecrew text
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

      // Send loading message
      const loadingMsg = await say({
        text: '⏳ Processing your request...',
        thread_ts: message.ts,
      });

      try {
        // Use MCP Test Agent which has MCP tools enabled
        const result = await this.codeCrewTool.queryAgent({
          agentId: 'mcp_test_agent',
          query: userRequest,
          context: `Slack user: ${message.user}, Channel: ${message.channel}`,
        });

        this.logger.log(`📦 Received result from CodeCrew MCP`);

        // Extract text from MCP response format
        const responseText = result.content && result.content[0] 
          ? result.content[0].text 
          : 'No response';

        const blocks = this.formatter.formatExecutionResult({
          agent: 'claude',
          provider: 'claude',
          taskId: (result as any).taskId || 'unknown',
          response: responseText,
          success: true,
        });

        await client.chat.update({
          channel: message.channel,
          ts: loadingMsg.ts,
          text: '✅ Completed!',
          blocks: blocks,
        });
      } catch (error: any) {
        this.logger.error(`Error executing request:`, error);
        await client.chat.update({
          channel: message.channel,
          ts: loadingMsg.ts,
          text: `❌ Error: ${error.message}`,
        });
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
