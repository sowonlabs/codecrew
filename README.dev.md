# CodeCrew MCP Server - Developer Guide

## 🏗 Project Structure

```
codecrew/
├── src/
│   ├── ai.service.ts          # AI CLI Tool Integration Service
│   ├── project.service.ts     # Project Analysis Service
│   ├── code-cli.tool.ts       # MCP Tool Definition (codecrew)
│   ├── app.module.ts          # NestJS App Module
│   ├── main.ts                # Main Entrypoint
│   ├── cli-options.ts         # CLI Option Parsing
│   ├── constants.ts           # Constant Definitions
│   ├── stderr.logger.ts       # Logger Configuration
│   └── mcp.controller.ts      # MCP Controller
├── tests/
│   ├── ai.service.test.ts     # AI Service Unit Tests
│   ├── integration.test.ts    # Integration Tests
│   └── setup.ts               # Test Setup
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── nest-cli.json
├── inspector.config.json
└── README.md
```

## 🔄 Architecture

### 1. AI Service (ai.service.ts)
- Executes Claude CLI and Gemini CLI commands
- Manages asynchronous processes
- Handles errors and timeouts

### 2. Project Service (project.service.ts)  
- Analyzes project structure
- Navigates the file system
- Detects languages/frameworks
- Applies .gitignore rules

### 3. CodeCrew Tool (code-cli.tool.ts)
- Implements the MCP tool interface
- Coordinates the AI Service and Project Service
- Converts user requests into AI prompts

## 🛠 Development Commands

```bash
# Start development server (STDIO mode)
npm run dev

# Start development server (HTTP mode, for debugging)  
npm run debug

# Run in installation mode
npm run dev:install

# Build
npm run build

# Test
npm test
npm run test:watch
npm run test:ui

# Test with MCP Inspector
npm run inspector

# Test CLI tool
npm run cli
npm run cli:log
```

## 🧪 How to Test During Development

### 1. Using MCP Inspector
```bash
npm run inspector
```
Access `http://localhost:5173` in your browser to test the tools.

### 2. Direct CLI Testing
```bash
# Check installation info
npm run cli

# Run with logs
npm run cli:log
```

### 3. Unit Tests
```bash
npm test
```

## 🔧 Key Configuration Files

### package.json
- Dependencies: NestJS, MCP SDK, AI CLI integration libraries
- Scripts: Development, build, and test commands
- Automatically adds shebang on build

### tsconfig.json
- CommonJS module system
- ES2020 target
- Decorator support

### vitest.config.ts
- Node.js environment for tests
- 30-second timeout
- Automatically loads `setup.ts` file

## 🐛 Debugging Guide

### 1. Debugging AI CLI Calls
```typescript
// Check logs in ai.service.ts
this.logger.log(`Executing Claude CLI: ${command}`);
```

### 2. Debugging Project Analysis
```typescript  
// Check logs in project.service.ts
this.logger.log(`Found ${filteredFiles.length} files matching patterns`);
```

### 3. Debugging MCP Tools
```bash
# Run in HTTP mode for network debugging 
npm run debug
```

## 📝 Adding a New Tool

### 1. Add an MCP Tool Method
```typescript
@McpTool({
  server: SERVER_NAME,
  name: `${PREFIX_TOOL_NAME}newTool`,
  description: 'Description of the new tool',
  input: {
    // Define zod schema
  }
})
async newTool(params: NewToolParams) {
  // Implementation
}
```

### 2. Write Test Code
```typescript
describe('newTool', () => {
  it('should work correctly', async () => {
    // Implement test
  });
});
```

## ⚠️ Important Notes

### 1. AI CLI Dependencies
- Claude CLI and Gemini CLI must be installed on the system.
- The PATH environment variable needs to be configured correctly.
- Verify that API keys are set up.

### 2. File Size Limits
- Default limit is 1MB.
- Be mindful of memory usage when processing large files.

### 3. Asynchronous Processing
- CLI command execution is asynchronous.
- Timeout is set (default is 30 seconds).
- Error handling is mandatory.

### 4. Security Considerations
- Validate user input.
- Validate file paths (to prevent path traversal).
- Prevent command injection.

## 🚀 Deployment Checklist

### 1. Verify Build
```bash
npm run build
ls -la dist/
```

### 2. Test Package
```bash
npm pack
npm install -g sowonlabs-codecrew-*.tgz
```

### 3. Version Management
```json
{
  "version": "0.1.0" // Update version in package.json
}
```

## 📚 References

- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Vitest Documentation](https://vitest.dev/)
- [Fast Glob Documentation](https://github.com/mrmlnc/fast-glob)