# CodeCrew CLI Documentation

## 🎯 Concept

**CodeCrew CLI = A Pipeline Tool for AI Agent Collaboration**

A command-line tool that enables natural collaboration with AI agents, similar to mentioning teammates in Discord or Slack.

### Core Features
- 🏷️ **Mention-based Agent Calls** (`@agent`)
- 🔄 **Unix-style Pipeline Support** (`|`)
- ⚡ **Automatic Parallel/Sequential Execution**
- 🧠 **Context Passing and Collaboration**

## ✨ Implemented Core Features

### 🎯 **Core CLI Commands (Fully Implemented)**

**CodeCrew CLI has the following commands fully implemented and working:**

#### **1. `codecrew` - Show Help (Default)**
- ✅ **Default Behavior**: Shows comprehensive help when no command is specified
- ✅ **Command Overview**: Lists all available commands and options
- ✅ **Usage Examples**: Provides clear examples for each command
- ✅ **Quick Start Guide**: Helps users get started quickly
- ✅ **Agent Specializations**: Explains the roles of @claude, @copilot, and @gemini

#### **2. `codecrew init` - Project Initialization**
- ✅ **Fully Implemented**: Automatic generation of `agents.yaml` configuration file
- ✅ **Logging System**: Automatic creation of `.codecrew/logs` directory
- ✅ **Default Agents**: Pre-configured Claude, Gemini, and Copilot agents
- ✅ **Conflict Prevention**: Prevents overwriting existing files (`--force` option available)
- ✅ **Task Tracking**: Logs all initialization processes

#### **3. `codecrew doctor` - System Diagnostics**
- ✅ **Fully Implemented**: Comprehensive system health checks
- ✅ **Config Validation**: Validates `agents.yaml` structure and content
- ✅ **AI Provider Check**: Real-time testing of Claude, Gemini, Copilot CLI availability
- ✅ **Live AI Testing**: Sends test queries to each agent to verify actual responses
- ✅ **Performance Diagnostics**: Checks response times and session limits
- ✅ **Custom Recommendations**: Provides specific troubleshooting guidance

#### **4. `codecrew execute` - File Operations**
- ✅ **Fully Implemented**: Real file creation and modification through agents
- ✅ **Parallel Execution**: Supports simultaneous execution by multiple agents
- ✅ **Pipeline Support**: Context passing through stdin
- ✅ **Performance Metrics**: Detailed statistics on execution time, success rates
- ✅ **Error Handling**: Detailed error reporting for failed operations

#### **5. `codecrew query` - Analysis and Queries**
- ✅ **Fully Implemented**: Read-only agent queries
- ✅ **Parallel Queries**: Simultaneous queries to multiple agents
- ✅ **Pipeline Support**: Context passing through stdin

#### **6. `codecrew mcp` - MCP Server Mode**
- ✅ **Fully Implemented**: Runs MCP server for IDE integration
- ✅ **IDE Support**: Works with VS Code, Claude Desktop, Cursor
- ✅ **Protocol Support**: STDIO and HTTP protocols supported
- ✅ **Separate Mode**: Dedicated command for MCP server operation

### 🧪 **Verified Test Results**

**Real Operation Confirmed:**
- ✅ **File Creation Test**: Successfully created `multiplication.js` file
- ✅ **Pipeline Test**: Successful context passing through `context-test.txt`
- ✅ **AI Provider Test**: Confirmed integration with Claude, Gemini, Copilot
- ✅ **Parallel Processing**: Verified simultaneous multi-agent execution performance

## 📋 Basic Commands

### Default Behavior
```bash
# Show comprehensive help and available commands (default behavior)
codecrew

# Run MCP server for IDE integration
codecrew mcp
```

### query - Analysis and Queries
```bash
# Single agent query
codecrew query "@backend analyze current API structure"

# Multiple agent queries (automatic parallel execution)
codecrew query "@security @performance @maintainability review this codebase"

# Using custom config file
codecrew query --config ./team-agents.yaml "@backend @frontend analyze project"
```

