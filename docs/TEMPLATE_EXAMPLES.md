# Template System Examples

CodeCrew uses Handlebars for dynamic template processing in agent system prompts. This allows you to create flexible, context-aware agents that adapt based on environment variables, agent metadata, and custom conditions.

## Available Context Variables

### Documents
```handlebars
{{{documents.doc-name.content}}}  - Full document content (unescaped)
{{{documents.doc-name.toc}}}      - Table of contents
{{documents.doc-name.summary}}     - Document summary (escaped)
```

### Environment Variables
```handlebars
{{env.NODE_ENV}}           - Access any environment variable
{{env.API_KEY}}
{{env.DEBUG}}
```

### Agent Metadata
```handlebars
{{agent.id}}               - Agent ID
{{agent.name}}             - Agent name
{{agent.provider}}         - AI provider (claude, gemini, copilot)
{{agent.model}}            - Model name (sonnet, haiku, etc.)
{{agent.workingDirectory}} - Working directory
```

### Mode
```handlebars
{{mode}}                   - 'query' or 'execute'
```

### Custom Variables
```handlebars
{{vars.customKey}}         - Any custom variable passed in context
```

## Handlebars Helpers

### Conditional Helpers

#### Equality Check
```handlebars
{{#if (eq agent.provider "claude")}}
You are using Claude AI.
{{else}}
You are using another AI provider.
{{/if}}
```

#### Not Equal
```handlebars
{{#if (ne env.NODE_ENV "production")}}
Debug mode is enabled.
{{/if}}
```

#### Contains (Array)
```handlebars
{{#if (contains options "--verbose")}}
Verbose output enabled.
{{/if}}
```

#### Logical AND
```handlebars
{{#if (and agent.model env.DEBUG)}}
Model: {{agent.model}}, Debug enabled
{{/if}}
```

#### Logical OR
```handlebars
{{#if (or (eq agent.provider "claude") (eq agent.provider "gemini"))}}
Web search is available.
{{/if}}
```

#### Logical NOT
```handlebars
{{#if (not env.PRODUCTION)}}
Running in development mode.
{{/if}}
```

## Practical Examples

### Example 1: Environment-Specific Behavior

```yaml
agents:
  - id: "dev_assistant"
    inline:
      system_prompt: |
        You are a development assistant.
        
        {{#if (eq env.NODE_ENV "production")}}
        **Production Mode**: Be extra careful with suggestions.
        Always recommend testing changes thoroughly.
        {{else}}
        **Development Mode**: Feel free to experiment.
        You can suggest more experimental approaches.
        {{/if}}
        
        Working Directory: {{agent.workingDirectory}}
```

### Example 2: Provider-Specific Features

```yaml
agents:
  - id: "researcher"
    inline:
      system_prompt: |
        You are a research assistant.
        
        {{#if (or (eq agent.provider "claude") (eq agent.provider "gemini"))}}
        ## Web Search Available
        You have access to web search capabilities.
        Use them to find the latest information.
        {{else}}
        ## Local-Only Analysis
        You don't have web search. Focus on analyzing provided code and files.
        {{/if}}
        
        Provider: {{agent.provider}}
        Model: {{agent.model}}
```

### Example 3: Model-Specific Instructions

```yaml
agents:
  - id: "coder"
    inline:
      system_prompt: |
        You are a coding assistant.
        
        {{#if (eq agent.model "haiku")}}
        ## Fast Response Mode
        Provide concise, quick answers.
        Focus on the most important information.
        {{else if (eq agent.model "opus")}}
        ## Deep Analysis Mode
        Provide detailed, comprehensive analysis.
        Consider edge cases and architectural implications.
        {{else}}
        ## Balanced Mode
        Provide clear, thorough but efficient responses.
        {{/if}}
```

### Example 4: Feature Flags with Environment Variables

```yaml
agents:
  - id: "smart_agent"
    inline:
      system_prompt: |
        You are an AI assistant.
        
        {{#if env.ENABLE_EXPERIMENTAL_FEATURES}}
        **Experimental Features Enabled**:
        - Advanced code generation
        - Multi-step reasoning
        - Automatic optimization
        {{/if}}
        
        {{#if env.VERBOSE_MODE}}
        **Verbose Mode**: Provide detailed explanations for all suggestions.
        {{/if}}
        
        {{#if (and env.API_KEY env.ENABLE_EXTERNAL_TOOLS)}}
        **External Tools Available**: You can use external APIs for enhanced functionality.
        {{/if}}
```

### Example 5: Dynamic Document Loading

