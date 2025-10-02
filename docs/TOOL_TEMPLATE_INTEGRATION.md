# Tool System - Template Integration Guide

## Overview

CodeCrew의 Tool System은 Handlebars 템플릿 시스템과 통합되어 있어, agent의 `system_prompt`에서 동적으로 사용 가능한 tool 정보를 포함할 수 있습니다.

## Template Variables

### tools 변수

Agent system_prompt에서 사용 가능한 `tools` 변수:

```yaml
{{#if tools}}
  # Tools are available
  {{tools.count}}        # Number of available tools
  {{{tools.json}}}       # All tools as formatted JSON
  {{#each tools.list}}   # Iterate through tools
    {{this.name}}
    {{this.description}}
  {{/each}}
{{else}}
  # No tools available
{{/if}}
```

### tools 객체 구조

```typescript
tools: {
  count: number;          // 사용 가능한 tool 개수
  json: string;           // Tool 정의들의 JSON 문자열
  list: Array<{           // Tool 정의 배열
    name: string;
    description: string;
    input_schema: object;
    output_schema?: object;
  }>;
}
```

## Usage Examples

### Example 1: Basic Tool Awareness

```yaml
agents:
  - id: "my_agent"
    inline:
      system_prompt: |
        You are an AI assistant.
        
        {{#if tools}}
        You have access to {{tools.count}} tool(s).
        Use them when appropriate to provide accurate information.
        {{else}}
        Respond based on your knowledge without tools.
        {{/if}}
```

### Example 2: Detailed Tool Instructions

```yaml
agents:
  - id: "tool_expert"
    inline:
      system_prompt: |
        You are a helpful AI assistant.
        
        {{#if tools}}
        ## Available Tools
        
        You have {{tools.count}} tool(s) at your disposal:
        
        <tools>
        {{{tools.json}}}
        </tools>
        
        **Instructions:**
        1. Analyze user requests carefully
        2. Use tools when they provide accurate, real-time data
        3. Explain what tool you're using and why
        4. Always validate tool results before responding
        {{/if}}
        
        ## Your Task
        Answer questions clearly and use tools effectively.
```

### Example 3: Conditional Tool Guidance

```yaml
agents:
  - id: "smart_agent"
    inline:
      system_prompt: |
        You are an AI assistant.
        
        {{#if tools}}
          {{#if (eq tools.count 1)}}
          You have access to 1 tool. Use it wisely.
          {{else}}
          You have access to {{tools.count}} tools. Choose the most appropriate one.
          {{/if}}
          
          <available-tools>
          {{{tools.json}}}
          </available-tools>
        {{else}}
          Note: No tools are currently available.
        {{/if}}
```

### Example 4: Tool List with Custom Formatting

```yaml
agents:
  - id: "custom_format_agent"
    inline:
      system_prompt: |
        You are an AI assistant with tool capabilities.
        
        {{#if tools}}
        ## Your Toolkit ({{tools.count}} tools)
        
        {{#each tools.list}}
        ### {{this.name}}
        - **Description:** {{this.description}}
        - **Parameters:** {{#each this.input_schema.required}}{{this}}, {{/each}}
        
        {{/each}}
        
        Use these tools to enhance your responses.
        {{/if}}
```

## Built-in Tools

CodeCrew comes with built-in tools that are automatically available:

### read_file

Reads file contents from the filesystem.

**Input:**
```json
{
  "path": "string"  // File path to read
}
```

**Output:**
```json
{
  "content": "string"  // File contents
}
```

**Example Usage in Agent:**
```yaml
system_prompt: |
  You can read files using the read_file tool.
  
  {{#if tools}}
  <tools>
  {{{tools.json}}}
  </tools>
  {{/if}}
```

## Dynamic Tool Registration

Tools registered at runtime are automatically included in the template context:

```typescript
// In your custom service
toolCallService.register(
  {
    name: 'custom_tool',
    description: 'My custom tool',
    input_schema: { /* ... */ }
  },
  {
    execute: async (context) => { /* ... */ }
  }
);

// Agent templates automatically see this new tool
// No need to update agent configs!
```

## Provider-Specific Behavior

Different AI providers handle tools differently:

### Gemini
- Uses `--yolo` flag for automatic tool execution
- Parses tool usage from JSON output
- Tools are included in prompt via template

### Claude
- Supports multi-turn tool calling
- Tools are described in system prompt
- Handles tool responses iteratively

### Copilot
- (Tool support coming soon)

## Best Practices

### 1. Always Check Tool Availability

