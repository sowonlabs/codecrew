# CodeCrew User Manual

## Quick Start

CodeCrew is a multi-AI agent collaboration tool that works with Claude, Gemini, and GitHub Copilot.

## Basic Commands

### Query (Read-Only Analysis)
```bash
codecrew query "@agent your question"
codecrew q "@agent your question"  # shortcut
```

### Execute (File Creation/Modification)
```bash
codecrew execute "@agent your task"
codecrew x "@agent your task"  # shortcut
```

### System Commands
```bash
codecrew init      # Initialize agents.yaml
codecrew doctor    # Check AI provider status
codecrew logs [id] # View task logs
```

## Agent Mention Syntax

### Basic Agent Mention
```bash
codecrew q "@claude analyze this code"
codecrew q "@gemini search latest AI news"
codecrew q "@copilot suggest improvements"
```

### Model Selection
Specify AI model using colon syntax:
```bash
codecrew q "@claude:opus complex architecture design"
codecrew q "@claude:sonnet general development tasks"
codecrew q "@claude:haiku quick simple questions"
codecrew q "@gemini:gemini-2.5-pro advanced analysis"
```

### Multiple Agents (Parallel Execution)
Query multiple agents simultaneously:
```bash
codecrew q "@claude @gemini @copilot review this code"
```

Each agent processes independently and results are returned in parallel.

## Built-in Agents

### @codecrew (This Agent)
Your CodeCrew assistant. Fallback mechanism: claude → gemini → copilot
```bash
codecrew q "@codecrew how do I use multiple agents?"
```

### @claude (Anthropic Claude)
Best for: Complex reasoning, code analysis, architecture
```bash
codecrew q "@claude explain this design pattern"
```

### @gemini (Google Gemini)
Best for: Performance optimization, data analysis, research
```bash
codecrew q "@gemini optimize this algorithm"
```

### @copilot (GitHub Copilot)
Best for: Code implementation, best practices, testing
```bash
codecrew q "@copilot write unit tests for this function"
```

## Custom Agents

### Creating Custom Agents

Create `agents.yaml` in your project:

```yaml
agents:
  - id: "my_agent"
    name: "My Custom Agent"
    role: "developer"
    inline:
      provider: "claude"
      model: "sonnet"
      system_prompt: |
        You are a specialized assistant for...
```

### Using Custom Agents
```bash
codecrew q "@my_agent your question"
```

## Document System

### Using Documents in Agents

Reference documents in system_prompt:

```yaml
agents:
  - id: "helper"
    inline:
      system_prompt: |
        <manual>
        {{{documents.user-guide.content}}}
        </manual>
```

### Document Levels
1. `documents.yaml` - Global documents
2. `agents.yaml` documents: - Project documents
3. `agent.inline.documents` - Agent-specific

### Template Variables
- `{{{documents.name.content}}}` - Full content
- `{{{documents.name.toc}}}` - Table of contents
- `{{documents.name.summary}}` - Summary

## MCP Integration

### VS Code
Add to `.vscode/mcp.json`:
```json
{
  "servers": {
    "codecrew": {
      "command": "npx",
      "args": ["-y", "codecrew", "mcp"],
      "env": {
        "AGENTS_CONFIG": "${workspaceFolder}/agents.yaml"
      }
    }
  }
}
```

### Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "codecrew": {
      "command": "npx",
      "args": ["-y", "codecrew", "mcp"]
    }
  }
}
```

## Common Patterns

### Code Review
```bash
codecrew q "@claude @copilot review this pull request"
```

### Architecture Design
```bash
codecrew q "@claude:opus design user authentication system"
```

### Implementation
```bash
codecrew x "@copilot implement JWT middleware"
```

### Multi-Perspective Analysis
```bash
codecrew q "@claude @gemini @copilot analyze performance issues"
```

## Troubleshooting

### Check AI Provider Status
```bash
codecrew doctor
```

### View Task Logs
```bash
codecrew logs
codecrew logs task_1234567890_abcdef
```

### Common Issues

**Agent not found:**
- Check `agents.yaml` exists
- Verify agent ID is correct
- Use `@codecrew` for built-in help

**AI provider unavailable:**
- Run `codecrew doctor`
- Install required CLI: claude, gemini, copilot
- Check authentication

**Template errors:**
- Verify document references exist
- Check YAML syntax
- Use `{{{...}}}` for unescaped content

## Tips & Best Practices

### Choose the Right Model
- **opus**: Complex reasoning, architecture
- **sonnet**: Balanced performance (default)
- **haiku**: Fast, simple tasks

### Leverage Parallel Execution
Query multiple agents for comprehensive analysis:
```bash
codecrew q "@claude @gemini @copilot what's the best approach?"
```

### Use Documents for Context
Provide project-specific knowledge to agents via documents:
- Coding standards
- API documentation
- Architecture guidelines

### Read-Only vs Execute Mode
- **Query mode**: Safe analysis, no modifications
- **Execute mode**: Can create/modify files

### Task Logs
Review logs to understand agent execution:
```bash
codecrew logs  # List recent tasks
codecrew logs [taskId]  # View specific task
```

## Advanced Features

### Template Processing
Documents support Handlebars templates:
```yaml
system_prompt: |
  Project guidelines:
  {{{documents.guidelines.content}}}
  
  Available APIs:
  {{{documents.api-docs.toc}}}
```

### Lazy Loading
Large documents can be loaded on-demand:
```yaml
documents:
  large-manual:
    path: "docs/manual.md"
    lazy: true
```

### Agent-Specific Options
Configure CLI options per agent:
```yaml
agents:
  - id: "reviewer"
    options:
      query:
        - "--add-dir=."
        - "--verbose"
      execute:
        - "--add-dir=."
        - "--allowedTools=Edit"
```

## Getting Help

### Ask @codecrew
```bash
codecrew q "@codecrew how do I...?"
```

### Documentation
- GitHub: https://github.com/sowonlabs/codecrew
- CLI Reference: README.cli.md
- Agent Configuration: README.md

### Community
- Report issues: GitHub Issues
- Discussions: GitHub Discussions