### execute - Implementation and File Operations
```bash
# Single agent execution
codecrew execute "@frontend create login component"

# Multiple agent execution (automatic parallel execution)
codecrew execute "@backend @frontend implement OAuth authentication"

# Using custom config file
codecrew execute --config ./production-agents.yaml "@devops deploy to production"
```

### All Available Commands
```bash
# Show comprehensive help and available commands (default behavior)
codecrew

# Run MCP server mode (for IDE integration)
codecrew mcp

# Project initialization - create agents.yaml and log directory
codecrew init [--config path] [--force]

# System health check - comprehensive diagnostics (includes live AI provider testing)
codecrew doctor [--config path]

# Agent queries - read-only analysis (pipeline support)
codecrew query "@agent analyze this code"

# Agent execution - real file creation and modification (pipeline support)
codecrew execute "@agent create new feature"
```

## 🔄 Agent Calling Patterns

### 1. Shared Tasks (Group Mentions)
```bash
# All agents work on the same task within their expertise areas
codecrew execute "@backend @frontend implement user authentication"
```
**Behavior:**
- `@backend`: Implements API, database, session management
- `@frontend`: Implements login forms, authentication state management, UI

### 2. Individual Tasks (Separate Mentions)
```bash
# Each agent works on different tasks simultaneously
codecrew execute "@backend create user API" "@frontend design login UI" "@devops setup OAuth server"
```
**Behavior:**
- `@backend`: Works on "create user API" task
- `@frontend`: Works on "design login UI" task
- `@devops`: Works on "setup OAuth server" task

### 3. Sequential Execution (Pipeline)
```bash
# Pass one agent's result to the next agent
codecrew execute "@backend create user API" | codecrew execute "@frontend create client code"
```
**Behavior:**
1. `@backend` creates API → outputs result
2. `@frontend` receives that result and creates client code

## 🚀 Real Usage Scenarios and Verified Examples

### 📦 **Getting Started with a Project (Live Implementation)**
```bash
# 1. Project initialization (actually implemented)
codecrew init
# ✅ agents.yaml generated
# ✅ .codecrew/logs directory created
# ✅ Default agent configuration completed

# 2. System health check (actually implemented)
codecrew doctor
# ✅ Configuration file validation
# ✅ AI CLI tools availability check
# ✅ Live AI response testing
# ✅ Performance and session status diagnostics

# 3. First test (actually working)
codecrew query "@claude hello world"
# ✅ Test query sent to Claude AI
```

### 🧪 **Verified File Creation Workflow**
```bash
# Actual test result: multiplication.js file creation success
codecrew execute "@claude create a simple multiplication function in JavaScript"
# ✅ Actual file creation confirmed
# ✅ Code quality verification completed
# ✅ Task logging recorded

# Parallel execution test (verified)
codecrew execute "@claude @gemini create different approaches to factorial calculation"
# ✅ Two AIs simultaneously provide different implementation approaches
# ✅ Performance metrics collected
# ✅ Execution time comparison analysis
```

### 🔄 **Pipeline Context Passing (Verified)**
```bash
# Step-by-step context passing test success
echo "Create a user authentication system" | codecrew execute "@backend design the API structure"
# ✅ stdin context passing confirmed
# ✅ Verified through context-test.txt file

# Complex pipeline (actually working)
codecrew query "@architect design user management system" | \
codecrew execute "@backend implement the designed system" | \
codecrew execute "@frontend create UI for the backend API"
# ✅ Each step's results passed as context to the next step
# ✅ Complete workflow successfully executed
```

### Development Workflow
```bash
# 1. Requirements analysis (multiple perspectives)
codecrew query "@product @ux @technical analyze user feedback about checkout process"

# 2. Architecture design
codecrew query "@architect design improved checkout system" | \

# 3. Security review
codecrew query "@security review checkout design for vulnerabilities" | \

# 4. Parallel implementation
codecrew execute "@backend @frontend @payment implement secure checkout"

# 5. Testing and deployment
codecrew execute "@tester create integration tests" | \
codecrew execute "@devops deploy to staging"
```

