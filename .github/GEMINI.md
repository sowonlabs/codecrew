# Gemini Assistant Instructions for CodeCrew

This document provides instructions for the Gemini Assistant to effectively contribute to the CodeCrew project.

## 1. Project Overview

CodeCrew is a multi-AI agent collaboration platform for development tasks, built on the Model Context Protocol (MCP). It integrates various AI providers like Gemini, Claude, and Copilot through a unified, service-oriented architecture in a NestJS environment. Your primary role is to assist in developing, refactoring, and debugging this system.

**Core Goal:** Understand and leverage the refactored architecture to provide accurate, efficient, and context-aware implementation guidance.

---

## 2. Refactored Service-Oriented Architecture

The system is now organized into a clear service layer. When implementing features or fixing bugs, you **must** adhere to this separation of concerns.

### Key Services

#### a. `TaskManagementService` (`src/services/task-management.service.ts`)
- **Purpose:** The central nervous system for all operations. It creates, tracks, and logs every task in the system.
- **Key Feature: `taskId`**. Every request, whether from the CLI or MCP, is assigned a unique `taskId` upon creation.
- **Your Role:**
    - When creating new functionality, ensure the first step is always to create a task using `taskManagementService.createTask()`.
    - Use the `taskId` to log important steps, errors, and results via `taskManagementService.addTaskLog()`. This is non-negotiable for traceability.
    - When a task is finished, mark it as complete with `taskManagementService.completeTask()`.

#### b. `ParallelProcessingService` (`src/services/parallel-processing.service.ts`)
- **Purpose:** The workhorse for executing tasks. It manages concurrent operations, handling multiple AI agent requests in parallel.
- **Key Feature:** Executes a set of requests, managing concurrency, timeouts, and fail-fast logic. It uses the `TaskManagementService` to create and track the sub-tasks it runs.
- **Your Role:**
    - For any feature involving multiple agents (e.g., a query with multiple `@mentions`), use `parallelProcessingService.executeParallel()`.
    - Do not implement custom parallel logic. Rely on this service to handle the complexities of concurrency.
    - Understand that this service is the primary consumer of the `AIService`, which abstracts the different AI providers.

#### c. `ResultFormatterService` (`src/services/result-formatter.service.ts`)
- **Purpose:** Standardizes output for different interfaces. A single internal result can be formatted for either the command-line (CLI) or the MCP client (like VS Code).
- **Key Feature:** Provides `formatSingleResult` and `formatParallelResult` methods, each returning an object with `cli` and `mcp` versions of the output.
- **Your Role:**
    - After a task is complete, use this service to format the result before sending it back to the user.
    - This ensures a consistent user experience across all interfaces. Do not create custom, one-off formatting logic in handlers or controllers.

---

## 3. The `taskId` Tracking System

The `taskId` is the single most important concept for maintaining state and traceability.

- **Lifecycle of a `taskId`:**
    1.  A request comes into an entry point (CLI or MCP).
    2.  The handler calls `TaskManagementService.createTask()` to get a new `taskId`.
    3.  This `taskId` is passed down through all subsequent service calls (`ParallelProcessingService`, `AIService`, etc.).
    4.  Each service uses the `taskId` to log its progress (`taskManagementService.addTaskLog(taskId, ...)`).
    5.  The final result is associated with the `taskId` upon completion.
    6.  All logs are stored in `.codecrew/logs/{taskId}.log`.

- **Your Role:**
    - **ALWAYS** propagate the `taskId`. If you are adding a new function or service in the execution flow, it **must** accept the `taskId` as a parameter and pass it to any other services it calls.
    - When debugging, the first question you should ask is, "What is the `taskId`?" The corresponding log file will contain the full execution trace.

---

## 4. Interface Integration: CLI and MCP

The system has two main entry points, but they share the same underlying services.

#### a. CLI (`src/cli/`)
- **Entry Points:** `query.handler.ts`, `execute.handler.ts`.
- **Flow:** The CLI parser determines the command and arguments, then calls the appropriate handler. The handler immediately creates a task with `TaskManagementService` and then uses other services to perform the work.
- **Example (`query.handler.ts`):** A user types `node dist/main.js query "@gemini @claude analyze this"`. The handler parses the `@mentions`, creates a main task, and then uses `ParallelProcessingService` to query both agents. The results are then formatted by `ResultFormatterService` for the console.

