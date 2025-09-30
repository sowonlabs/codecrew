import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StdioExpressAdapter } from '@sowonai/nestjs-mcp-adapter';
import { Logger } from '@nestjs/common';
import { parseCliOptions } from "./cli-options";
import { StderrLogger } from './stderr.logger';
import { SERVER_NAME } from './constants';
import { getErrorMessage, getErrorStack } from './utils/error-utils';
import { CLIHandler } from './cli/cli.handler';

const logger = new Logger('Bootstrap');
const args = parseCliOptions();

async function cli() {
  try {
    if (args.install) {
      logger.log('Installation mode - CodeCrew MCP Server setup');
      
      const app = await NestFactory.createApplicationContext(AppModule.forRoot(args), {
        logger: args.log ? new StderrLogger('CodeCrewInstall', { timestamp: true }) : false,
      });
      
      // Output simple installation information
      console.log(`
=================================
CodeCrew MCP Server Setup
=================================

This MCP server provides AI-powered code analysis tools using Claude CLI and Gemini CLI.

Prerequisites:
- Install Claude CLI: Follow the official installation guide for claude-cli
- Install Gemini CLI: Follow the official installation guide for gemini-cli

MCP Server Configuration:
Add this to your MCP client configuration:

{
  "mcpServers": {
    "${SERVER_NAME}": {
      "command": "npx",
      "args": ["@sowonlabs/codecrew"]
    }
  }
}

Available Tools:
- analyzeProject: AI-powered project analysis
- reviewCode: Code review with AI
- exploreCodebase: Codebase exploration and analysis  
- checkAIProviders: Check AI CLI tool availability

Environment Variables (optional):
- Set working directory and other preferences as needed

Setup completed successfully!
=================================
      `);
      
      await app.close();
      process.exit(0);
    }
  } catch (error) {
    logger.error(`Installation failed: ${getErrorMessage(error)}`, getErrorStack(error));
    process.exit(1);
  }
}

async function bootstrap() {
  try {
    let app;
    let adapter: StdioExpressAdapter;

    if (args.protocol === 'HTTP') {
      app = await NestFactory.create(AppModule.forRoot(args), {
        logger: args.log ? ['error', 'warn', 'debug', 'log'] : false
      });
    } else {
      adapter = new StdioExpressAdapter('/mcp');
      app = await NestFactory.create(AppModule.forRoot(args), adapter, {
        logger: args.log ? new StderrLogger('CodeCrew', { timestamp: true }) : false,
      });
    }

    await app.init();
    await app.listen(args.port);

    process.on('uncaughtException', (err) => {
      logger.error('Unexpected error occurred:', err);
    });

    const cleanup = async () => {
      await app.close();
      if (adapter) {
        await adapter.close();
      }
    }

    process.on('SIGTERM', async () => {
      logger.log('Shutting down application...');
      await cleanup();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.log('Shutting down application...');
      await cleanup();
      process.exit(0);
    });
    
    logger.log('Code CLI MCP Server initialized successfully');
    return app;

  } catch (error) {
    logger.error(`Bootstrap failed: ${getErrorMessage(error)}`, getErrorStack(error));
    process.exit(1);
  }
}

// Check CLI mode and execute
if (args.install) {
  cli();
} else if (args.command) {
  // Handle CLI commands
  const cliHandler = new CLIHandler();
  cliHandler.handleCommand(args);
} else {
  bootstrap();
}