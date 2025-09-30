import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export interface CliOptions {
  install: boolean;
  log: boolean;
  protocol: 'STDIO' | 'HTTP';
  port: number;
  allowTool: string[]; // Support for --allow-tool=terminal,files,web
  // CLI commands
  command?: string;
  query?: string | string[];
  execute?: string | string[];
  doctor?: boolean;
  config?: string;
  // API keys removed for security - use environment variables or CLI tool authentication instead
}

export function parseCliOptions(): CliOptions {
  const parsed = yargs(hideBin(process.argv))
    .command('query [message...]', 'Query agents with a message', (yargs) => {
      yargs.positional('message', {
        description: 'Message to send to agents (supports @agent mentions). Multiple arguments will be joined.',
        type: 'string',
        array: true
      });
    })
    .command('execute [task...]', 'Execute a task with agents', (yargs) => {
      yargs.positional('task', {
        description: 'Task to execute with agents (supports @agent mentions). Multiple arguments will be joined.',
        type: 'string',
        array: true
      });
    })
    .command('doctor', 'Check AI provider status', () => {})
    .command('init', 'Initialize CodeCrew project', () => {})
    .command('mcp', 'Start MCP server for IDE integration', () => {})
    .command('help', 'Show help', () => {})
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
    .option('config', {
      alias: 'c',
      type: 'string',
      default: 'agents.yaml',
      description: 'Path to agents configuration file'
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
    .help(false)
    .parseSync();

  return {
    install: parsed.install,
    log: parsed.log,
    protocol: parsed.protocol as 'STDIO' | 'HTTP',
    port: parsed.port,
    allowTool: parsed['allow-tool'] as string[] || [],
    command: parsed._[0] as string,
    query: Array.isArray(parsed.message) ? parsed.message.join(' ') : parsed.message as string,
    execute: Array.isArray(parsed.task) ? parsed.task.join(' ') : parsed.task as string,
    doctor: parsed._[0] === 'doctor',
    config: parsed.config
  };
}