#### b. MCP (`src/mcp.controller.ts`)
- **Entry Point:** The `McpController` receives JSON-RPC requests from a client like VS Code.
- **Flow:** It uses the `@sowonai/nestjs-mcp-adapter` to handle the MCP boilerplate. The core logic is delegated to tools, which are NestJS providers that use the exact same services (`TaskManagementService`, etc.) as the CLI.
- **Your Role:** Recognize that the business logic is **shared**. A feature implemented for a CLI command should be available as an MCP tool, and both should use the same core services. The only difference is the final presentation layer, which is handled by `ResultFormatterService`.

---

## 5. Step-by-Step Guidance for Common Tasks

#### Task: Adding a new feature that involves an AI agent.

1.  **Identify the Entry Point:** Will this be triggered from the CLI, MCP, or both?
2.  **Create the Task:** In the handler (for CLI) or tool (for MCP), immediately call `this.taskManagementService.createTask(...)` to get a `taskId`.
3.  **Process the Request:**
    - For a single agent, call `this.aiService.queryAI(...)` or `this.aiService.executeAI(...)`, passing the `taskId`.
    - For multiple agents, prepare a list of requests and use `this.parallelProcessingService.executeParallel(...)`. The `taskId` will be managed by the service.
4.  **Format the Result:** Use `this.resultFormatterService.formatSingleResult(...)` or `formatParallelResult(...)` to generate the output.
5.  **Return the Response:** Send the `cli` or `mcp` formatted string back to the user.
6.  **Log Everything:** Throughout the process, add meaningful logs using `this.taskManagementService.addTaskLog(taskId, ...)`.

#### Best Practices to Follow:
- **Trust the Services:** Do not re-implement logic that already exists in a service.
- **Propagate `taskId`:** Ensure it is passed through every layer of the call stack.
- **Separate Concerns:** Handlers and controllers are for routing and input validation. `AIService` is for interacting with AIs. `ParallelProcessingService` is for concurrency. `TaskManagementService` is for state and logging. `ResultFormatterService` is for presentation.
- **Write Tests:** All new logic should be accompanied by unit tests that mock the dependent services.

#### Potential Issues to Watch For:
- **Missing `taskId`:** A part of the system not logging correctly is almost always due to a `taskId` not being passed down.
- **Inconsistent Output:** If the CLI and MCP show different results for the same action, it's likely that `ResultFormatterService` is not being used correctly.
- **Concurrency Bugs:** Avoid `Promise.all` or other manual parallel patterns. Use `ParallelProcessingService` to prevent common issues like unhandled rejections or resource exhaustion.

### Agent Specialization Guidelines

**🎯 When to Use Each Agent:**

**@claude - Complex Reasoning & Architecture:**
- System design and architecture decisions
- Complex problem analysis and breakdown
- Security considerations and threat modeling
- Code review for design patterns and best practices
- Documentation and explanation of complex concepts

**@copilot - Implementation & Best Practices:**
- Code implementation and file creation
- Testing strategy and test code generation
- Code refactoring and optimization
- Bug fixes and debugging assistance
- Following language-specific best practices

**@gemini - Performance & Data Analysis:**
- Performance optimization and bottleneck analysis
- Mathematical and algorithmic problem solving
- Data structure and algorithm recommendations
- Resource usage optimization
- Quantitative analysis and benchmarking

### MCP Integration Patterns

**VS Code MCP Usage:**
```
# In VS Code with CodeCrew MCP installed
User: "I need to implement a complex search feature"

Assistant automatically uses:
- executeAgentParallel([
    { agentId: "claude", task: "Design search architecture with indexing strategy" },
    { agentId: "copilot", task: "Implement search API endpoints and frontend components" },
    { agentId: "gemini", task: "Optimize search algorithms for performance" }
  ])
```

## Integration Notes

This project integrates with VS Code through the Model Context Protocol. When working with MCP-related code:
- Follow MCP protocol specifications strictly
- Test with actual VS Code MCP client
- Validate tool schemas match expected formats
- Handle VS Code-specific requirements and limitations