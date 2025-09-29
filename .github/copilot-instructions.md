# CodeCrew MCP Server - GitHub Copilot Instructions

## Project Overview

CodeCrew is a Model Context Protocol (MCP) server that enables multi-AI agent collaboration for development tasks. The project integrates multiple AI providers (Claude CLI, Gemini CLI, GitHub Copilot CLI) through a unified interface for team-based coding assistance.


## Important

- 복잡한 작업이 필요한 경우에는 MCP 도구 에이전트를 활용하도록 하세요. (listAgents, queryAgentParallel, executeAgentParallel 병렬 실행 가능)

## Architecture Guidelines

### Core Components
- **NestJS Framework**: Use NestJS patterns and decorators for all new features
- **AI Provider Interface**: Extend `BaseAiProvider` for new AI integrations
- **Agent System**: Configure agents through `agents.yaml` with dynamic CLI options
- **TypeScript**: Maintain strict typing throughout the codebase

### File Structure
- `src/providers/`: AI provider implementations
- `src/utils/`: Utility functions (config, error handling, string manipulation)
- `agents.yaml`: Agent configuration with CLI options
- `tests/`: Unit and integration tests

## Coding Standards

### TypeScript Conventions
- Use strict type definitions for all functions and classes
- Prefer interfaces over type aliases for object shapes
- Use enum values for constants and configuration options
- Implement proper error handling with custom error types

### Code Quality
- Write comprehensive JSDoc comments for all public methods
- Use descriptive variable and function names
- Maintain single responsibility principle for classes and functions
- Implement proper logging using the stderr logger service

### Testing Requirements
- Write unit tests for all new features in the `tests/` directory
- Use Vitest as the testing framework
- Mock external dependencies (AI providers, file system operations)
- Maintain test coverage for critical functionality

## AI Provider Integration

### Adding New AI Providers
- Extend the `BaseAiProvider` abstract class
- Implement the `IAiProvider` interface
- Add provider configuration to the providers module
- Update the AI service to include the new provider

### CLI Integration Pattern
```typescript
// Use this pattern for CLI command execution
const result = await this.executeCommand(command, options);
if (!result.success) {
  throw new Error(`Provider failed: ${result.error}`);
}
```

## Agent Configuration

### agents.yaml Structure
- Each agent must have: `name`, `role`, `provider`, `description`
- Use the `options[]` array for dynamic CLI configuration
- **Security Warning**: Be cautious with dangerous options like `--force`, `--delete`, `--overwrite`
- Provide clear descriptions for all agent capabilities

### Safe CLI Options Examples
```yaml
options:
  - "--verbose"           # Safe: Increases output detail
  - "--dry-run"          # Safe: Shows what would happen without executing
  - "--help"             # Safe: Shows help information
  
# Avoid these dangerous options without explicit user confirmation:
# - "--force"            # Dangerous: Bypasses safety checks
# - "--delete"           # Dangerous: Removes files/resources
# - "--overwrite"        # Dangerous: Replaces existing files
```

## Development Workflow

### Before Implementing Features
1. Review existing provider implementations for patterns
2. Check if similar functionality exists in utils/
3. Consider configuration options in agents.yaml
4. Plan error handling and logging strategy

### Code Implementation
- Follow NestJS dependency injection patterns
- Use the project's error utilities for consistent error handling
- Implement proper input validation
- Add appropriate logging statements

### Testing Strategy
- Write tests before implementing complex logic
- Test both success and failure scenarios
- Mock external dependencies appropriately
- Verify configuration parsing and validation

## MCP Server Specifics

### Tool Implementation
- Follow MCP protocol standards for tool definitions
- Provide clear tool descriptions and parameter schemas
- Implement proper error responses for invalid requests
- Use structured logging for debugging MCP interactions

### Agent Execution
- Validate agent configurations before execution
- Sanitize CLI options to prevent security issues
- Provide clear feedback on execution status
- Handle timeouts and resource limits appropriately

## Documentation Standards

### Code Documentation
- Document all public APIs with JSDoc
- Include parameter types and return value descriptions
- Provide usage examples for complex functions
- Document configuration options and their effects

### README Updates
- Keep installation instructions current
- Document new agent types and capabilities
- Update troubleshooting sections for common issues
- Maintain accurate CLI examples

## Security Considerations

### CLI Option Safety
- Validate all CLI options against allowlists
- Warn users about potentially dangerous operations
- Implement confirmation prompts for destructive actions
- Log security-relevant operations for audit trails

### Input Validation
- Sanitize all user inputs before processing
- Validate file paths to prevent directory traversal
- Check permissions before file operations
- Implement rate limiting for resource-intensive operations

## Common Patterns

### Error Handling
```typescript
try {
  const result = await dangerousOperation();
  return { success: true, data: result };
} catch (error) {
  this.logger.error('Operation failed', error);
  return { success: false, error: error.message };
}
```

### Configuration Loading
```typescript
const config = this.configService.loadAgentConfig(agentId);
if (!config) {
  throw new Error(`Agent configuration not found: ${agentId}`);
}
```

### CLI Command Building
```typescript
const command = this.buildCommand(baseCommand, sanitizedOptions);
const result = await this.executeWithTimeout(command, timeoutMs);
```

### CLI 명령어
아래 명령어를 활용해서 도움말을 확인할 수 있습니다:
```bash
claude --help
gemini --help
copilot --help
```

## Integration Notes

This project integrates with VS Code through the Model Context Protocol. When working with MCP-related code:
- Follow MCP protocol specifications strictly
- Test with actual VS Code MCP client
- Validate tool schemas match expected formats
- Handle VS Code-specific requirements and limitations