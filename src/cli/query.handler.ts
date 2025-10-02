import { Logger } from '@nestjs/common';
import { CliOptions } from '../cli-options';
import { CodeCrewTool } from '../codecrew.tool';
import { readStdin, formatPipedContext } from '../utils/stdin-utils';
import { ConversationProviderFactory, CliConversationHistoryProvider } from '../conversation';
import * as os from 'os';

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
    console.log('Example (parallel): codecrew query "@claude 1+1?" "@claude 2+2?"');
    process.exit(1);
  }

  try {
    // Get query input - support both single string and array of separate queries
    const queryInput = Array.isArray(args.query) ? args.query : [args.query];

    // Check for piped input (stdin) and convert to context
    const pipedInput = await readStdin();
    const contextFromPipe = pipedInput ? formatPipedContext(pipedInput) : undefined;

    if (pipedInput && !args.raw) {
      console.log('📥 Received piped input - using as context');
    }

    // Set up conversation history if thread is specified
    let conversationProvider: CliConversationHistoryProvider | null = null;
    let threadId: string | null = null;
    let conversationContext = '';

    if (args.thread) {
      const providerFactory = new ConversationProviderFactory();
      conversationProvider = providerFactory.getProvider('cli') as CliConversationHistoryProvider;
      await conversationProvider.initialize();
      
      threadId = args.thread;
      const exists = await conversationProvider.hasHistory(threadId);
      
      if (!exists) {
        if (!args.raw) {
          console.log(`📝 Creating new conversation thread: ${threadId}`);
        }
        await conversationProvider.createThread(threadId);
      } else {
        if (!args.raw) {
          console.log(`🔗 Continuing conversation thread: ${threadId}`);
        }
      }

      // Fetch conversation history
      const thread = await conversationProvider.fetchHistory(threadId, {
        limit: 20,
        maxContextLength: 4000,
      });

      // For built-in agents, we'll handle conversation history via template system
      // For custom agents, use the traditional context method
      if (thread.messages.length > 0) {
        conversationContext = await conversationProvider.formatForAI(thread, {
          excludeCurrent: true,
        });
        
        // Format for built-in agents with security key authentication
        if (conversationContext.trim()) {
          conversationContext = `Previous conversation context from thread "${threadId}":\n${conversationContext}`;
        }
      }
    }

    // Get CodeCrewTool from app context
    const codeCrewTool = app.get(CodeCrewTool);

    // Parse each query argument separately
    interface ParsedQuery {
      agentId: string;
      query: string;
      model?: string; // Optional model specification
    }

    const parsedQueries: ParsedQuery[] = [];
    const mentionRegex = /@([a-zA-Z_][a-zA-Z0-9_]*)(?::([a-zA-Z0-9._-]+))?/g; // Add global flag

    for (const queryStr of queryInput) {
      // Find all @mentions in this query string
      const matches = [...queryStr.matchAll(mentionRegex)];
      
      if (matches.length === 0) {
        continue; // Skip if no mentions found
      }

      // Remove all @mentions to get the actual query text
      const query = queryStr.replace(/@([a-zA-Z_][a-zA-Z0-9_]*)(?::([a-zA-Z0-9._-]+))?/g, '').trim();
      
      if (!query) {
        continue; // Skip if no query text after removing mentions
      }

      // Create a separate query for each agent mention
      for (const match of matches) {
        const agentId = match[1];
        const model = match[2]; // Capture model if provided
        if (agentId) {
          parsedQueries.push({ agentId, query, model });
        }
      }
    }

    if (parsedQueries.length === 0) {
      console.log('❌ No valid agent mentions found in queries');
      console.log('Please specify agents using @agent_name format');
      console.log('Example: codecrew query "@backend analyze this code"');
      console.log('Example (parallel): codecrew query "@claude 1+1?" "@claude 2+2?"');
      process.exit(1);
    }

    // Validate all agents exist before execution
    try {
      const agentsResult = await codeCrewTool.listAgents();
      const validAgentIds = new Set(agentsResult.availableAgents?.map((a: any) => a.id) || []);
      
      const invalidAgents = parsedQueries
        .filter(pq => !validAgentIds.has(pq.agentId))
        .map(pq => pq.agentId);

      if (invalidAgents.length > 0) {
        const uniqueInvalid = [...new Set(invalidAgents)];
        const errorMsg = `Error: Agent(s) not found: ${uniqueInvalid.map(a => `@${a}`).join(', ')}`;
        console.error(errorMsg);
        process.exit(1);
      }
    } catch (error) {
      const errorMsg = `Error: Failed to load agents - ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      process.exit(1);
    }

    if (!args.raw) {
      console.log(`🔍 Processing ${parsedQueries.length} ${parsedQueries.length === 1 ? 'query' : 'queries'}`);
    }

    // 4. Call appropriate method based on number of queries
    let result;
    if (parsedQueries.length === 1) {
      // Single query
      const firstQuery = parsedQueries[0];
      if (!firstQuery) {
        console.log('❌ No valid queries found');
        process.exit(1);
      }
      const { agentId, query, model } = firstQuery;

      if (!args.raw) {
        console.log(`📋 Task: ${query}`);
        console.log(`🤖 Agent: @${agentId}${model ? `:${model}` : ''}`);
        if (threadId) {
          console.log(`🔗 Thread: ${threadId}`);
        }
        console.log('');
        console.log(`🔎 Querying single agent: @${agentId}${model ? `:${model}` : ''}`);
        console.log('─'.repeat(60));
      }

      // Build combined context
      const combinedContext = [
        conversationContext,
        contextFromPipe
      ].filter(Boolean).join('\n\n');

      result = await codeCrewTool.queryAgent({
        agentId: agentId,
        query: query,
        context: combinedContext || undefined,
        model: model
      });

      // Check if query was successful before saving to history
      if (!result.success) {
        // Output error message even in raw mode
        const errorMsg = `Error: ${result.error || 'Query failed'}`;
        console.error(errorMsg);
        process.exit(1);
      }

      // Only save to conversation history after successful response
      if (conversationProvider && threadId && result.response) {
        await conversationProvider.addMessage(threadId, os.userInfo().username, query, false);
        await conversationProvider.addMessage(threadId, 'codecrew', result.response, true);
      }

      // 5. Format and output results for single agent
      if (args.raw) {
        // Raw mode: output only AI response
        console.log(result.response || '');
      } else {
        formatSingleAgentResult(result, agentId, query);
      }

    } else {
      // Multiple queries (parallel)
      
      if (!args.raw) {
        console.log(`🚀 Querying ${parsedQueries.length} agents in parallel:`);
        parsedQueries.forEach((pq, index) => {
          console.log(`   ${index + 1}. @${pq.agentId}: ${pq.query.substring(0, 50)}${pq.query.length > 50 ? '...' : ''}`);
        });
        if (threadId) {
          console.log(`🔗 Thread: ${threadId}`);
        }
        console.log('─'.repeat(60));
      }

      // Build combined context for all queries
      const combinedContext = [
        conversationContext,
        contextFromPipe
      ].filter(Boolean).join('\n\n');

      const queries = parsedQueries.map(pq => ({
        agentId: pq.agentId,
        query: pq.query,
        context: combinedContext || undefined,
        model: pq.model
      }));

      result = await codeCrewTool.queryAgentParallel({ queries });

      // Check for any errors in parallel execution
      if (!result.success) {
        const errorMsg = `Error: Parallel query failed - ${result.error || 'Unknown error'}`;
        console.error(errorMsg);
        process.exit(1);
      }

      // Check individual results for errors
      const hasErrors = result.results && result.results.some((r: any) => !r.success);
      if (hasErrors) {
        const failedAgents = result.results
          .filter((r: any) => !r.success)
          .map((r: any) => `@${r.agentId}: ${r.error}`)
          .join(', ');
        const errorMsg = `Error: Some agents failed - ${failedAgents}`;
        console.error(errorMsg);
        process.exit(1);
      }

      // Only save to conversation history after all successful responses
      if (conversationProvider && threadId) {
        // Save user messages
        for (const pq of parsedQueries) {
          await conversationProvider.addMessage(
            threadId, 
            os.userInfo().username, 
            `@${pq.agentId}${pq.model ? `:${pq.model}` : ''} ${pq.query}`, 
            false
          );
        }
        
        // Save assistant responses (only successful ones)
        if (result.results && Array.isArray(result.results)) {
          for (const agentResult of result.results) {
            if (agentResult.success && agentResult.response) {
              const agentName = `${agentResult.agentId}${agentResult.model ? `:${agentResult.model}` : ''}`;
              await conversationProvider.addMessage(
                threadId,
                agentName,
                agentResult.response,
                true
              );
            }
          }
        }
      }

      // 5. Format and output results for parallel agents
      if (args.raw) {
        // Raw mode: output only AI responses, one per line
        if (result.results && Array.isArray(result.results)) {
          result.results.forEach((agentResult: any) => {
            if (agentResult.success) {
              console.log(agentResult.response || '');
            }
          });
        }
      } else {
        const validAgentIds = parsedQueries.map(pq => pq.agentId);
        formatParallelAgentResults(result, validAgentIds, '');
      }
    }

    // Success message (already handled errors above with exit(1))
    if (!args.raw) {
      console.log('\n✅ Query completed successfully');
    }

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
        if (agentResult.query) {
          console.log(`   📝 Query: ${agentResult.query}`);
        }
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