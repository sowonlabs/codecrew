import { Injectable } from '@nestjs/common';
import { BaseAIProvider } from './base-ai.provider';
import { AIQueryOptions, AIResponse } from './ai-provider.interface';
import { ToolCallService, Tool } from '../services/tool-call.service';

@Injectable()
export class GeminiProvider extends BaseAIProvider {
  readonly name = 'gemini' as const;

  constructor(toolCallService?: ToolCallService) {
    super('GeminiProvider');
    if (toolCallService) {
      this.setToolCallService(toolCallService);
    }
  }

  protected getCliCommand(): string {
    return 'gemini';
  }

  protected getDefaultArgs(): string[] {
    return []; // No output format, use default text output for XML parsing
  }

  protected getExecuteArgs(): string[] {
    // For execute mode with tool calls, use text output to parse XML tags
    // Do NOT use --yolo as we handle tools ourselves
    return [];
  }

  protected getPromptInArgs(): boolean {
    return false; // Use stdin for prompts to avoid command line length issues
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

    // Use multi-turn tool calling for query mode as well
    return this.queryWithTools(prompt, options);
  }

  /**
   * Override execute to use tool call support
   */
  async execute(prompt: string, options: AIQueryOptions = {}): Promise<AIResponse> {
    console.log(`🚀 DEBUG: GeminiProvider.execute() called`);
    console.log(`🔧 DEBUG: toolCallService available: ${!!this.toolCallService}`);
    
    if (this.toolCallService) {
      console.log('🔧 DEBUG: GeminiProvider: Using queryWithTools in execute mode');
      this.logger.log('🔧 GeminiProvider: Using queryWithTools in execute mode');
      return this.queryWithTools(prompt, options);
    }
    console.log('⚠️ DEBUG: GeminiProvider: ToolCallService not available, falling back to base execute');
    this.logger.warn('⚠️ GeminiProvider: ToolCallService not available, falling back to base execute');
    return super.execute(prompt, options);
  }