```yaml
agents:
  - id: "contextual_agent"
    inline:
      system_prompt: |
        You are a contextual assistant.
        
        {{#if (eq agent.provider "claude")}}
        <guidelines>
        {{{documents.claude-guidelines.content}}}
        </guidelines>
        {{else if (eq agent.provider "gemini")}}
        <guidelines>
        {{{documents.gemini-guidelines.content}}}
        </guidelines>
        {{/if}}
        
        {{#if env.INCLUDE_BEST_PRACTICES}}
        <best-practices>
        {{{documents.coding-standards.content}}}
        </best-practices>
        {{/if}}
```

### Example 6: Mode-Based Behavior

```yaml
agents:
  - id: "adaptive_agent"
    inline:
      system_prompt: |
        You are an adaptive AI agent.
        
        {{#if (eq mode "query")}}
        ## Read-Only Analysis Mode
        - Analyze and explain code
        - Review architecture
        - Suggest improvements
        - Do NOT modify files
        {{else if (eq mode "execute")}}
        ## Implementation Mode
        - Create and modify files
        - Implement features
        - Refactor code
        - Apply changes
        {{/if}}
        
        Current mode: {{mode}}
```

### Example 7: Complex Conditional Logic

```yaml
agents:
  - id: "enterprise_agent"
    inline:
      system_prompt: |
        You are an enterprise-grade assistant.
        
        {{#if (and (eq env.TIER "enterprise") (eq agent.model "opus"))}}
        ## Premium Enterprise Mode
        - Maximum detail and accuracy
        - Compliance checking enabled
        - Security best practices enforced
        - Audit trail generation
        
        {{else if (eq env.TIER "enterprise")}}
        ## Enterprise Mode
        - Detailed analysis
        - Security considerations
        - Best practices enforcement
        
        {{else if (and (not env.PRODUCTION) env.DEBUG)}}
        ## Development Debug Mode
        - Verbose logging
        - Step-by-step explanations
        - Experimental features allowed
        
        {{else}}
        ## Standard Mode
        - Balanced analysis
        - Standard practices
        {{/if}}
```

## Setting Environment Variables

### In Shell
```bash
export NODE_ENV=production
export ENABLE_EXPERIMENTAL_FEATURES=true
export VERBOSE_MODE=true
codecrew query "@agent your question"
```

### Inline
```bash
NODE_ENV=production VERBOSE_MODE=true codecrew query "@agent your question"
```

### In .env File
```
NODE_ENV=production
ENABLE_EXPERIMENTAL_FEATURES=true
VERBOSE_MODE=true
DEBUG=false
```

## Best Practices

1. **Use Descriptive Variable Names**: Make it clear what each condition checks
2. **Provide Fallbacks**: Always have an `{{else}}` clause for conditions
3. **Keep It Simple**: Don't over-complicate templates; split complex logic into multiple agents
4. **Document Your Flags**: Add comments explaining what environment variables do
5. **Test Different Combinations**: Try various env var combinations to ensure correct behavior
6. **Escape When Needed**: Use `{{var}}` for escaped content, `{{{var}}}` for raw HTML/markdown

## Debugging Templates

### Enable Debug Logging
```bash
export DEBUG=true
codecrew query "@agent test"
```

### Check Processed Template
Templates are processed at agent creation time. Check logs to see the final processed prompt.

## Common Patterns

### A/B Testing
```handlebars
{{#if (eq env.EXPERIMENT_GROUP "A")}}
Use approach A
{{else}}
Use approach B
{{/if}}
```

### Progressive Enhancement
```handlebars
Base functionality for all users.

{{#if env.BETA_FEATURES}}
+ Beta features enabled
{{/if}}

{{#if env.PREMIUM}}
+ Premium features enabled
{{/if}}
```

### Conditional Documentation
```handlebars
{{#if (or env.INCLUDE_DOCS env.VERBOSE_MODE)}}
<documentation>
{{{documents.full-guide.content}}}
</documentation>
{{else}}
<quick-reference>
{{{documents.quick-tips.content}}}
</quick-reference>
{{/if}}
```

## Summary

The Handlebars template system makes CodeCrew agents incredibly flexible:
- ✅ Environment-aware behavior
- ✅ Provider and model-specific optimizations
- ✅ Feature flags and A/B testing
- ✅ Conditional documentation loading
- ✅ Dynamic prompt generation
- ✅ Mode-based instructions (query vs execute)

Use these capabilities to create sophisticated, context-aware AI agents that adapt to your specific needs!