### Code Review Process
```bash
# Multiple experts simultaneously review current code
codecrew query "@developer show current payment processing code" | \
codecrew query "@security @performance @maintainability review this implementation"
```

### Bug Fix Workflow
```bash
# Problem diagnosis
codecrew query "@backend investigate database connection timeouts"

# Solution design
codecrew query "@architect @devops design database failover solution" | \

# Implementation and deployment
codecrew execute "@backend implement connection pooling" "@devops setup database clustering"
```

### Feature Development (Full Stack)
```bash
# Design phase
codecrew query "@architect design real-time notification system" | \

# Technology stack evaluation
codecrew query "@backend @frontend @mobile evaluate implementation options" | \

# Parallel implementation
codecrew execute "@backend create notification API" "@frontend add notification UI" "@mobile implement push notifications" | \

# Integration testing
codecrew execute "@tester create end-to-end notification tests"
```

## 🛠️ Technical Implementation Architecture (Real Code)

### 🏗️ **NestJS-based Module Architecture**

CodeCrew CLI is implemented with a scalable and maintainable NestJS architecture:

```typescript
// Core service structure
@Injectable()
export class InitHandler {
  constructor(
    private readonly taskManagementService: TaskManagementService,
    private readonly resultFormatterService: ResultFormatterService,
  ) {}

  async handle(options: InitOptions): Promise<{ success: boolean; message: string; taskId: string }> {
    // Actual implemented init logic
  }
}

@Injectable()
export class DoctorHandler {
  constructor(
    private readonly taskManagementService: TaskManagementService,
    private readonly parallelProcessingService: ParallelProcessingService,
    private readonly aiProviderService: AIProviderService,
  ) {}

  async handle(options: DoctorOptions): Promise<DiagnosticResult[]> {
    // Actual implemented diagnostic logic
  }
}
```

### 🔄 **stdin/stdout Pipeline System (Fully Implemented)**

Pipeline context passing that actually works in implementation:

```typescript
// src/utils/stdin-utils.ts (actually implemented)
export async function readStdin(): Promise<string | null> {
  if (process.stdin.isTTY) {
    return null; // Only recognize pipe input when not TTY
  }

  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      resolve(data.trim() || null);
    });

    // 5-second timeout to prevent infinite waiting
    const timeout = setTimeout(() => {
      reject(new Error('Stdin read timeout'));
    }, 5000);
  });
}

export function formatPipedContext(pipedContent: string): string {
  return `Previous step result:\n${pipedContent}\n\nPlease use this information as context for the current task.`;
}
```

### 🧪 **AI Provider Testing System (Actually Implemented)**

The doctor command actually tests AI providers:

```typescript
// DoctorHandler's actual AI testing logic
private async testAIProviders(configPath: string, taskId: string): Promise<DiagnosticResult[]> {
  const config = parse(readFileSync(configPath, 'utf8'));

  // Send actual test queries to each agent
  const testQueries = config.agents
    .filter((agent: any) => agent.inline?.provider)
    .map((agent: any) => ({
      agentId: agent.id,
      query: 'Hello, please respond with "OK" to confirm you are working.',
      context: 'System diagnostic test'
    }));

  // Execute parallel testing with 30-second timeout
  const results = await this.parallelProcessingService.queryAgentsParallel(testQueries, {
    timeout: 30000
  });

  // Analyze results and generate diagnostic report
  results.results.forEach((result, index) => {
    const agentId = testQueries[index].agentId;
    // Detailed analysis of success/failure, session limits, etc.
  });
}
```

### 📊 **Task Management and Logging System**

All operations are tracked and recorded:

```typescript
// Actually implemented task management
export class TaskManagementService {
  createTask(options: { type: string; command: string; options: any }): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Create task logs in .codecrew/logs
    return taskId;
  }

  addTaskLog(taskId: string, log: { level: string; message: string }): void {
    // Real-time log recording
  }

  completeTask(taskId: string, result: any, success: boolean): void {
    // Task completion processing and final result storage
  }
}
```

