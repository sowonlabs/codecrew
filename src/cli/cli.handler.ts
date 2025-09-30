import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CliOptions } from '../cli-options';
import { StderrLogger } from '../stderr.logger';

const logger = new Logger('CLIHandler');

/**
 * Main CLI handler that routes commands to appropriate handlers
 */
export class CLIHandler {
  private app: any;

  async initialize(args: CliOptions) {
    // Set config file path for CodeCrewTool to use
    // Priority: --config > AGENTS_CONFIG env var > ./agents.yaml
    const configPath = args.config || process.env.AGENTS_CONFIG || './agents.yaml';
    process.env.AGENTS_CONFIG = configPath;
    
    logger.log(`Using agents config: ${configPath}`);
    
    // Create NestJS context for CLI mode
    this.app = await NestFactory.createApplicationContext(AppModule.forRoot(args), {
      logger: args.log ? new StderrLogger('CodeCrewCLI', { timestamp: true }) : false,
    });
  }

  async handleCommand(args: CliOptions) {
    try {
      await this.initialize(args);

      switch (args.command) {
        case 'query':
          const { handleQuery } = await import('./query.handler');
          await handleQuery(this.app, args);
          break;
        
        case 'execute':
          const { handleExecute } = await import('./execute.handler');
          await handleExecute(this.app, args);
          break;
        
        case 'doctor':
          const { handleDoctor } = await import('./doctor.handler');
          await handleDoctor(this.app, args);
          break;
        
        default:
          logger.error(`Unknown command: ${args.command}`);
          this.showHelp();
          process.exit(1);
      }

      await this.app.close();
      process.exit(0);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`CLI command failed: ${errorMessage}`);
      if (this.app) {
        await this.app.close();
      }
      process.exit(1);
    }
  }

  private showHelp() {
    console.log(`
=================================
CodeCrew CLI Help
=================================

Usage:
  codecrew <command> [options]

Commands:
  query <message>     Query agents with a message (supports @agent mentions)
  execute <task>      Execute a task with agents (supports @agent mentions)  
  doctor             Check AI provider status

Examples:
  codecrew query "@backend analyze this API endpoint"
  codecrew execute "@frontend @backend implement login feature"
  codecrew doctor

Options:
  -c, --config <file>  Path to agents configuration file (default: agents.yaml)
  --log               Enable detailed logging
  -h, --help          Show this help message
    `);
  }
}