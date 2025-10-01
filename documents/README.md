# CodeCrew Documentation

This directory contains markdown documents that can be referenced by AI agents.

## Table of Contents

- [Getting Started](#getting-started)
- [Agent Configuration](#agent-configuration)
- [Document System](#document-system)
- [MCP Tools](#mcp-tools)

## Getting Started

CodeCrew is a Model Context Protocol (MCP) server that enables multi-AI agent collaboration for development tasks.

### Installation

```bash
npm install -g codecrew
codecrew init
```

### Basic Usage

```bash
# Query a single agent
codecrew q "@claude analyze this code"

# Query multiple agents in parallel
codecrew q "@claude @copilot @gemini review this project"

# Execute a task
codecrew x "@copilot implement user authentication"
```

## Agent Configuration

Agents are defined in `agents.yaml`:

```yaml
agents:
  - id: "my_agent"
    name: "My Custom Agent"
    role: "development"
    provider: "claude"
    inline:
      model: "sonnet"
      system_prompt: |
        You are a helpful coding assistant.
```

## Document System

CodeCrew supports a document system similar to SowonFlow, allowing agents to reference markdown documentation.

### Document Structure

Documents can be organized in subdirectories:
- `documents/guides/` - User guides and tutorials
- `documents/api/` - API reference documentation
- `documents/examples/` - Code examples

### Referencing Documents

In your agent's `system_prompt`, reference documents using template variables:

```yaml
system_prompt: |
  You are a coding assistant.
  
  <document name="coding-standards">
  {{{documents.coding-standards.content}}}
  </document>
```

## MCP Tools

CodeCrew provides the following MCP tools:

- `listAgents` - List available AI agents
- `queryAgent` - Query a single agent (read-only)
- `executeAgent` - Execute a task with an agent
- `queryAgentParallel` - Query multiple agents in parallel
- `checkAIProviders` - Check AI CLI tools availability
- `getTaskLogs` - View execution logs

For more information, visit [CodeCrew GitHub](https://github.com/sowonlabs/codecrew)
