import { Logger } from '@nestjs/common';
import { Command } from 'commander';
import { CodeCrewTool } from '../codecrew.tool';
import {
  CliConversationHistoryProvider,
  ConversationProviderFactory,
} from '../conversation';
import { CliOptions } from '../cli-options';
import * as readline from 'readline';
import * as os from 'os';

/**
 * Main CLI chat handler function
 */
export async function handleChat(app: any, args: CliOptions) {
  const logger = new Logger('ChatHandler');

  try {
    const codeCrewTool = app.get(CodeCrewTool);
    const providerFactory = new ConversationProviderFactory();
    const chatHandler = new ChatHandler(codeCrewTool, providerFactory);

    // Parse options from args
    const options: any = {};

    // Extract options from process.argv
    const argv = process.argv;
    let message = '';
    
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '--thread' || argv[i] === '-t') {
        options.thread = argv[i + 1];
      } else if (argv[i] === '--new' || argv[i] === '-n') {
        options.new = true;
      } else if (argv[i] === '--list' || argv[i] === '-l') {
        options.list = true;
      } else if (argv[i] === '--delete' || argv[i] === '-d') {
        options.delete = argv[i + 1];
      } else if (argv[i] === '--cleanup') {
        options.cleanup = argv[i + 1] || '30';
      } else if (argv[i] === '--message' || argv[i] === '-m') {
        message = argv[i + 1] || '';
      }
    }

    // If message is provided, handle single message mode
    if (message) {
      options.message = message;
    }

    await chatHandler.handleChatCommand(options);
  } catch (error: any) {
    logger.error(`Chat command failed: ${error.message}`);
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Interactive chat command handler
 * Maintains conversation history for contextual interactions
 */
export class ChatHandler {
  private readonly logger = new Logger(ChatHandler.name);
  private conversationProvider: CliConversationHistoryProvider;
  private currentThreadId?: string;

  constructor(
    private readonly codeCrewTool: CodeCrewTool,
    private readonly providerFactory: ConversationProviderFactory,
  ) {
    this.conversationProvider = this.providerFactory.getProvider(
      'cli',
    ) as CliConversationHistoryProvider;
  }

  /**
   * Handle chat command
   */
  async handleChatCommand(options: any): Promise<void> {
    try {
      // Initialize provider
      await this.conversationProvider.initialize();

      // Handle list threads
      if (options.list) {
        await this.listThreads();
        return;
      }

      // Handle delete thread
      if (options.delete) {
        await this.deleteThread(options.delete);
        return;
      }

      // Handle cleanup
      if (options.cleanup) {
        await this.cleanupThreads(parseInt(options.cleanup, 10));
        return;
      }

      // Determine thread ID
      if (options.thread) {
        const threadId = options.thread as string;
        const exists = await this.conversationProvider.hasHistory(threadId);
        if (!exists) {
          console.log(`⚠️  Thread '${threadId}' not found. Creating new thread.`);
          this.currentThreadId = await this.conversationProvider.createThread(threadId);
        } else {
          this.currentThreadId = threadId;
          console.log(`📖 Continuing conversation: ${this.currentThreadId}`);
        }
      } else {
        // Create new thread
        this.currentThreadId = await this.conversationProvider.createThread();
        console.log(`✨ New conversation started: ${this.currentThreadId}`);
      }

      // Handle single message mode or start interactive chat
      if (options.message) {
        await this.handleSingleMessage(options.message);
      } else {
        await this.startInteractiveChat();
      }
    } catch (error: any) {
      this.logger.error(`Chat error: ${error.message}`);
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Handle single message without interactive mode
   */
  private async handleSingleMessage(message: string): Promise<void> {
    try {
      if (!this.currentThreadId) {
        console.error('❌ No active conversation thread');
        return;
      }

      // Add user message to history
      await this.conversationProvider.addMessage(
        this.currentThreadId,
        os.userInfo().username,
        message,
        false,
      );

      // Fetch conversation history
      const thread = await this.conversationProvider.fetchHistory(
        this.currentThreadId,
        {
          limit: 20,
          maxContextLength: 4000,
        },
      );

      // Format history for AI
      const historyContext = await this.conversationProvider.formatForAI(thread, {
        excludeCurrent: true,
      });

      // Build context
      const context = historyContext
        ? `${historyContext}\n\nCurrent question: ${message}`
        : message;

      console.log('🤖 CodeCrew: ');

      // Query agent with history
      const result = await this.codeCrewTool.queryAgent({
        agentId: 'mcp_test_agent',
        query: message,
        context: `CLI chat session\nThread: ${this.currentThreadId}\nUser: ${os.userInfo().username}\n\n${context}`,
      });

      // Extract response
      const responseText =
        result.content && result.content[0]
          ? result.content[0].text
          : 'No response';

      console.log(responseText);

      // Add assistant response to history
      await this.conversationProvider.addMessage(
        this.currentThreadId,
        'codecrew',
        responseText,
        true,
      );

      console.log(`\n💾 Conversation saved to thread: ${this.currentThreadId}`);
    } catch (error: any) {
      this.logger.error(`Error processing single message: ${error.message}`);
      console.error(`❌ Error: ${error.message}`);
    }
  }

  /**
   * Start interactive chat session
   */
  private async startInteractiveChat(): Promise<void> {
    console.log('\n💬 Interactive Chat Mode');
    console.log('Type your message and press Enter. Type "exit" or "quit" to end.\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🧑 You: ',
    });

    rl.prompt();

    rl.on('line', async (input: string) => {
      const message = input.trim();

      // Check for exit commands
      if (message.toLowerCase() === 'exit' || message.toLowerCase() === 'quit') {
        console.log(`\n👋 Conversation saved as: ${this.currentThreadId}`);
        rl.close();
        process.exit(0);
      }

      if (!message) {
        rl.prompt();
        return;
      }

      try {
        if (!this.currentThreadId) {
          console.error('❌ No active conversation thread\n');
          rl.prompt();
          return;
        }

        // Add user message to history
        await this.conversationProvider.addMessage(
          this.currentThreadId,
          os.userInfo().username,
          message,
          false,
        );

        // Fetch conversation history
        const thread = await this.conversationProvider.fetchHistory(
          this.currentThreadId,
          {
            limit: 20,
            maxContextLength: 4000,
          },
        );

        // Format history for AI
        const historyContext = this.conversationProvider.formatForAI(thread, {
          excludeCurrent: true,
        });

        // Build context
        const context = historyContext
          ? `${historyContext}\n\nCurrent question: ${message}`
          : message;

        console.log('🤖 CodeCrew: ');

        // Query agent with history
        const result = await this.codeCrewTool.queryAgent({
          agentId: 'mcp_test_agent',
          query: message,
          context: `CLI chat session\nThread: ${this.currentThreadId}\nUser: ${os.userInfo().username}\n\n${context}`,
        });

        // Extract response
        const responseText =
          result.content && result.content[0]
            ? result.content[0].text
            : 'No response';

        console.log(responseText);
        console.log();

        // Add assistant response to history
        await this.conversationProvider.addMessage(
          this.currentThreadId,
          'codecrew',
          responseText,
          true,
        );
      } catch (error: any) {
        this.logger.error(`Error processing message: ${error.message}`);
        console.error(`❌ Error: ${error.message}\n`);
      }

      rl.prompt();
    });

    rl.on('close', () => {
      console.log(`\n👋 Conversation saved as: ${this.currentThreadId}`);
      process.exit(0);
    });
  }

  /**
   * List all conversation threads
   */
  private async listThreads(): Promise<void> {
    const threads = await this.conversationProvider.listThreads();

    if (threads.length === 0) {
      console.log('No conversation threads found.');
      return;
    }

    console.log('\n📚 Conversation Threads:\n');

    for (const threadId of threads) {
      const thread = await this.conversationProvider.fetchHistory(threadId);
      const messageCount = thread.messages.length;
      const lastMessage = thread.messages[messageCount - 1];
      const preview = lastMessage
        ? lastMessage.text.substring(0, 50) + '...'
        : 'Empty';

      console.log(`  ${threadId}`);
      console.log(`    Messages: ${messageCount}`);
      console.log(`    Last: ${preview}`);
      console.log();
    }
  }

  /**
   * Show conversation history
   */
  private async showHistory(threadId: string): Promise<void> {
    const thread = await this.conversationProvider.fetchHistory(threadId);

    if (thread.messages.length === 0) {
      console.log(`Thread '${threadId}' not found or empty.`);
      return;
    }

    console.log(`\n📖 Conversation History: ${threadId}\n`);

    for (const msg of thread.messages) {
      const role = msg.isAssistant ? '🤖 CodeCrew' : '🧑 User';
      console.log(`${role}: ${msg.text}`);
      console.log(`   (${msg.timestamp.toLocaleString()})\n`);
    }
  }

  /**
   * Delete a thread
   */
  private async deleteThread(threadId: string): Promise<void> {
    const exists = await this.conversationProvider.hasHistory(threadId);

    if (!exists) {
      console.log(`Thread '${threadId}' not found.`);
      return;
    }

    await this.conversationProvider.deleteThread(threadId);
    console.log(`✅ Thread '${threadId}' deleted.`);
  }

  /**
   * Cleanup old threads
   */
  private async cleanupThreads(days: number): Promise<void> {
    console.log(`🧹 Cleaning up threads older than ${days} days...`);
    const count = await this.conversationProvider.cleanupOldThreads(days);
    console.log(`✅ Deleted ${count} old threads.`);
  }
}
