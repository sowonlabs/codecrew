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
- **🆕 Direct CLI interface** - Use from command line without IDE setup
- **🆕 Pipeline support** - Chain commands with Unix-style pipes
- **🆕 Real file operations** - Agents can create and modify actual files

### Supported AI Tools
- **Claude Code** - Advanced reasoning and code analysis
- **Gemini CLI** - Google's powerful AI with real-time web access
- **GitHub Copilot CLI** - GitHub's specialized coding assistant

## Quick Start

CodeCrew offers two distinct modes of operation:

### 🖥️ **CLI Mode** - Direct Command Line Usage
**Perfect for terminal workflows and automation:**

```bash
# Show help and available commands (default behavior)
codecrew

# Initialize your project
codecrew init

# Check system health
codecrew doctor

# Query agents (read-only analysis)
codecrew query "@claude analyze my code"

# Execute tasks (file creation/modification)
codecrew execute "@claude create a login component"
```

### 🔌 **MCP Server Mode** - IDE Integration
**For seamless integration with VS Code, Claude Desktop, Cursor:**

```bash
# Run MCP server for IDE integration
codecrew mcp
```

> **Choose Your Mode:** Use CLI mode for direct terminal workflows, or MCP server mode for IDE integration. Both provide full access to the same powerful AI agent collaboration features.

## Supported MCP Clients

### VS Code MCP Extension
Add to VS Code MCP configuration (`.vscode/mcp.json`):

**For Windows users (recommended):**
```json
{
  "servers": {
    "codecrew": {
      "command": "cmd.exe",
      "args": ["/c", "codecrew", "mcp"],
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
      "args": ["-y", "codecrew", "mcp"],
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
      "args": ["-y", "codecrew", "mcp"],
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
      "args": ["-y", "codecrew", "mcp"],
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

## 🖥️ CLI Features

### **Comprehensive Command Line Interface**

CodeCrew includes a full-featured CLI that works independently of any IDE or MCP client. When you run `codecrew` without any arguments, it displays help by default. For MCP server integration, use `codecrew mcp`.

#### **🚀 Core Commands**

**`codecrew` (default)** - Help and Command Overview
- ✅ **Default Behavior**: Shows comprehensive help when no command is specified
- ✅ **Command Overview**: Lists all available commands and options
- ✅ **Usage Examples**: Provides clear examples for each command
- ✅ **Quick Start Guide**: Helps users get started quickly

**`codecrew init`** - Project Initialization
- ✅ Creates `agents.yaml` configuration file
- ✅ Sets up `.codecrew/logs` directory structure
- ✅ Configures default Claude, Gemini, and Copilot agents
- ✅ Prevents accidental overwrites (use `--force` to override)

```bash
codecrew init                          # Initialize in current directory
codecrew init --config custom.yaml    # Use custom config filename
codecrew init --force                 # Overwrite existing configuration
```

**`codecrew doctor`** - System Health Check
- ✅ Validates `agents.yaml` configuration
- ✅ Tests AI CLI tool availability (Claude, Gemini, Copilot)
- ✅ Sends real test queries to verify AI responses
- ✅ Checks for session limits and performance issues
- ✅ Provides specific troubleshooting recommendations

```bash
codecrew doctor                        # Full system diagnosis
codecrew doctor --config path/to/config.yaml  # Use custom config
```

**`codecrew query`** - Read-Only Analysis
- ✅ Query single or multiple agents simultaneously
- ✅ Perfect for code analysis, reviews, and explanations
- ✅ Supports pipeline input for context chaining
- ✅ No file modifications - safe for analysis

```bash
codecrew query "@claude analyze this function"
codecrew query "@claude @gemini @copilot review security practices"
echo "user auth code" | codecrew query "@claude explain this"
```

**`codecrew execute`** - File Operations
- ✅ Agents can create, modify, and delete files
- ✅ Parallel execution with detailed performance metrics
- ✅ Pipeline support for multi-step workflows
- ✅ Comprehensive logging and error handling

```bash
codecrew execute "@claude create a React component"
codecrew execute "@claude @gemini implement different sorting algorithms"
codecrew query "@architect design API" | codecrew execute "@backend implement the design"
```

#### **🔄 Pipeline Workflows**

Chain commands together with Unix-style pipes for complex workflows:

```bash
# Multi-step development workflow
codecrew query "@architect design user auth system" | \
codecrew execute "@backend implement the API endpoints" | \
codecrew execute "@frontend create the UI components"

# Code review and improvement pipeline
codecrew query "@claude analyze current code quality" | \
codecrew execute "@gemini implement the suggested improvements"
```

#### **📊 Advanced Features**

- **Task Tracking**: Every operation is logged with unique task IDs
- **Performance Metrics**: Execution time, success rates, parallel vs sequential comparison
- **Error Recovery**: Detailed error messages with resolution suggestions
- **Session Management**: Handles AI provider session limits gracefully
- **Configuration Validation**: Validates agent configurations before execution

#### **🧪 Proven Test Results**

- ✅ **File Creation**: Successfully created `multiplication.js` with working code
- ✅ **Pipeline Context**: Verified context passing through `context-test.txt`
- ✅ **Parallel Processing**: Multiple agents working simultaneously
- ✅ **AI Integration**: All three providers (Claude, Gemini, Copilot) tested and working

### **Getting Started with CLI**

1. **See all available commands:**
   ```bash
   codecrew
   ```

2. **Initialize your project:**
   ```bash
   codecrew init
   ```

3. **Verify everything works:**
   ```bash
   codecrew doctor
   ```

4. **Try your first query:**
   ```bash
   codecrew query "@claude hello world"
   ```

5. **Create your first file:**
   ```bash
   codecrew execute "@claude create a simple Node.js HTTP server"
   ```

For detailed CLI documentation and advanced usage patterns, see [README.cli.md](README.cli.md).

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
    options:
      query:  # Options for read-only query mode
        - "--add-dir=."
        - "--verbose"
        # Query mode is read-only, so exclude dangerous tools
      execute:  # Options for file modification execute mode
        - "--add-dir=."
        - "--allowedTools=Edit,Bash"
        # Execute mode allows file operations
    inline:
      type: "agent"
      provider: "claude"
      system_prompt: |
        You are a senior frontend developer expert specializing in React.
        Provide detailed code examples and best practices.

  - id: "devops_engineer"
    name: "DevOps Expert"
    working_directory: "/path/to/your/project"
    options:
      query:  # Options for read-only query mode
        - "--include-directories=."
        # Query mode uses default options
      execute:  # Options for file modification execute mode
        - "--include-directories=."
        - "--yolo"  # Automatic execution is only allowed in execute mode
    inline:
      type: "agent"
      provider: "gemini"
      system_prompt: |
        You are a DevOps engineer expert in Docker, Kubernetes, and CI/CD.
        Focus on deployment strategies and infrastructure.

  - id: "copilot_assistant"
    name: "Copilot Helper"
    working_directory: "/path/to/your/project"
    options:
      query:  # Options for read-only query mode
        - "--allow-tool=files"
        # Query mode only allows file reading
      execute:  # Options for file modification execute mode
        - "--allow-tool=terminal"
        - "--allow-tool=files"
        # Execute mode allows terminal and file access
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
         "args": ["/c", "codecrew", "mcp"],
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

MIT License

Copyright (c) 2025 SowonLabs

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

Built by [SowonLabs](https://github.com/sowonlabs)
