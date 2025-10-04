import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ParallelProcessingService } from '../src/services/parallel-processing.service';
import { AIService } from '../src/ai.service';
import { TaskManagementService } from '../src/services/task-management.service';
import { ConfigService } from '../src/services/config.service';

// ============================================
// Test Configuration - Global Agent & Model Settings
// ============================================
// Adjust these agents and models based on your testing needs and budget
// Using claude:haiku by default to minimize costs during parallel testing
// Format: 'agent:model' or just 'agent' (will use default model)

const AGENT1 = 'claude:haiku';
const AGENT2 = 'claude:haiku';
const AGENT3 = 'claude:haiku';

// Simple test questions to minimize token usage
const SIMPLE_QUESTION = 'What is 1+1?';
const SIMPLE_QUESTION_ALT = 'Say hello';
const SIMPLE_QUESTION_SHORT = 'Hi';

// Helper function to parse agent:model format
function parseAgent(agentWithModel: string): { agentId: string; model?: string } {
  const parts = agentWithModel.split(':');
  return {
    agentId: parts[0],
    model: parts[1]
  };
}

const PARSED_AGENT1 = parseAgent(AGENT1);
const PARSED_AGENT2 = parseAgent(AGENT2);
const PARSED_AGENT3 = parseAgent(AGENT3);

// Test interfaces based on the actual service
interface AgentExecutionResult {
  agentId: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
  taskId?: string;
}

interface ParallelProcessingRequest {
  agentId: string;
  query?: string;
  task?: string;
  context?: string;
  projectPath?: string;
}

interface ParallelProcessingConfig {
  maxConcurrency?: number;
  timeout?: number;
  failFast?: boolean;
}

/**
 * Group Mention Parsing Utilities
 * These functions replicate the actual parsing logic from CLI handlers
 */
class GroupMentionParser {
  static readonly MENTION_REGEX = /@([a-zA-Z_][a-zA-Z0-9_]*)(?::([a-zA-Z0-9._-]+))?/g;

  /**
   * Parse group mentions from a command string (like CLI handlers do)
   * Returns separate tasks for each agent mention
   */
  static parseGroupMentions(commandString: string): Array<{
    agentId: string;
    task: string;
    model?: string;
  }> {
    const results: Array<{ agentId: string; task: string; model?: string }> = [];
    const matches = [...commandString.matchAll(this.MENTION_REGEX)];
    
    if (matches.length === 0) {
      return results;
    }

    // Remove all @mentions to get the actual task text
    const task = commandString.replace(this.MENTION_REGEX, '').trim();
    
    if (!task) {
      return results;
    }

    // Create a separate task for each agent mention
    for (const match of matches) {
      const agentId = match[1];
      const model = match[2];
      if (agentId) {
        results.push({ agentId, task, model });
      }
    }

    return results;
  }

  /**
   * Test if a string has group mentions (multiple @mentions)
   */
  static hasGroupMentions(commandString: string): boolean {
    const matches = [...commandString.matchAll(this.MENTION_REGEX)];
    return matches.length > 1;
  }

  /**
   * Extract all agent IDs from mentions
   */
  static extractAgentIds(commandString: string): string[] {
    const matches = [...commandString.matchAll(this.MENTION_REGEX)];
    return matches.map(match => match[1]).filter(Boolean);
  }
}

