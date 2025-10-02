import { Injectable } from '@nestjs/common';
import { BaseAIProvider } from './base-ai.provider';
import { AIQueryOptions, AIResponse } from './ai-provider.interface';
import { ToolCallService, Tool } from '../services/tool-call.service';

@Injectable()
export class GeminiProvider extends BaseAIProvider {
  readonly name = 'gemini' as const;

  constructor(private readonly toolCallService?: ToolCallService) {
    super('GeminiProvider');
  }

  protected getCliCommand(): string {
    return 'gemini';
  }

  protected getDefaultArgs(): string[] {
    return ['-o', 'json']; // query mode by default - removed '-p' flag
  }

  protected getExecuteArgs(): string[] {
    // Gemini does not actively use tools without --yolo, so it is included by default in Execute mode
    // If the user specifies other options in agents.yaml, they will take precedence
    return ['-o', 'json', '--yolo'];
  }

  protected getPromptInArgs(): boolean {
    return false; // Gemini uses stdin for prompts (safer for multi-line and special characters)
  }

  protected getNotInstalledMessage(): string {
    return 'Gemini CLI is not installed.';
  }

  private buildPromptWithTools(prompt: string, tools: Tool[]): string {
    if (!tools || tools.length === 0) {
      return prompt;
    }

    const toolDefinitions = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }));

    const toolsSection = `
The following tools are available to answer the user's question.
You have the ability to execute these tools and observe their output.

Tools:
${JSON.stringify(toolDefinitions, null, 2)}

Based on the user's request and the available tools, generate the response.
If you use a tool, the system will execute it and provide you with the result.

User's prompt: ${prompt}
`;
    return toolsSection;
  }

  async query(
    prompt: string,
    options: AIQueryOptions = {},
  ): Promise<AIResponse> {
    if (!this.toolCallService) {
      this.logger.warn(
        'ToolCallService not available, falling back to regular query',
      );
      return super.query(prompt, options);
    }

    const tools = this.toolCallService.list();
    const augmentedPrompt = this.buildPromptWithTools(prompt, tools);

    // Add --yolo to args for query mode if tools are available
    const queryOptions: AIQueryOptions = {
      ...options,
      additionalArgs: ['--yolo', ...(options.additionalArgs || [])],
    };

    const response = await super.query(augmentedPrompt, queryOptions);

    if (!response.success || !response.content) {
      return response;
    }

    try {
      const output = JSON.parse(response.content);

      if (output.stats?.tools && output.stats.tools.length > 0) {
        this.logger.log(`Gemini used ${output.stats.tools.length} tool(s)`);
        for (const toolCall of output.stats.tools) {
          this.logger.log(
            `- Tool: ${toolCall.name}, Input: ${JSON.stringify(
              toolCall.input,
            )}`,
          );
        }
      }

      // The final answer is in `output.response`
      return {
        ...response,
        content: output.response,
      };
    } catch (error) {
      this.logger.error(`Failed to parse Gemini JSON response: ${error}`);
      // If parsing fails, return the original content as-is
      return response;
    }
  }
}
