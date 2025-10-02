import { Test, TestingModule } from '@nestjs/testing';
import { IntelligentCompressionService } from '../../src/services/intelligent-compression.service';
import { ConversationThread, ConversationMessage } from '../../src/conversation/conversation-history.interface';

describe('IntelligentCompressionService', () => {
  let service: IntelligentCompressionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntelligentCompressionService],
    }).compile();

    service = module.get<IntelligentCompressionService>(IntelligentCompressionService);
  });

  describe('compressConversationHistory', () => {
    it('should handle empty conversation', async () => {
      const thread: ConversationThread = {
        threadId: 'test-thread',
        platform: 'cli',
        messages: [],
      };

      const result = await service.compressConversationHistory(thread);

      expect(result).toBe('');
    });

    it('should preserve recent messages', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          userId: 'user1',
          text: 'Old message',
          timestamp: new Date('2023-01-01'),
          isAssistant: false,
        },
        {
          id: '2',
          userId: 'assistant',
          text: 'Recent response',
          timestamp: new Date('2023-01-02'),
          isAssistant: true,
        },
      ];

      const thread: ConversationThread = {
        threadId: 'test-thread',
        platform: 'cli',
        messages,
      };

      const result = await service.compressConversationHistory(thread, {
        preserveRecentCount: 1,
      });

      expect(result).toContain('Recent response');
    });

    it('should identify important messages with code blocks', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          userId: 'user1',
          text: 'Here is some code: ```javascript\nconsole.log("hello");\n```',
          timestamp: new Date('2023-01-01'),
          isAssistant: false,
        },
        {
          id: '2',
          userId: 'user1',
          text: 'Simple message',
          timestamp: new Date('2023-01-02'),
          isAssistant: false,
        },
      ];

      const thread: ConversationThread = {
        threadId: 'test-thread',
        platform: 'cli',
        messages,
      };

      const result = await service.compressConversationHistory(thread, {
        preserveImportant: true,
        preserveRecentCount: 0,
      });

      expect(result).toContain('console.log');
    });

    it('should identify important messages with error keywords', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          userId: 'user1',
          text: 'There is an error in the code that needs to be fixed',
          timestamp: new Date('2023-01-01'),
          isAssistant: false,
        },
        {
          id: '2',
          userId: 'user1',
          text: 'Just a simple message',
          timestamp: new Date('2023-01-02'),
          isAssistant: false,
        },
      ];

      const thread: ConversationThread = {
        threadId: 'test-thread',
        platform: 'cli',
        messages,
      };

      const result = await service.compressConversationHistory(thread, {
        preserveImportant: true,
        preserveRecentCount: 0,
      });

      expect(result).toContain('error in the code');
    });

    it('should respect token limits', async () => {
      const longMessage = 'x'.repeat(1000);
      const messages: ConversationMessage[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        userId: 'user1',
        text: longMessage,
        timestamp: new Date(`2023-01-${i + 1}`),
        isAssistant: false,
      }));

      const thread: ConversationThread = {
        threadId: 'test-thread',
        platform: 'cli',
        messages,
      };

      const result = await service.compressConversationHistory(thread, {
        maxTokens: 500, // Small token limit
      });

      // Result should be shorter than original
      const originalLength = messages.reduce((sum, msg) => sum + msg.text.length, 0);
      expect(result.length).toBeLessThan(originalLength);
    });

    it('should generate context summary', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          userId: 'user1',
          text: 'I need help with implementation of a new feature',
          timestamp: new Date('2023-01-01'),
          isAssistant: false,
        },
        {
          id: '2',
          userId: 'assistant',
          text: 'Let me help you with the implementation',
          timestamp: new Date('2023-01-02'),
          isAssistant: true,
        },
      ];

      const thread: ConversationThread = {
        threadId: 'test-thread',
        platform: 'cli',
        messages,
      };

      const result = await service.compressConversationHistory(thread, {
        preserveRecentCount: 0, // Force compression
      });

      expect(result).toContain('implementation');
    });
  });
});