  /**
   * Parse Gemini's response to detect tool usage
   */
  private parseToolUse(content: string): { isToolUse: boolean; toolName?: string; toolInput?: any } {
    console.log(`🔍 DEBUG: parseToolUse input length: ${content.length}`);
    console.log(`🔍 DEBUG: parseToolUse input: ${JSON.stringify(content.substring(0, 300))}`);
    
    // First, try to extract from CodeCrew XML tags
    const xmlMatch = content.match(/<codecrew_tool_call>\s*([\s\S]*?)\s*<\/codecrew_tool_call>/);
    if (xmlMatch && xmlMatch[1]) {
      console.log(`🔍 DEBUG: Found CodeCrew XML tag`);
      try {
        const jsonContent = xmlMatch[1].trim();
        console.log(`🔍 DEBUG: XML content: ${JSON.stringify(jsonContent.substring(0, 200))}`);
        const parsed = JSON.parse(jsonContent);
        if (parsed.type === 'tool_use' && parsed.name && parsed.input) {
          console.log(`✅ DEBUG: Extracted tool_use from XML: ${parsed.name}`);
          this.logger.log(`Tool use detected: ${parsed.name} with input ${JSON.stringify(parsed.input)}`);
          return {
            isToolUse: true,
            toolName: parsed.name,
            toolInput: parsed.input,
          };
        }
      } catch (e) {
        console.log(`❌ DEBUG: Failed to parse XML JSON: ${e}`);
      }
    }
    
    // Second, try to parse as JSON (Gemini JSON output format)
    try {
      const parsed = JSON.parse(content);
      
      // Check if response field has XML tags
      if (parsed.response && typeof parsed.response === 'string') {
        const responseXml = parsed.response.match(/<codecrew_tool_call>\s*([\s\S]*?)\s*<\/codecrew_tool_call>/);
        if (responseXml && responseXml[1]) {
          console.log(`🔍 DEBUG: Found XML in JSON response field`);
          try {
            const jsonContent = responseXml[1].trim();
            const toolParsed = JSON.parse(jsonContent);
            if (toolParsed.type === 'tool_use' && toolParsed.name && toolParsed.input) {
              console.log(`✅ DEBUG: Extracted tool_use from JSON response: ${toolParsed.name}`);
              this.logger.log(`Tool use detected: ${toolParsed.name} with input ${JSON.stringify(toolParsed.input)}`);
              return {
                isToolUse: true,
                toolName: toolParsed.name,
                toolInput: toolParsed.input,
              };
            }
          } catch (e) {
            console.log(`❌ DEBUG: Failed to parse tool from JSON response: ${e}`);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ DEBUG: Not JSON format, continuing...`);
    }

    console.log(`❌ DEBUG: No tool use found`);
    return { isToolUse: false };
  }

  /**
   * Query with tool call support (multi-turn conversation)
   */
  async queryWithTools(prompt: string, options: AIQueryOptions = {}, maxTurns: number = 5): Promise<AIResponse> {
    console.log(`🔧 DEBUG: queryWithTools() called for Gemini`);
    console.log(`🔧 DEBUG: toolCallService: ${!!this.toolCallService}`);
    console.log(`🔧 DEBUG: maxTurns: ${maxTurns}`);
    
    if (!this.toolCallService) {
      console.log(`⚠️ DEBUG: ToolCallService not available, falling back to regular query`);
      this.logger.warn('ToolCallService not available, falling back to regular query');
      return super.query(prompt, options);
    }

    let turn = 0;
    let currentPrompt = prompt;
    const tools = this.toolCallService.list();
    console.log(`🔧 DEBUG: Available tools: ${tools.map(t => t.name).join(', ')}`);

    // Add tools to the initial prompt
    currentPrompt = this.buildPromptWithTools(currentPrompt, tools);

    while (turn < maxTurns) {
      console.log(`🔄 DEBUG: Tool call turn ${turn + 1}/${maxTurns}`);
      this.logger.log(`Tool call turn ${turn + 1}/${maxTurns}`);

      // Use super.query for all turns to get plain text responses
      const response = await super.query(currentPrompt, options);

      if (!response.success) {
        console.log(`❌ DEBUG: Query failed: ${response.error}`);
        return response;
      }

      console.log(`📝 DEBUG: Response content length: ${response.content.length}`);
      console.log(`📝 DEBUG: Response content preview: ${response.content.substring(0, 200)}`);

      // Check if response contains tool use
      const toolUse = this.parseToolUse(response.content);
      console.log(`🔍 DEBUG: parseToolUse result - isToolUse: ${toolUse.isToolUse}, toolName: ${toolUse.toolName}`);

      if (!toolUse.isToolUse) {
        console.log(`✅ DEBUG: No tool use detected, returning response`);
        // No tool use, return the final response
        return response;
      }

      // Execute the tool
      console.log(`🔧 DEBUG: Executing tool: ${toolUse.toolName}`);
      this.logger.log(`Executing tool: ${toolUse.toolName!} with input ${JSON.stringify(toolUse.toolInput)}`);
      
      const toolResult = await this.toolCallService.execute(
        toolUse.toolName!,
        toolUse.toolInput,
      );

      console.log(`🔧 DEBUG: Tool result: ${JSON.stringify(toolResult).substring(0, 200)}`);
      this.logger.log(`Tool result: ${JSON.stringify(toolResult)}`);

      // Build the next prompt with tool result
      currentPrompt = this.buildToolResultPrompt(
        toolUse.toolName!,
        toolUse.toolInput,
        toolResult,
      );

      turn++;
    }

    console.log(`⚠️ DEBUG: Max turns reached without final response`);
    this.logger.warn('Max turns reached without final response');
    return {
      content: 'Maximum conversation turns reached without completing the task.',
      provider: this.name,
      command: '',
      success: false,
      taskId: options.taskId,
    };
  }

  private buildToolResultPrompt(toolName: string, toolInput: any, toolResult: any): string {
    return `Tool execution result:
Tool: ${toolName}
Input: ${JSON.stringify(toolInput)}
Result: ${JSON.stringify(toolResult)}

Please continue with your response based on this tool result.`;
  }
}
