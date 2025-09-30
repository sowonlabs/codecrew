import { Logger } from '@nestjs/common';
import { CliOptions } from '../cli-options';
import { CodeCrewTool } from '../codecrew.tool';
import { readStdin, formatPipedContext } from '../utils/stdin-utils';

const logger = new Logger('QueryHandler');

/**
 * Handle query command: codecrew query "@agent message"
 * Supports both single agents (@backend) and multiple agents (@backend @frontend)
 */
export async function handleQuery(app: any, args: CliOptions) {
  logger.log('Query command received');

  if (!args.query) {
    logger.error('No query message provided');
    console.log('Usage: codecrew query "<message>"');
    console.log('Example: codecrew query "@backend analyze this API"');
    console.log('Example: codecrew query "@backend @frontend implement login feature"');
    process.exit(1);
  }

  try {
    const queryMessage = Array.isArray(args.query) ? args.query.join(' ') : args.query || '';
    console.log(`🔍 Processing query: ${queryMessage}`);

    // 1. Parse mentions from query using simple regex
    const mentionRegex = /@([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const mentions = [...queryMessage.matchAll(mentionRegex)].map(match => match[1]);
    const taskText = queryMessage.replace(mentionRegex, '').trim();

    if (mentions.length === 0) {
      console.log('❌ No agent mentions found in query');
      console.log('Please specify agents using @agent_name format');
      console.log('Example: codecrew query "@backend analyze this code"');
      process.exit(1);
    }

    if (!taskText) {
      console.log('❌ No task message found after removing mentions');
      console.log('Please provide a task description along with agent mentions');
      process.exit(1);
    }

    // 2. Check for piped input (stdin) and convert to context
    const pipedInput = await readStdin();
    const contextFromPipe = pipedInput ? formatPipedContext(pipedInput) : undefined;
    
    if (pipedInput) {
      console.log('📥 Received piped input - using as context');
    }

    // 3. Get CodeCrewTool from app context
    const codeCrewTool = app.get(CodeCrewTool);

    console.log(`📋 Task: ${taskText}`);
    console.log(`🤖 Agents: ${mentions.map(m => `@${m}`).join(' ')}`);
    console.log('');

    // 4. Call appropriate method based on number of agents
    let result;
    if (mentions.length === 1) {
      // Single agent query
      const agentId = mentions[0];
      console.log(`🔎 Querying single agent: @${agentId}`);
      console.log('─'.repeat(60));

      result = await codeCrewTool.queryAgent({
        agentId: agentId,
        query: taskText,
        context: contextFromPipe
      });

      // 5. Format and output results for single agent
      if (agentId && taskText) {
        formatSingleAgentResult(result, agentId, taskText);
      }

    } else {
      // Multiple agents query (parallel)
      console.log(`🚀 Querying ${mentions.length} agents in parallel:`);
      mentions.forEach((agent, index) => {
        console.log(`   ${index + 1}. @${agent}`);
      });
      console.log('─'.repeat(60));

      const queries = mentions.map(agentId => ({
        agentId: agentId,
        query: taskText,
        context: contextFromPipe
      }));

      result = await codeCrewTool.queryAgentParallel({ queries });

      // 5. Format and output results for parallel agents
      const validMentions = mentions.filter((m): m is string => !!m);
      if (taskText) {
        formatParallelAgentResults(result, validMentions, taskText);
      }
    }

    if (!result.success) {
      console.log('\n❌ Query execution failed');
      process.exit(1);
    }

    console.log('\n✅ Query completed successfully');

  } catch (error) {
    logger.error(`Query failed: ${error instanceof Error ? error.message : error}`);
    console.log(`\n❌ Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

/**
 * Format and display single agent query results
 */
function formatSingleAgentResult(result: any, agentId: string, taskText: string) {
  console.log(`\n📊 Results from @${agentId}:`);
  console.log('═'.repeat(60));

  if (result.success) {
    console.log(`🟢 Status: Success`);
    console.log(`🤖 Provider: ${result.provider || 'Unknown'}`);
    console.log(`📝 Task ID: ${result.taskId || 'N/A'}`);
    console.log('');

    if (result.response) {
      console.log('📄 Response:');
      console.log('─'.repeat(40));
      console.log(result.response);
    }

    if (result.workingDirectory) {
      console.log(`\n📁 Working Directory: ${result.workingDirectory}`);
    }
  } else {
    console.log(`🔴 Status: Failed`);
    console.log(`❌ Error: ${result.error || 'Unknown error'}`);

    if (result.availableAgents && result.availableAgents.length > 0) {
      console.log(`\n💡 Available agents: ${result.availableAgents.join(', ')}`);
    }
  }
}

/**
 * Format and display parallel agent query results
 */
function formatParallelAgentResults(result: any, mentions: string[], taskText: string) {
  console.log('\n📊 Parallel Query Results:');
  console.log('═'.repeat(60));

  if (result.success && result.summary) {
    const { summary } = result;
    console.log(`📈 Summary:`);
    console.log(`   • Total Queries: ${summary.totalQueries}`);
    console.log(`   • Successful: ${summary.successful}`);
    console.log(`   • Failed: ${summary.failed}`);
    console.log(`   • Total Duration: ${summary.totalDuration}ms`);
    console.log(`   • Average Duration: ${summary.averageDuration}ms`);
    console.log('');

    if (result.results && Array.isArray(result.results)) {
      result.results.forEach((agentResult: any, index: number) => {
        console.log(`\n${index + 1}. Agent: @${agentResult.agentId} (${agentResult.provider}) - ${agentResult.duration}ms`);
        if (agentResult.taskId) {
          console.log(`   📋 Task ID: ${agentResult.taskId}`);
        }
        console.log('─'.repeat(50));

        if (agentResult.success) {
          console.log(`🟢 Status: Success`);
          if (agentResult.response) {
            console.log('📄 Response:');
            // Truncate very long responses for parallel display
            const response = agentResult.response.length > 500
              ? agentResult.response.substring(0, 500) + '...\n[Response truncated - use single agent query for full response]'
              : agentResult.response;
            console.log(response);
          }
        } else {
          console.log(`🔴 Status: Failed`);
          console.log(`❌ Error: ${agentResult.error || 'Unknown error'}`);
        }
      });
    }

    if (result.performance) {
      console.log(`\n⚡ Performance Insights:`);
      console.log(`   • Fastest Query: ${result.performance.fastestQuery}ms`);
      console.log(`   • Slowest Query: ${result.performance.slowestQuery}ms`);
      console.log(`   • Time Saved: ${result.performance.timeSaved}ms (vs sequential)`);
    }
  } else {
    console.log(`🔴 Status: Failed`);
    console.log(`❌ Error: ${result.error || 'Parallel query execution failed'}`);
  }
}