### yargs Command Structure
```typescript
yargs
  .option('config', {
    alias: 'c',
    type: 'string',
    description: 'Path to agents configuration file',
    default: 'agents.yaml'
  })
  .command('query <agents...>', 'Query agents for analysis', {}, handleQuery)
  .command('execute <agents...>', 'Execute tasks with agents', {}, handleExecute)
  .command('doctor', 'Check AI providers status', {}, handleDoctor)
  .command('init', 'Initialize codecrew project', {}, handleInit)
```

### Agent Parsing Logic
```typescript
function parseCommand(args: string[]) {
  if (args.length === 1) {
    // "@backend @frontend shared task" or "@backend individual task"
    return parseGroupTask(args[0]);
  } else {
    // "@backend task1" "@frontend task2" "@mobile task3"
    return parseIndividualTasks(args);
  }
}
```

### 🚀 **Performance Optimization and Parallel Processing**

```typescript
// Actually implemented parallel processing system
export class ParallelProcessingService {
  async executeAgentParallel(tasks: ExecuteTask[]): Promise<ParallelExecuteResult> {
    const startTime = Date.now();

    // Parallel execution with Promise.allSettled
    const results = await Promise.allSettled(
      tasks.map(task => this.executeAgent(task))
    );

    // Collect performance metrics
    const summary = {
      total: tasks.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      totalDuration: Date.now() - startTime,
      averageDuration: (Date.now() - startTime) / tasks.length
    };

    return { results, summary, success: summary.failed === 0 };
  }
}
```

## 🔗 Integration with Existing MCP Tools

### Single Execution
- `queryAgent` → Single agent query
- `executeAgent` → Single agent execution

### Parallel Execution
- `queryAgentParallel` → Multiple agent simultaneous queries
- `executeAgentParallel` → Multiple agent simultaneous execution

### Other Tools
- `checkAIProviders` → `doctor` command
- `listAgents` → Agent list verification

## 📚 Command Reference

### Basic Syntax
```bash
# Single agent
codecrew <command> "@agent task description"

# Shared task (group mention)
codecrew <command> "@agent1 @agent2 @agent3 shared task"

# Individual tasks (separate mentions)
codecrew <command> "@agent1 task1" "@agent2 task2" "@agent3 task3"

# Pipeline (sequential execution)
codecrew <command> "@agent1 task1" | codecrew <command> "@agent2 task2"

# Using custom configuration file
codecrew <command> --config ./custom-agents.yaml "@agent task"
```

### Configuration File Search Order
```bash
# 1. Use specified file if --config option is provided
codecrew query --config ./team-config.yaml "@backend analyze"

# 2. Automatically use agents.yaml in current directory if available
codecrew query "@backend analyze"  # Auto-detect ./agents.yaml

# 3. Error if no configuration file found
# Error: No agents configuration file found. Run 'codecrew init' to create one.
```

### Configuration File Options
```bash
# Default configuration file (agents.yaml in current directory)
codecrew query "@backend analyze system"

# Specify custom configuration file
codecrew execute --config ./team-backend.yaml "@backend @database optimize queries"

# Configuration file from different path
codecrew execute --config /path/to/production-agents.yaml "@devops deploy application"

# Relative path for project-specific configuration
codecrew query --config ../shared-agents.yaml "@architect review microservices"
```

### Configuration File Priority
1. File specified with `--config` option
2. `agents.yaml` in current directory (default)
3. Error if no configuration file found


## 🎯 Implementation Status

✅ **All Core Features Implemented**

1. **CLI Core Implementation** - yargs structure and parsing logic ✅
2. **Agent Commands** - query/execute integration ✅
3. **Sub-commands** - doctor, init implementation ✅
4. **Mode Separation** - CLI vs MCP server ✅
5. **Help System** - Comprehensive command overview ✅

---

> **💡 Core Philosophy**: A natural and intuitive tool where multiple specialized AI agents collaborate to solve complex development tasks