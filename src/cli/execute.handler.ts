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
    console.log('Example (parallel): codecrew execute "@claude task1" "@claude task2"');
    process.exit(1);
  }

  try {
    // Get execute input - support both single string and array of separate tasks
    const executeInput = Array.isArray(args.execute) ? args.execute : [args.execute];

    // Check for piped input (stdin) and convert to context
    const pipedInput = await readStdin();
    const contextFromPipe = pipedInput ? formatPipedContext(pipedInput) : undefined;

    if (pipedInput) {
      console.log('📥 Received piped input - using as context');
    }

    // Get CodeCrewTool from app context
    const codeCrewTool = app.get(CodeCrewTool);

    // Parse each execute argument separately
    interface ParsedTask {
      agentId: string;
      task: string;
    }

    const parsedTasks: ParsedTask[] = [];
    const mentionRegex = /@([a-zA-Z_][a-zA-Z0-9_]*)/;

    for (const taskStr of executeInput) {
      const match = taskStr.match(mentionRegex);
      if (match && match[1]) {
        const agentId: string = match[1];
        const task = taskStr.replace(mentionRegex, '').trim();
        if (task) {
          parsedTasks.push({ agentId, task });
        }
      }
    }

    if (parsedTasks.length === 0) {
      console.log('❌ No valid agent mentions found in tasks');
      console.log('Please specify agents using @agent_name format');
      console.log('Example: codecrew execute "@backend implement API"');
      console.log('Example (parallel): codecrew execute "@claude task1" "@claude task2"');
      process.exit(1);
    }

    console.log(`⚡ Processing ${parsedTasks.length} ${parsedTasks.length === 1 ? 'task' : 'tasks'}`);

    if (parsedTasks.length === 1) {
      // Single task execution
      const firstTask = parsedTasks[0];
      if (!firstTask) {
        console.log('❌ No valid tasks found');
        process.exit(1);
      }
      const { agentId, task } = firstTask;
      console.log(`📋 Task: ${task}`);
      console.log(`🤖 Agent: @${agentId}`);
      console.log('');
      console.log(`⚡ Executing task with single agent: @${agentId}`);
      console.log('────────────────────────────────────────────────────────────');
      console.log('');

      const result = await codeCrewTool.executeAgent({
        agentId: agentId,
        task: task,
        projectPath: process.cwd(),
        context: contextFromPipe
      });

      // Format and display result
      const status = result.success ? '🟢 Status: Success' : '🔴 Status: Failed';
      console.log(`📊 Results from @${agentId}:`);
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
      // Multiple tasks execution (parallel)
      console.log(`🚀 Executing ${parsedTasks.length} tasks in parallel:`);
      parsedTasks.forEach((pt, index) => {
        console.log(`   ${index + 1}. @${pt.agentId}: ${pt.task.substring(0, 50)}${pt.task.length > 50 ? '...' : ''}`);
      });
      console.log('────────────────────────────────────────────────────────────');
      console.log('');

      const tasks = parsedTasks.map(pt => ({
        agentId: pt.agentId,
        task: pt.task,
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