describe('Parallel Processing with Group Mentions - Comprehensive Test Suite', () => {
  let service: ParallelProcessingService;
  let mockAIService: Partial<AIService>;
  let mockTaskManagementService: Partial<TaskManagementService>;
  let mockConfigService: Partial<ConfigService>;

  // Mock agent configurations
  const mockAgentConfigs = {
    claude: { inline: { provider: 'claude' } },
    gemini: { inline: { provider: 'gemini' } },
    copilot: { inline: { provider: 'copilot' } },
    backend: { 
      inline: { provider: 'claude' },
      options: {
        query: ['--add-dir=.', '--verbose'],
        execute: ['--add-dir=.', '--allowedTools=Edit,Bash']
      }
    },
    frontend: { 
      inline: { provider: 'gemini' },
      options: {
        query: ['--include-directories=.'],
        execute: ['--include-directories=.', '--yolo']
      }
    }
  };

  beforeEach(async () => {
    // Mock AIService
    mockAIService = {
      queryAI: vi.fn(),
      executeAI: vi.fn(),
    };

    // Mock TaskManagementService
    mockTaskManagementService = {
      createTask: vi.fn().mockImplementation(() => `task-${Date.now()}-${Math.random()}`),
      addTaskLog: vi.fn(),
      completeTask: vi.fn(),
    };

    // Mock ConfigService
    mockConfigService = {
      getAgentConfig: vi.fn().mockImplementation((agentId: string) => mockAgentConfigs[agentId as keyof typeof mockAgentConfigs] || null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParallelProcessingService,
        { provide: AIService, useValue: mockAIService },
        { provide: TaskManagementService, useValue: mockTaskManagementService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ParallelProcessingService>(ParallelProcessingService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Group Mention Parsing Tests', () => {
    describe('Basic Group Mention Parsing', () => {
      it('should parse multiple agents in single command', () => {
        const command = `@${AGENT1} @${AGENT2} @${AGENT3} ${SIMPLE_QUESTION}`;
        const parsed = GroupMentionParser.parseGroupMentions(command);
        
        expect(parsed).toHaveLength(3);
        expect(parsed[0]).toEqual({ agentId: AGENT1, task: SIMPLE_QUESTION });
        expect(parsed[1]).toEqual({ agentId: AGENT2, task: SIMPLE_QUESTION });
        expect(parsed[2]).toEqual({ agentId: AGENT3, task: SIMPLE_QUESTION });
      });

      it('should parse agents with model specifications', () => {
        const command = `@${AGENT1} @${AGENT2} ${SIMPLE_QUESTION_ALT}`;
        const parsed = GroupMentionParser.parseGroupMentions(command);
        
        expect(parsed).toHaveLength(2);
        expect(parsed[0]).toEqual({ agentId: PARSED_AGENT1.agentId, task: SIMPLE_QUESTION_ALT, model: PARSED_AGENT1.model });
        expect(parsed[1]).toEqual({ agentId: PARSED_AGENT2.agentId, task: SIMPLE_QUESTION_ALT, model: PARSED_AGENT2.model });
      });

      it('should handle mixed agents (with and without models)', () => {
        const command = `@backend @frontend:custom @${AGENT1} ${SIMPLE_QUESTION_SHORT}`;
        const parsed = GroupMentionParser.parseGroupMentions(command);
        
        expect(parsed).toHaveLength(3);
        expect(parsed[0]).toEqual({ agentId: 'backend', task: SIMPLE_QUESTION_SHORT });
        expect(parsed[1]).toEqual({ agentId: 'frontend', task: SIMPLE_QUESTION_SHORT, model: 'custom' });
        expect(parsed[2]).toEqual({ agentId: PARSED_AGENT1.agentId, task: SIMPLE_QUESTION_SHORT, model: PARSED_AGENT1.model });
      });
    });

    describe('Edge Cases in Mention Parsing', () => {
      it('should handle empty mentions', () => {
        const command = `@ @${AGENT1} ${SIMPLE_QUESTION_SHORT}`;
        const parsed = GroupMentionParser.parseGroupMentions(command);
        
        expect(parsed).toHaveLength(1);
        expect(parsed[0].agentId).toBe(AGENT1);
      });

      it('should handle malformed mentions', () => {
        const command = `@123invalid @${AGENT1} @-invalid ${SIMPLE_QUESTION}`;
        const parsed = GroupMentionParser.parseGroupMentions(command);
        
        // Only valid agent names should be parsed
        expect(parsed).toHaveLength(1);
        expect(parsed[0].agentId).toBe(AGENT1);
      });

      it('should handle special characters in task text', () => {
        const command = `@${AGENT1} @${AGENT2} ${SIMPLE_QUESTION}`;
        const parsed = GroupMentionParser.parseGroupMentions(command);
        
        expect(parsed).toHaveLength(2);
        expect(parsed[0].task).toBe(SIMPLE_QUESTION);
        expect(parsed[1].task).toBe(SIMPLE_QUESTION);
      });

      it('should return empty array for commands without mentions', () => {
        const command = 'no mentions here';
        const parsed = GroupMentionParser.parseGroupMentions(command);
        
        expect(parsed).toHaveLength(0);
      });

      it('should return empty array for mentions without task text', () => {
        const command = `@${AGENT1} @${AGENT2}`;
        const parsed = GroupMentionParser.parseGroupMentions(command);
        
        expect(parsed).toHaveLength(0);
      });
    });

    describe('Group Mention Detection', () => {
      it('should detect group mentions correctly', () => {
        expect(GroupMentionParser.hasGroupMentions(`@${AGENT1} @${AGENT2} test`)).toBe(true);
        expect(GroupMentionParser.hasGroupMentions(`@${AGENT1} test`)).toBe(false);
        expect(GroupMentionParser.hasGroupMentions('no mentions')).toBe(false);
      });

      it('should extract agent IDs correctly', () => {
        const agentIds = GroupMentionParser.extractAgentIds(`@${AGENT1} @${AGENT2} @backend test`);
        expect(agentIds).toEqual([PARSED_AGENT1.agentId, PARSED_AGENT2.agentId, 'backend']);
      });
    });
  });

  describe('2. ParallelProcessingService Integration Tests', () => {
    describe('executeParallel method', () => {
      it('should execute multiple requests in parallel successfully', async () => {
        // Mock successful AI responses
        const mockResponse = { success: true, content: 'Response', provider: 'claude' };
        (mockAIService.queryAI as any).mockResolvedValue(mockResponse);

        const requests: ParallelProcessingRequest[] = [
          { agentId: 'claude', query: 'task 1' },
          { agentId: 'gemini', query: 'task 2' },
        ];

        const result = await service.executeParallel(requests);

        expect(result.summary.total).toBe(2);
        expect(result.summary.successful).toBe(2);
        expect(result.summary.failed).toBe(0);
        expect(result.results).toHaveLength(2);
      });

      it('should handle mixed success and failure', async () => {
        // Mock responses - one success, one failure
        (mockAIService.queryAI as any)
          .mockResolvedValueOnce({ success: true, content: 'Success', provider: 'claude' })
          .mockResolvedValueOnce({ success: false, error: 'Failed', provider: 'gemini' });

        const requests: ParallelProcessingRequest[] = [
          { agentId: 'claude', query: 'task 1' },
          { agentId: 'gemini', query: 'task 2' },
        ];

        const result = await service.executeParallel(requests);

        expect(result.summary.total).toBe(2);
        expect(result.summary.successful).toBe(1);
        expect(result.summary.failed).toBe(1);
      });

      it('should respect maxConcurrency configuration', async () => {
        const mockResponse = { success: true, content: 'Response', provider: 'claude' };
        (mockAIService.queryAI as any).mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
        );

        const requests: ParallelProcessingRequest[] = [
          { agentId: 'claude', query: 'task 1' },
          { agentId: 'gemini', query: 'task 2' },
          { agentId: 'copilot', query: 'task 3' },
          { agentId: 'backend', query: 'task 4' },
          { agentId: 'frontend', query: 'task 5' },
        ];

        const config: ParallelProcessingConfig = { maxConcurrency: 2 };

        const startTime = performance.now();
        const result = await service.executeParallel(requests, config);
        const endTime = performance.now();

        expect(result.summary.total).toBe(5);
        expect(result.summary.successful).toBe(5);
        
        // With concurrency of 2, execution should take at least 3 batches (100ms each)
        expect(endTime - startTime).toBeGreaterThan(250);
      });
    });

    describe('queryAgentsParallel method', () => {
      it('should execute parallel queries', async () => {
        const mockResponse = { success: true, content: 'Query response', provider: 'claude' };
        (mockAIService.queryAI as any).mockResolvedValue(mockResponse);

        const queries = [
          { agentId: 'claude', query: 'What is TypeScript?' },
          { agentId: 'gemini', query: 'Explain async/await' },
        ];

        const result = await service.queryAgentsParallel(queries);

        expect(result.summary.total).toBe(2);
        expect(result.summary.successful).toBe(2);
        expect(mockAIService.queryAI).toHaveBeenCalledTimes(2);
      });

      it('should handle query with context', async () => {
        const mockResponse = { success: true, content: 'Response with context', provider: 'claude' };
        (mockAIService.queryAI as any).mockResolvedValue(mockResponse);

        const queries = [
          { 
            agentId: 'claude', 
            query: 'Analyze this', 
            context: 'Previous context information',
            projectPath: '/test/path'
          },
        ];

        await service.queryAgentsParallel(queries);

        expect(mockAIService.queryAI).toHaveBeenCalledWith(
          'Context: Previous context information\n\nQuery: Analyze this',
          'claude',
          expect.objectContaining({
            workingDirectory: '/test/path',
            taskId: expect.any(String)
          })
        );
      });
    });

    describe('executeAgentsParallel method', () => {
      it('should execute parallel tasks', async () => {
        const mockResponse = { success: true, content: 'Task completed', provider: 'claude' };
        (mockAIService.executeAI as any).mockResolvedValue(mockResponse);

        const tasks = [
          { agentId: 'backend', task: 'Create API endpoint' },
          { agentId: 'frontend', task: 'Create UI component' },
        ];

        const result = await service.executeAgentsParallel(tasks);

        expect(result.summary.total).toBe(2);
        expect(result.summary.successful).toBe(2);
        expect(mockAIService.executeAI).toHaveBeenCalledTimes(2);
      });

      it('should use agent-specific options', async () => {
        const mockResponse = { success: true, content: 'Task completed', provider: 'claude' };
        (mockAIService.executeAI as any).mockResolvedValue(mockResponse);

        const tasks = [
          { agentId: 'backend', task: 'Implement feature' },
        ];

        await service.executeAgentsParallel(tasks);

        expect(mockAIService.executeAI).toHaveBeenCalledWith(
          'Implement feature',
          'claude',
          expect.objectContaining({
            additionalArgs: ['--add-dir=.', '--allowedTools=Edit,Bash']
          })
        );
      });
    });
  });

  describe('3. Error Handling and Recovery Tests', () => {
    describe('Timeout Handling', () => {
      it('should handle individual request timeout', async () => {
        // Mock a slow response that exceeds timeout
        (mockAIService.queryAI as any).mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({ success: true }), 2000))
        );

        const requests: ParallelProcessingRequest[] = [
          { agentId: 'claude', query: 'slow task' },
        ];

        const config: ParallelProcessingConfig = { timeout: 100 };

        const result = await service.executeParallel(requests, config);

        expect(result.summary.total).toBe(1);
        expect(result.summary.successful).toBe(0);
        expect(result.summary.failed).toBe(1);
        expect(result.results[0].error).toContain('Timeout after 100ms');
      });

      it('should handle mixed timeout and success', async () => {
        (mockAIService.queryAI as any)
          .mockImplementationOnce(() => 
            Promise.resolve({ success: true, content: 'Fast response', provider: 'claude' })
          )
          .mockImplementationOnce(() => 
            new Promise(resolve => setTimeout(() => resolve({ success: true }), 2000))
          );

        const requests: ParallelProcessingRequest[] = [
          { agentId: 'claude', query: 'fast task' },
          { agentId: 'gemini', query: 'slow task' },
        ];

        const config: ParallelProcessingConfig = { timeout: 100 };

        const result = await service.executeParallel(requests, config);

        expect(result.summary.total).toBe(2);
        expect(result.summary.successful).toBe(1);
        expect(result.summary.failed).toBe(1);
      });
    });

    describe('Fail-Fast Behavior', () => {
      it('should stop execution on first failure with failFast=true', async () => {
        (mockAIService.queryAI as any)
          .mockResolvedValueOnce({ success: false, error: 'First failure', provider: 'claude' })
          .mockResolvedValueOnce({ success: true, content: 'Should not execute', provider: 'gemini' });

        const requests: ParallelProcessingRequest[] = [
          { agentId: 'claude', query: 'task 1' },
          { agentId: 'gemini', query: 'task 2' },
        ];

        const config: ParallelProcessingConfig = { 
          failFast: true,
          maxConcurrency: 1 // Ensure sequential execution to test fail-fast
        };

        const result = await service.executeParallel(requests, config);

        expect(result.summary.total).toBe(1); // Only first task executed
        expect(result.summary.successful).toBe(0);
        expect(result.summary.failed).toBe(1);
        expect(mockAIService.queryAI).toHaveBeenCalledTimes(1);
      });

      it('should continue execution with failFast=false', async () => {
        (mockAIService.queryAI as any)
          .mockResolvedValueOnce({ success: false, error: 'First failure', provider: 'claude' })
          .mockResolvedValueOnce({ success: true, content: 'Second success', provider: 'gemini' });

        const requests: ParallelProcessingRequest[] = [
          { agentId: 'claude', query: 'task 1' },
          { agentId: 'gemini', query: 'task 2' },
        ];

        const config: ParallelProcessingConfig = { failFast: false };

        const result = await service.executeParallel(requests, config);

        expect(result.summary.total).toBe(2);
        expect(result.summary.successful).toBe(1);
        expect(result.summary.failed).toBe(1);
        expect(mockAIService.queryAI).toHaveBeenCalledTimes(2);
      });
    });

    describe('Agent Configuration Errors', () => {
      it('should handle missing agent configuration', async () => {
        const mockResponse = { success: true, content: 'Response', provider: 'claude' };
        (mockAIService.queryAI as any).mockResolvedValue(mockResponse);

        const requests: ParallelProcessingRequest[] = [
          { agentId: 'nonexistent_agent', query: 'test task' },
        ];

        const result = await service.executeParallel(requests);

        expect(result.summary.total).toBe(1);
        expect(result.summary.successful).toBe(1); // Should default to claude
        expect(mockAIService.queryAI).toHaveBeenCalledWith(
          'test task',
          'claude', // Should default to claude
          expect.any(Object)
        );
      });
    });

    describe('Promise Rejection Handling', () => {
      it('should handle rejected promises gracefully', async () => {
        (mockAIService.queryAI as any)
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ success: true, content: 'Success', provider: 'gemini' });

        const requests: ParallelProcessingRequest[] = [
          { agentId: 'claude', query: 'task 1' },
          { agentId: 'gemini', query: 'task 2' },
        ];

        const result = await service.executeParallel(requests);

        expect(result.summary.total).toBe(2);
        expect(result.summary.successful).toBe(1);
        expect(result.summary.failed).toBe(1);
        expect(result.results[0].error).toBe('Network error');
      });
    });
  });

  describe('4. Performance and Metrics Tests', () => {
    describe('Performance Benefits', () => {
      it('should provide performance benefits over sequential execution', async () => {
        const delay = 100;
        const mockResponse = { success: true, content: 'Response', provider: 'claude' };
        (mockAIService.queryAI as any).mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(mockResponse), delay))
        );

        const requests: ParallelProcessingRequest[] = [
          { agentId: 'claude', query: 'task 1' },
          { agentId: 'gemini', query: 'task 2' },
          { agentId: 'copilot', query: 'task 3' },
        ];

        const startTime = performance.now();
        const result = await service.executeParallel(requests);
        const endTime = performance.now();

        const actualDuration = endTime - startTime;
        const sequentialDuration = delay * requests.length;

        // Parallel execution should be significantly faster than sequential
        expect(actualDuration).toBeLessThan(sequentialDuration * 0.7);
        expect(result.summary.totalDuration).toBeDefined();
        expect(result.summary.averageDuration).toBeDefined();
      });
    });

    describe('Metrics Calculation', () => {
      it('should calculate performance metrics correctly', async () => {
        const mockResponse = { success: true, content: 'Response', provider: 'claude' };
        (mockAIService.queryAI as any).mockResolvedValue(mockResponse);

        const requests: ParallelProcessingRequest[] = [
          { agentId: 'claude', query: 'task 1' },
          { agentId: 'gemini', query: 'task 2' },
        ];

        const result = await service.executeParallel(requests);

        expect(result.summary.total).toBe(2);
        expect(result.summary.successful).toBe(2);
        expect(result.summary.failed).toBe(0);
        expect(result.summary.totalDuration).toBeGreaterThan(0);
        expect(result.summary.averageDuration).toBeGreaterThan(0);

        // Test the performance metrics method
        const metrics = service.getPerformanceMetrics(result.results);
        expect(metrics.totalAgents).toBe(2);
        expect(metrics.successRate).toBe(100);
        expect(metrics.averageExecutionTime).toBeGreaterThan(0);
        expect(metrics.successfulAgents).toHaveLength(2);
        expect(metrics.failedAgents).toHaveLength(0);
      });

      it('should handle empty results in metrics', () => {
        const metrics = service.getPerformanceMetrics([]);
        
        expect(metrics.totalAgents).toBe(0);
        expect(metrics.successRate).toBe(0);
        expect(metrics.averageExecutionTime).toBe(0);
        expect(metrics.fastestExecution).toBe(0);
        expect(metrics.slowestExecution).toBe(0);
      });
    });
  });

  describe('5. Real-World Scenario Tests', () => {
    describe('Typical Group Mention Commands', () => {
      it(`should handle "@${AGENT1} @${AGENT2} @${AGENT3} ${SIMPLE_QUESTION}"`, async () => {
        const mockResponse = { success: true, content: '2', provider: AGENT1 };
        (mockAIService.queryAI as any).mockResolvedValue(mockResponse);

        const command = `@${AGENT1} @${AGENT2} @${AGENT3} ${SIMPLE_QUESTION}`;
        const parsed = GroupMentionParser.parseGroupMentions(command);
        
        const requests: ParallelProcessingRequest[] = parsed.map(p => ({
          agentId: p.agentId,
          query: p.task,
        }));

        const result = await service.executeParallel(requests);

        expect(result.summary.total).toBe(3);
        expect(result.summary.successful).toBe(3);
        expect(mockAIService.queryAI).toHaveBeenCalledTimes(3);
      });

      it('should handle "@backend @frontend simple task"', async () => {
        const mockResponse = { success: true, content: 'Done', provider: 'claude' };
        (mockAIService.executeAI as any).mockResolvedValue(mockResponse);

        const command = `@backend @frontend ${SIMPLE_QUESTION_ALT}`;
        const parsed = GroupMentionParser.parseGroupMentions(command);
        
        const requests: ParallelProcessingRequest[] = parsed.map(p => ({
          agentId: p.agentId,
          task: p.task,
        }));

        const result = await service.executeParallel(requests);

        expect(result.summary.total).toBe(2);
        expect(result.summary.successful).toBe(2);
        expect(mockAIService.executeAI).toHaveBeenCalledTimes(2);
      });
    });

    describe('Complex Mixed Scenarios', () => {
      it('should handle different task types and models', async () => {
        const mockQueryResponse = { success: true, content: 'Query result', provider: 'claude' };
        const mockExecuteResponse = { success: true, content: 'Task executed', provider: 'gemini' };

        (mockAIService.queryAI as any).mockResolvedValue(mockQueryResponse);
        (mockAIService.executeAI as any).mockResolvedValue(mockExecuteResponse);

        const requests: ParallelProcessingRequest[] = [
          { agentId: 'claude', query: 'analyze code' },
          { agentId: 'gemini', task: 'implement feature' },
          { agentId: 'backend', query: 'review architecture' },
        ];

        const result = await service.executeParallel(requests);

        expect(result.summary.total).toBe(3);
        expect(result.summary.successful).toBe(3);
        expect(mockAIService.queryAI).toHaveBeenCalledTimes(2); // claude and backend
        expect(mockAIService.executeAI).toHaveBeenCalledTimes(1); // gemini
      });
    });

    describe('Stress Testing', () => {
      it('should handle large number of parallel requests', async () => {
        const mockResponse = { success: true, content: 'Response', provider: 'claude' };
        (mockAIService.queryAI as any).mockResolvedValue(mockResponse);

        const requests: ParallelProcessingRequest[] = Array.from({ length: 20 }, (_, i) => ({
          agentId: `agent${i % 3 === 0 ? 'claude' : i % 3 === 1 ? 'gemini' : 'copilot'}`,
          query: `task ${i}`,
        }));

        const config: ParallelProcessingConfig = { 
          maxConcurrency: 5,
          timeout: 5000
        };

        const result = await service.executeParallel(requests, config);

        expect(result.summary.total).toBe(20);
        expect(result.summary.successful).toBe(20);
        expect(result.summary.failed).toBe(0);
      }, 10000); // Increased timeout for stress test
    });
  });

  describe('6. Regression Tests for Common Bugs', () => {
    describe('Task ID Propagation', () => {
      it('should propagate taskId through all service calls', async () => {
        const mockResponse = { success: true, content: 'Response', provider: 'claude' };
        (mockAIService.queryAI as any).mockResolvedValue(mockResponse);

        const requests: ParallelProcessingRequest[] = [
          { agentId: 'claude', query: 'test task' },
        ];

        const result = await service.executeParallel(requests);

        expect(mockTaskManagementService.createTask).toHaveBeenCalledTimes(1);
        expect(mockTaskManagementService.addTaskLog).toHaveBeenCalledWith(
          expect.any(String), // taskId
          expect.objectContaining({
            level: 'info',
            message: expect.stringContaining('Starting query operation')
          })
        );
        expect(mockTaskManagementService.completeTask).toHaveBeenCalledTimes(1);
        expect(result.results[0].taskId).toBeDefined();
      });
    });

    describe('Agent Provider Resolution', () => {
      it('should resolve direct provider names correctly', async () => {
        const mockResponse = { success: true, content: 'Response' };
        (mockAIService.queryAI as any).mockResolvedValue({ ...mockResponse, provider: 'claude' });

        const requests: ParallelProcessingRequest[] = [
          { agentId: 'claude', query: 'test' },
        ];

        await service.executeParallel(requests);

        expect(mockAIService.queryAI).toHaveBeenCalledWith(
          'test',
          'claude',
          expect.any(Object)
        );
      });

      it('should resolve custom agent providers correctly', async () => {
        const mockResponse = { success: true, content: 'Response' };
        (mockAIService.queryAI as any).mockResolvedValue({ ...mockResponse, provider: 'claude' });

        const requests: ParallelProcessingRequest[] = [
          { agentId: 'backend', query: 'test' }, // backend uses claude
        ];

        await service.executeParallel(requests);

        expect(mockAIService.queryAI).toHaveBeenCalledWith(
          'test',
          'claude',
          expect.any(Object)
        );
      });
    });

    describe('Context Handling', () => {
      it('should properly format context with query', async () => {
        const mockResponse = { success: true, content: 'Response', provider: 'claude' };
        (mockAIService.queryAI as any).mockResolvedValue(mockResponse);

        const requests: ParallelProcessingRequest[] = [
          { 
            agentId: 'claude', 
            query: 'analyze this', 
            context: 'Previous context info',
          },
        ];

        await service.executeParallel(requests);

        expect(mockAIService.queryAI).toHaveBeenCalledWith(
          'Context: Previous context info\n\nQuery: analyze this',
          'claude',
          expect.any(Object)
        );
      });

      it('should handle missing context gracefully', async () => {
        const mockResponse = { success: true, content: 'Response', provider: 'claude' };
        (mockAIService.queryAI as any).mockResolvedValue(mockResponse);

        const requests: ParallelProcessingRequest[] = [
          { agentId: 'claude', query: 'analyze this' },
        ];

        await service.executeParallel(requests);

        expect(mockAIService.queryAI).toHaveBeenCalledWith(
          'analyze this',
          'claude',
          expect.any(Object)
        );
      });
    });
  });
});