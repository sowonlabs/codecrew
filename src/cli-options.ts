import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export interface CliOptions {
  install: boolean;
  log: boolean;
  protocol: 'STDIO' | 'HTTP';
  port: number;
  allowTool: string[]; // Support for --allow-tool=terminal,files,web
  // API keys removed for security - use environment variables or CLI tool authentication instead
}

export function parseCliOptions(): CliOptions {
  const parsed = yargs(hideBin(process.argv))
    .option('install', {
      type: 'boolean',
      default: false,
      description: 'Run installation and setup process'
    })
    .option('log', {
      type: 'boolean',
      default: false,
      description: 'Enable detailed logging'
    })
    .option('protocol', {
      choices: ['STDIO', 'HTTP'] as const,
      default: 'STDIO' as const,
      description: 'MCP protocol to use'
    })
    .option('port', {
      type: 'number',
      default: 3000,
      description: 'Port for HTTP protocol (if used)'
    })
    .option('allow-tool', {
      type: 'array',
      default: [],
      description: 'Allowed tools for Copilot agent (e.g., terminal,files,web)',
      coerce: (value: string | string[]) => {
        if (typeof value === 'string') {
          return value.split(',').map(tool => tool.trim());
        }
        return value || [];
      }
    })
    // API key options removed for security
    // Use environment variables or CLI tool authentication instead
    .parseSync();

  return {
    install: parsed.install,
    log: parsed.log,
    protocol: parsed.protocol as 'STDIO' | 'HTTP',
    port: parsed.port,
    allowTool: parsed['allow-tool'] as string[] || []
  };
}