```yaml
{{#if tools}}
  # Tool-specific instructions
{{else}}
  # Fallback behavior
{{/if}}
```

### 2. Provide Clear Tool Usage Guidelines

```yaml
{{#if tools}}
**When to use tools:**
- For reading files: use read_file
- For calculations: use calculator
- For API calls: use http_request

**When NOT to use tools:**
- For general knowledge questions
- For creative writing
- For mathematical proofs (unless calculation needed)
{{/if}}
```

### 3. Keep Tool Descriptions Concise in Prompt

```yaml
{{#if tools}}
Available tools: {{tools.count}}
See <tools> section below for details.

<tools>
{{{tools.json}}}
</tools>
{{/if}}
```

### 4. Use Conditional Logic for Tool Count

```yaml
{{#if tools}}
  {{#if (eq tools.count 0)}}
    No tools available.
  {{else if (eq tools.count 1)}}
    One tool available: {{tools.list.[0].name}}
  {{else}}
    Multiple tools available ({{tools.count}}).
  {{/if}}
{{/if}}
```

## Testing Tool Templates

### Test with Different Tool Scenarios

```bash
# Test with built-in tools (read_file)
node dist/main.js query "@my_agent test prompt"

# Add custom tools and test
# Tools are automatically included in template context
```

### View Rendered Template

Check task logs to see the final rendered prompt:

```bash
cat .codecrew/logs/task_<taskId>.log | grep -A 20 "Available Tools"
```

## Comparison: Old vs New Approach

### ❌ Old Approach (Hardcoded in Provider)

```typescript
// In provider code
private buildPromptWithTools(prompt: string, tools: Tool[]): string {
  return `Tools: ${JSON.stringify(tools)}\n\n${prompt}`;
}
```

**Problems:**
- Tool description logic in provider code
- Hard to customize per agent
- Not user-configurable

### ✅ New Approach (Template-Based)

```yaml
# In agents.yaml
agents:
  - id: "my_agent"
    inline:
      system_prompt: |
        {{#if tools}}
        <tools>{{{tools.json}}}</tools>
        {{/if}}
```

**Benefits:**
- ✅ User-configurable tool presentation
- ✅ Conditional tool instructions
- ✅ Agent-specific tool guidance
- ✅ Dynamic tool updates
- ✅ No code changes needed

## Advanced Patterns

### Pattern 1: Role-Based Tool Access

```yaml
agents:
  - id: "analyst"
    inline:
      system_prompt: |
        You are a data analyst.
        
        {{#if tools}}
        Focus on using these tools for data analysis:
        {{#each tools.list}}
          {{#if (or (eq this.name "read_file") (eq this.name "calculate"))}}
          - {{this.name}}: {{this.description}}
          {{/if}}
        {{/each}}
        {{/if}}
```

### Pattern 2: Progressive Tool Disclosure

```yaml
system_prompt: |
  {{#if (eq env.EXPERIENCE_LEVEL "beginner")}}
    {{#if tools}}
    You have basic tools. Start with read_file.
    {{/if}}
  {{else if (eq env.EXPERIENCE_LEVEL "advanced")}}
    {{#if tools}}
    All {{tools.count}} tools available. Use as needed.
    <tools>{{{tools.json}}}</tools>
    {{/if}}
  {{/if}}
```

### Pattern 3: Tool Documentation Links

```yaml
{{#if tools}}
## Available Tools

{{{tools.json}}}

📚 For detailed tool documentation, see:
{{{documents.tool-guide.content}}}
{{/if}}
```

## Troubleshooting

### Tool Not Appearing in Template

1. Check if ToolCallService is initialized
2. Verify tool is registered: `toolCallService.list()`
3. Check logs for template processing errors

### Template Not Rendering Tools

1. Verify `{{#if tools}}` syntax (not `{{#if tool}}`)
2. Use `{{{tools.json}}}` with triple braces for unescaped HTML
3. Check TypeScript compilation succeeded

### Tool Execution Not Working

1. Verify provider supports tool calling (Gemini, Claude)
2. Check `--yolo` flag for Gemini
3. Review task logs for tool execution attempts

## Future Enhancements

- [ ] Tool filtering by capability
- [ ] Tool permission system in templates
- [ ] Tool usage analytics in templates
- [ ] Tool recommendation engine
- [ ] Multi-provider tool adapters

## References

- [Tool System Documentation](./TOOL_SYSTEM.md)
- [Template System Examples](./TEMPLATE_EXAMPLES.md)
- [Agent Configuration Guide](../README.md#agent-configuration)
