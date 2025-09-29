# CodeCrew MCP Server

> **Build your AI team. It's easy.**

**AI x AI** - CodeCrew transforms complex AI technology into an easy-to-use team environment, helping developers build and connect their own AI teams through the Model Context Protocol (MCP).

## Why CodeCrew?

**Turn your existing AI subscriptions into a powerful development team!** CodeCrew connects your AI assistants with specialist agents using **Claude Code**, **Gemini CLI**, and **GitHub Copilot CLI**.

### Key Benefits
- **No additional costs** - Use your existing Claude Pro, Gemini Pro, or GitHub Copilot subscriptions
- **Multi-agent collaboration** - Combine different AI models for specialized tasks
- **Parallel execution** - Run multiple agents simultaneously for faster results
- **Task logging** - Monitor and track all agent activities
- **Flexible configuration** - Define custom agents for your specific needs

### Supported AI Tools
- **Claude Code** - Advanced reasoning and code analysis
- **Gemini CLI** - Google's powerful AI with real-time web access
- **GitHub Copilot CLI** - GitHub's specialized coding assistant

## Quick Start

**No installation needed!** Run directly with npx:

```bash
npx codecrew
```

## Supported MCP Clients

### VS Code MCP Extension
Add to VS Code MCP configuration (`.vscode/mcp.json`):

**For Windows users (recommended):**
```json
{
  "servers": {
    "codecrew": {
      "command": "cmd.exe",
      "args": ["/c", "npx", "codecrew"],
      "env": {
        "AGENTS_CONFIG": "${workspaceFolder}/agents.yaml"
      }
    }
  }
}
```

**For macOS/Linux users:**
```json
{
  "servers": {
    "codecrew": {
      "command": "npx",
      "args": ["codecrew"],
      "env": {
        "AGENTS_CONFIG": "${workspaceFolder}/agents.yaml"
      }
    }
  }
}
```

> **Note for Windows users:** Due to PowerShell execution policy restrictions, using `cmd.exe` with `npx` provides better compatibility than running `npx` directly in PowerShell.

### Claude Desktop
Add to Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "codecrew": {
      "command": "npx",
      "args": ["codecrew"],
      "env": {
        "AGENTS_CONFIG": "/path/to/your/agents.yaml"
      }
    }
  }
}
```

### Cursor IDE
Add to Cursor MCP configuration:

**For project-specific setup**, create `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "codecrew": {
      "command": "npx",
      "args": ["codecrew"],
      "env": {
        "AGENTS_CONFIG": "${workspaceFolder}/agents.yaml"
      }
    }
  }
}
```

**Note:** After adding the configuration, restart Cursor and enable the MCP server in Settings > Cursor Settings > MCP Servers.

### Other MCP Clients
- **Cline**: Supports MCP through VS Code MCP extension
- **Continue**: Supports MCP through VS Code MCP extension  
- **Windsurf**: MCP support may vary - check their documentation

**Note:** Create `agents.yaml` file first (see Custom Agents Setup below), then restart your MCP client.

## Available Tools

### Agent Management
1. **`listAgents`** - List available specialist AI agents that can be utilized
2. **`queryAgent`** - Query a specific specialist agent (read-only mode for analysis, explanations, reviews)
3. **`executeAgent`** - Execute tasks through a specialist agent (can provide implementation and modify files)
4. **`queryAgentParallel`** - Query multiple specialist agents simultaneously in parallel (read-only mode)
5. **`executeAgentParallel`** - Execute multiple tasks through specialist agents simultaneously in parallel

### Task Monitoring
6. **`getTaskLogs`** - Get task logs by task ID to monitor progress and detailed execution logs
7. **`clearAllLogs`** - Clear all log files from the .codecrew/logs directory to clean up accumulated task logs

### System Diagnostics  
8. **`checkAIProviders`** - Check the status of available AI CLI tools (Claude, Gemini, GitHub Copilot)

## Custom Agents Setup

**Required:** Create an `agents.yaml` file to define your specialist agents:

```yaml
agents:
  - id: "frontend_developer"
    name: "React Expert"
    working_directory: "/path/to/your/project"
    options:  # CLI options for file operations
      - "--allowedTools=Edit,Bash"
      - "--add-dir=."
      # - "--dangerously-skip-permissions"  # DANGEROUS: Bypasses all safety checks
    inline:
      type: "agent"
      provider: "claude"
      system_prompt: |
        You are a senior frontend developer expert specializing in React.
        Provide detailed code examples and best practices.

  - id: "devops_engineer"
    name: "DevOps Expert"
    working_directory: "/path/to/your/project"
    options:  # Additional Gemini options (--yolo auto-enabled in execute mode)
      - "--sandbox"
      # Additional dangerous options (uncomment with caution):
      # - "--yolo"  # DANGEROUS: Already auto-enabled in execute mode
    inline:
      type: "agent"
      provider: "gemini"
      system_prompt: |
        You are a DevOps engineer expert in Docker, Kubernetes, and CI/CD.
        Focus on deployment strategies and infrastructure.

  - id: "copilot_assistant"
    name: "Copilot Helper"
    working_directory: "/path/to/your/project"
    options:  # Copilot specific options
      - "--allow-tool=files"
      # - "--allow-all-tools"  # DANGEROUS: Enables all tools including system access
    inline:
      type: "agent"
      provider: "copilot"
      system_prompt: |
        You are a coding assistant specialized in code suggestions and reviews.
```

## Troubleshooting

### Windows Issues

**Problem: "'codecrew' is not recognized as an internal or external command"**

**Cause:** PowerShell execution policy restrictions prevent `npx` scripts from running.

**Solutions:**

1. **Use cmd.exe (Recommended)** - Update your MCP configuration:
   ```json
   {
     "servers": {
       "codecrew": {
         "command": "cmd.exe",
         "args": ["/c", "npx", "codecrew"],
         "env": {
           "AGENTS_CONFIG": "${workspaceFolder}/agents.yaml"
         }
       }
     }
   }
   ```

2. **Alternative: Change PowerShell execution policy** (Admin required):
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Alternative: Use direct node execution**:
   ```bash
   # Install globally first
   npm install -g codecrew
   ```
   Then update MCP config:
   ```json
   {
     "servers": {
       "codecrew": {
         "command": "node",
         "args": ["C:\\Program Files\\nodejs\\node_modules\\codecrew\\dist\\main.js"],
         "env": {
           "AGENTS_CONFIG": "${workspaceFolder}/agents.yaml"
         }
       }
     }
   }
   ```

### General Issues

**Problem: MCP server fails to start**
- Ensure `agents.yaml` file exists in your workspace
- Check that required AI CLI tools are installed and configured
- Verify your MCP client configuration syntax

**Problem: Agent execution fails**
- Run `checkAIProviders` tool to verify AI CLI tools are available
- Check agent configuration in `agents.yaml`
- Review task logs with `getTaskLogs` tool

## License

Copyright (c) 2025 SowonLabs. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.

---

Built by [SowonLabs](https://github.com/sowonlabs)
