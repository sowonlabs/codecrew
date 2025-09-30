import { Logger } from '@nestjs/common';
import { CliOptions } from '../cli-options';
import { CodeCrewTool } from '../codecrew.tool';
import { readStdin, formatPipedContext } from '../utils/stdin-utils';

const logger = new Logger('ExecuteHandler');

/**
 * Handle execute command: codecrew execute "@agent task"
 * This will be implemented by the development team
 */
export async function handleExecute(app: any, args: CliOptions) {
  logger.log('Execute command received');
  
  if (!args.execute) {
    logger.error('No execute task provided');
    console.log('Usage: codecrew execute "<task>"');
    console.log('Example: codecrew execute "@frontend @backend implement login"');
    process.exit(1);
  }

  try {
    // Parse execute message for agent mentions
    const executeMessage = Array.isArray(args.execute) ? args.execute.join(' ') : args.execute || '';
    console.log(`⚡ Processing execute: ${executeMessage}`);
    
    // Parse mentions using simple regex (same as query.handler)
    const mentionRegex = /@([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const agents = [...executeMessage.matchAll(mentionRegex)].map(match => match[1]);
    const task = executeMessage.replace(mentionRegex, '').trim();
    
    if (agents.length === 0) {
      console.log('❌ No agents mentioned. Use @agent syntax (e.g., @gemini @copilot)');
      process.exit(1);
    }
    
    if (!task) {
      console.log('❌ No task message found after removing mentions');
      console.log('Please provide a task description along with agent mentions');
      process.exit(1);
    }
    
    // Check for piped input (stdin) and convert to context
    const pipedInput = await readStdin();
    const contextFromPipe = pipedInput ? formatPipedContext(pipedInput) : undefined;
    
    if (pipedInput) {
      console.log('📥 Received piped input - using as context');
    }
    
    console.log(`📋 Task: ${task}`);
    console.log(`🤖 Agents: ${agents.map(a => `@${a}`).join(' ')}`);
    console.log('');
    
    // Get CodeCrewTool from app context
    const codeCrewTool = app.get(CodeCrewTool);
    
    if (agents.length === 1) {
      // Single agent execution
      console.log(`⚡ Executing task with single agent: @${agents[0]}`);
      console.log('────────────────────────────────────────────────────────────');
      console.log('');
      
      const result = await codeCrewTool.executeAgent({
        agentId: agents[0],
        task: task,
        projectPath: process.cwd(),
        context: contextFromPipe
      });
      
      // Format and display result
      const status = result.success ? '🟢 Status: Success' : '🔴 Status: Failed';
      console.log(`📊 Results from @${agents[0]}:`);
      console.log('════════════════════════════════════════════════════════════');
      console.log(status);
      console.log(`🤖 Provider: ${result.provider}`);
      console.log(`📝 Task ID: ${result.taskId}`);
      console.log('');
      console.log(`📄 Response:`);
      console.log('────────────────────────────────────────');
      console.log(result.success ? result.response : `❌ Error: ${result.error}`);
      console.log('');
      console.log(`📁 Working Directory: ${result.workingDirectory}`);
      console.log('');
      console.log(result.success ? '✅ Execution completed successfully' : '❌ Execution failed');
      
    } else {
      // Multiple agents execution
      console.log(`🚀 Executing task with ${agents.length} agents in parallel:`);
      agents.forEach((agent, index) => {
        console.log(`   ${index + 1}. @${agent}`);
      });
      console.log('────────────────────────────────────────────────────────────');
      console.log('');
      
      const tasks = agents.map(agentId => ({
        agentId,
        task,
        projectPath: process.cwd(),
        context: contextFromPipe
      }));
      
      const result = await codeCrewTool.executeAgentParallel({ tasks });
      
      // Format and display results
      console.log(`📊 Parallel Execution Results:`);
      console.log('════════════════════════════════════════════════════════════');
      console.log(`📈 Summary:`);
      console.log(`   • Total Tasks: ${result.summary.total}`);
      console.log(`   • Successful: ${result.summary.successful}`);
      console.log(`   • Failed: ${result.summary.failed}`);
      console.log(`   • Total Duration: ${result.summary.totalDuration}ms`);
      console.log(`   • Average Duration: ${result.summary.averageDuration}ms`);
      console.log('');
      console.log('');
      
      // Display individual results
      result.results.forEach((agentResult: any, index: number) => {
        const status = agentResult.success ? '🟢 Status: Success' : '🔴 Status: Failed';
        console.log(`${index + 1}. Agent: @${agentResult.agent} (${agentResult.provider}) - ${agentResult.duration}ms`);
        console.log(`   📋 Task ID: ${agentResult.taskId}`);
        console.log('──────────────────────────────────────────────────');
        console.log(status);
        console.log(`📄 Response:`);
        console.log(agentResult.success ? agentResult.response : `❌ Error: ${agentResult.error}`);
        if (index < result.results.length - 1) {
          console.log('');
        }
      });
      
      console.log('');
      console.log(`⚡ Performance Insights:`);
      console.log(`   • Fastest Task: ${Math.min(...result.results.map((r: any) => r.duration))}ms`);
      console.log(`   • Slowest Task: ${Math.max(...result.results.map((r: any) => r.duration))}ms`);
      const timeSaved = result.summary.totalDuration - Math.max(...result.results.map((r: any) => r.duration));
      console.log(`   • Time Saved: ${timeSaved}ms (vs sequential)`);
      console.log('');
      console.log(result.success ? '✅ Execution completed successfully' : '❌ Execution failed');
    }
    
  } catch (error) {
    logger.error(`Execute failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}