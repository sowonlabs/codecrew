import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';

/**
 * Tool definition interface compatible with Mastra framework
 * Supports both input and output schema definitions
 */
export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  output_schema?: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Enhanced execution context for tools
 * Provides runtime information similar to Mastra's ToolExecutionContext
 */
export interface ToolExecutionContext {
  input: Record<string, any>;        // Tool input parameters
  runId?: string;                     // Execution run ID for tracking
  threadId?: string;                  // Conversation thread ID
  resourceId?: string;                // Resource/user identifier
  agentId?: string;                   // Agent making the call
  tracingContext?: {                  // Tracing/logging context
    taskId?: string;
    parentSpan?: string;
  };
}

/**
 * Standardized tool execution result
 * Follows Mastra's pattern of structured responses
 */
export interface ToolExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    executionTime?: number;
    toolName?: string;
    runId?: string;
  };
}

export interface ToolExecutor {
  execute(context: ToolExecutionContext): Promise<ToolExecutionResult>;
}

@Injectable()
export class ToolCallService {
  private readonly logger = new Logger('ToolCallService');
  private tools: Map<string, { definition: Tool; executor: ToolExecutor }> = new Map();

  constructor() {
    // Register built-in tools
    this.registerBuiltinTools();
  }

  /**
   * Register built-in tools like read_file
   */
  private registerBuiltinTools(): void {
    // Read file tool
    this.register(
      {
        name: 'read_file',
        description: 'Read the contents of a file from the filesystem',
        input_schema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path to the file to read',
            },
          },
          required: ['path'],
        },
        output_schema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The content of the file',
            },
          },
          required: ['content'],
        },
      },
      {
        execute: async (context: ToolExecutionContext): Promise<ToolExecutionResult> => {
          const startTime = Date.now();
          try {
            const { path } = context.input;
            if (!path || typeof path !== 'string') {
              return {
                success: false,
                error: 'Invalid input: path is required and must be a string',
                metadata: {
                  executionTime: Date.now() - startTime,
                  toolName: 'read_file',
                  runId: context.runId,
                },
              };
            }

            const content = readFileSync(path, 'utf-8');
            return {
              success: true,
              data: { content },
              metadata: {
                executionTime: Date.now() - startTime,
                toolName: 'read_file',
                runId: context.runId,
              },
            };
          } catch (error: any) {
            return {
              success: false,
              error: `Failed to read file: ${error.message}`,
              metadata: {
                executionTime: Date.now() - startTime,
                toolName: 'read_file',
                runId: context.runId,
              },
            };
          }
        },
      }
    );

    this.logger.log('Built-in tools registered: read_file');
  }

  /**
   * Register a new tool
   */
  register(definition: Tool, executor: ToolExecutor): void {
    this.tools.set(definition.name, { definition, executor });
    this.logger.log(`Tool registered: ${definition.name}`);
  }

  /**
   * Get list of all available tools
   */
  list(): Tool[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  /**
   * Execute a tool by name with enhanced context
   * @param name Tool name
   * @param input Tool input parameters
   * @param context Optional execution context (runId, threadId, etc.)
   */
  async execute(
    name: string,
    input: Record<string, any>,
    context?: Partial<Omit<ToolExecutionContext, 'input'>>
  ): Promise<ToolExecutionResult> {
    const tool = this.tools.get(name);

    if (!tool) {
      this.logger.error(`Tool not found: ${name}`);
      return {
        success: false,
        error: `Tool not found: ${name}`,
      };
    }

    const executionContext: ToolExecutionContext = {
      input,
      runId: context?.runId,
      threadId: context?.threadId,
      resourceId: context?.resourceId,
      agentId: context?.agentId,
      tracingContext: context?.tracingContext,
    };

    this.logger.log(`Executing tool: ${name} with input:`, JSON.stringify(input));

    try {
      const result = await tool.executor.execute(executionContext);
      this.logger.log(`Tool ${name} executed successfully`, {
        success: result.success,
        runId: executionContext.runId,
      });
      return result;
    } catch (error: any) {
      this.logger.error(`Tool ${name} execution failed:`, error.message);
      return {
        success: false,
        error: `Tool execution failed: ${error.message}`,
        metadata: {
          toolName: name,
          runId: executionContext.runId,
        },
      };
    }
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }
}
