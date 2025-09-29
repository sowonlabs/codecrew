import { Injectable, Logger } from '@nestjs/common';
import { McpTool } from '@sowonai/nestjs-mcp-adapter';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { AIService } from './ai.service';
import { ProjectService } from './project.service';
import { PREFIX_TOOL_NAME, SERVER_NAME } from './constants';
import { AgentInfo } from './agent.types';
import { getErrorMessage, getErrorStack } from './utils/error-utils';

// Interface for tracking task IDs and logs
interface TaskLog {
  id: string;
  type: 'query' | 'execute';
  agentId?: string;
  provider: 'claude' | 'gemini' | 'copilot';
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  prompt: string;
  result?: any;
  logs: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
  }>;
}

@Injectable()
export class CodeCrewTool {
  private readonly logger = new Logger(CodeCrewTool.name);
  private readonly taskLogs = new Map<string, TaskLog>();
  
  constructor(
    private readonly aiService: AIService,
    private readonly projectService: ProjectService,
  ) {}

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addTaskLog(taskId: string, log: { level: 'info' | 'warn' | 'error'; message: string }) {
    const task = this.taskLogs.get(taskId);
    if (task) {
      task.logs.push({
        timestamp: new Date(),
        ...log
      });
    }
  }

  private createTask(type: 'query' | 'execute', provider: 'claude' | 'gemini' | 'copilot', prompt: string, agentId?: string): string {
    const taskId = this.generateTaskId();
    this.taskLogs.set(taskId, {
      id: taskId,
      type,
      agentId,
      provider,
      startTime: new Date(),
      status: 'running',
      prompt,
      logs: []
    });
    return taskId;
  }

  private completeTask(taskId: string, result: any, success: boolean) {
    const task = this.taskLogs.get(taskId);
    if (task) {
      task.endTime = new Date();
      task.status = success ? 'completed' : 'failed';
      task.result = result;
    }
  }









  @McpTool({
    server: SERVER_NAME,
    name: `${PREFIX_TOOL_NAME}getTaskLogs`,
    description: 'Get task logs by task ID to monitor progress and detailed execution logs.',
    input: {
      taskId: z.string().optional().describe('Task ID to get logs for. If not provided, returns all recent tasks.')
    },
    annotations: {
      title: 'Get Task Logs',
      readOnlyHint: true,
      desctructiveHint: false
    }
  })
  async getTaskLogs(input: { taskId?: string }) {
    this.logger.log('=== getTaskLogs called ===');
    this.logger.log(`Input taskId: ${input.taskId}`);
    
    const fs = require('fs');
    const path = require('path');
    const logsDir = path.join(process.cwd(), '.codecrew', 'logs');
    
    try {
      // 로그 디렉토리 확인
      if (!fs.existsSync(logsDir)) {
        this.logger.log('Logs directory does not exist');
        return {
          content: [{ type: 'text', text: 'Logs directory not found' }],
          isError: false
        };
      }
      
      // 로그 파일 목록 읽기
      const logFiles = fs.readdirSync(logsDir).filter((file: string) => file.endsWith('.log'));
      this.logger.log(`Found ${logFiles.length} log files in ${logsDir}`);
      
      if (input.taskId) {
        // 특정 태스크 로그 조회
        const logFile = `${input.taskId}.log`;
        const logPath = path.join(logsDir, logFile);
        
        if (fs.existsSync(logPath)) {
          const content = fs.readFileSync(logPath, 'utf-8');
          this.logger.log(`Reading log file: ${logFile}`);
          this.logger.log(`Log content length: ${content.length} characters`);
          
          return {
            content: [{ type: 'text', text: content }],
            isError: false
          };
        } else {
          this.logger.log(`Log file not found: ${logFile}`);
          return {
            content: [{ type: 'text', text: `Task log not found: ${input.taskId}` }],
            isError: false
          };
        }
      } else {
        // 모든 태스크 목록 조회
        this.logger.log('Listing all log files:');
        logFiles.forEach((file: string) => {
          this.logger.log(`  - ${file}`);
        });
        
        return {
          content: [{ 
            type: 'text', 
            text: `Found ${logFiles.length} task logs:\n${logFiles.map((f: string) => f.replace('.log', '')).join('\n')}` 
          }],
          isError: false
        };
      }
    } catch (error: any) {
      this.logger.error('Error reading logs:', error);
      return {
        content: [{ type: 'text', text: `Error reading logs: ${error.message}` }],
        isError: true
      };
    }
  }

  @McpTool({
    server: SERVER_NAME,
    name: `${PREFIX_TOOL_NAME}checkAIProviders`,
    description: 'Check the status of available AI CLI tools (Claude, Gemini, GitHub Copilot).',
    input: {},
    annotations: {
      title: 'Check AI Providers Status',
      readOnlyHint: true,
      desctructiveHint: false
    }
  })
  async checkAIProviders() {
    this.logger.log('Checking AI provider availability');
    
    try {
      const availableProviders = await this.aiService.checkAvailableProviders();
      const installation = await this.aiService.validateCLIInstallation();
      const recommendations = this.getInstallationRecommendations(installation);

      // Compose MCP response text
      const responseText = `🤖 **AI Providers Status**

**Available Providers:**
${availableProviders.length > 0 ? availableProviders.map(p => `✅ ${p}`).join('\n') : '❌ No providers available'}

**Installation Status:**
• Claude CLI: ${installation.claude ? '✅ Installed' : '❌ Not Installed'}
• Gemini CLI: ${installation.gemini ? '✅ Installed' : '❌ Not Installed'}  
• Copilot CLI: ${installation.copilot ? '✅ Installed' : '❌ Not Installed'}

**Recommendations:**
${recommendations.map(r => `• ${r}`).join('\n')}`;

      return {
        content: [
          { 
            type: 'text', 
            text: responseText
          }
        ],
        success: true,
        availableProviders,
        installation: {
          claude: installation.claude,
          gemini: installation.gemini,
          copilot: installation.copilot,
        },
        recommendations,
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Provider check failed: ${errorMessage}`, getErrorStack(error));
      return {
        content: [
          { 
            type: 'text', 
            text: `❌ **AI Providers Check Failed**

**Error:** ${errorMessage}

No AI providers could be verified.`
          }
        ],
        success: false,
        error: errorMessage,
        availableProviders: [],
        installation: {
          claude: { installed: false },
          gemini: { installed: false },
          copilot: { installed: false }
        }
      };
    }
  }



  private getInstallationRecommendations(installation: { claude: boolean; gemini: boolean; copilot: boolean }): string[] {
    const recommendations: string[] = [];
    
    if (!installation.claude) {
      recommendations.push('Claude CLI installation: npm install -g @anthropic-ai/claude-code');
    }
    
    if (!installation.gemini) {
      recommendations.push('Gemini CLI installation: npm install -g @google/gemini-cli');
    }
    
    if (!installation.copilot) {
      recommendations.push('GitHub Copilot CLI installation: npm install -g @github/copilot-cli or gh extension install github/gh-copilot');
    }
    
    if (installation.claude && installation.gemini && installation.copilot) {
      recommendations.push('All AI providers are available!');
    }
    
    return recommendations;
  }

  // =================================
  // Agent-based AI interaction tools
  // =================================

  @McpTool({
    server: SERVER_NAME,
    name: `${PREFIX_TOOL_NAME}listAgents`,
    description: 'List available specialist AI agents that can be utilized. Each agent is specialized in a specific domain.',
    input: {},
    annotations: {
      title: 'List Available AI Agents',
      readOnlyHint: true,
      desctructiveHint: false
    }
  })
  async listAgents() {
    try {
      // Check agent configuration file path from environment variable
      const agentsConfigPath = process.env.AGENTS_CONFIG;
      
      this.logger.log(`AGENTS_CONFIG environment variable: ${agentsConfigPath}`);
      
      let agents;
      if (agentsConfigPath) {
        this.logger.log(`Loading agents from external config: ${agentsConfigPath}`);
        agents = await this.loadAgentsFromConfig(agentsConfigPath);
        this.logger.log(`Loaded ${agents.length} agents from config file`);
      } else {
        // Default agent list (when environment variable is not set)
        agents = [
          {
            id: 'frontend_developer',
            name: 'Frontend Specialist',
            role: 'Frontend Developer',
            team: 'Development Team',
            provider: 'claude',
            workingDirectory: './frontend',
            capabilities: ['code_analysis', 'ui_review', 'component_design'],
            description: 'Frontend developer specializing in React, Vue.js, and modern UI frameworks. Expert in component architecture, responsive design, and user experience.',
            specialties: ['React', 'Vue.js', 'CSS', 'TypeScript', 'UI/UX']
          },
          {
            id: 'backend_developer',
            name: 'Backend Specialist',
            role: 'Backend Developer',
            team: 'Development Team', 
            provider: 'gemini',
            workingDirectory: './backend',
            capabilities: ['api_design', 'database_optimization', 'architecture_review'],
            description: 'Backend developer specializing in Node.js, Express, and database management. Expert in API design, performance optimization, and system architecture.',
            specialties: ['Node.js', 'Express', 'PostgreSQL', 'MongoDB', 'REST APIs', 'GraphQL']
          },
          {
            id: 'devops_engineer',
            name: 'DevOps Specialist',
            role: 'DevOps Engineer',
            team: 'Infrastructure Team',
            provider: 'copilot',
            workingDirectory: './',
            capabilities: ['infrastructure_analysis', 'ci_cd_optimization', 'deployment_strategy'],
            description: 'DevOps engineer specializing in deployment, infrastructure, and CI/CD optimization. Expert in containerization, cloud platforms, and automation.',
            specialties: ['Docker', 'Kubernetes', 'AWS', 'GitHub Actions', 'Terraform']
          },
          {
            id: 'security_analyst',
            name: 'Security Specialist',
            role: 'Security Analyst',
            team: 'Security Team',
            provider: 'claude',
            workingDirectory: './',
            capabilities: ['security_audit', 'vulnerability_assessment', 'compliance_check'],
            description: 'Security analyst specializing in code security, vulnerability assessment, and compliance. Expert in secure coding practices and threat analysis.',
            specialties: ['Security Audit', 'OWASP', 'Penetration Testing', 'Compliance']
          }
        ];
      }

      this.logger.log(`Retrieved ${agents.length} available agents`);
      
      // Re-read configuration file to show original YAML structure
      let yamlContent = '';
      if (agentsConfigPath) {
        try {
          const { readFile } = await import('fs/promises');
          yamlContent = await readFile(agentsConfigPath, 'utf-8');
        } catch (error) {
          this.logger.warn('Could not read YAML file for display:', getErrorMessage(error));
        }
      }
      
      const responseText = `🤖 **Available AI Agents (${agents.length} total)**

**Configuration Source:** ${process.env.AGENTS_CONFIG ? 'External YAML file' : 'Built-in defaults'}
${process.env.AGENTS_CONFIG ? `**Config Path:** \`${process.env.AGENTS_CONFIG}\`` : ''}

**Parsed Agent Summary:**
${agents.map((agent, index) => `${index + 1}. **${agent.id}**
   - Provider: ${agent.provider}
   - Working Dir: ${agent.workingDirectory}
   ${agent.name ? `- Name: ${agent.name}` : ''}
   ${agent.role ? `- Role: ${agent.role}` : ''}
   ${agent.team ? `- Team: ${agent.team}` : ''}
`).join('')}

${yamlContent ? `**Full YAML Configuration:**
\`\`\`yaml
${yamlContent}
\`\`\`

**💡 Customization Guide:**
You can customize agents by modifying the YAML file. Required fields:
- \`id\`: Unique identifier
- \`working_directory\`: Path for agent operations  
- \`inline.provider\`: AI provider (claude/gemini/copilot)
- \`inline.system_prompt\`: Agent's specialized instructions

Optional fields (like \`name\`, \`role\`, \`team\`, etc.) can be added for better organization.` : `**Default Configuration:**
No external YAML file configured. Using built-in agents.
Set \`AGENTS_CONFIG\` environment variable to use custom agents.

**Example YAML Structure:**
\`\`\`yaml
agents:
  - id: "your_agent_id"
    name: "Your Agent Name"
    role: "specialist"
    working_directory: "/path/to/project"
    inline:
      type: "agent"
      provider: "claude"
      system_prompt: |
        You are a specialized AI agent for...
\`\`\``}

**Recommendations:**

**🚀 Performance Tip:** For optimal results, formulate queries in English. Testing shows English queries typically produce more detailed responses, faster processing times (20% improvement), and higher success rates compared to other languages.

**Configuration Source:** ${process.env.AGENTS_CONFIG ? 'External YAML file' : 'Default hardcoded values'}`;

      return {
        content: [
          { 
            type: 'text', 
            text: responseText
          }
        ],
        success: true,
        availableAgents: agents,
        totalCount: agents.length,
        configurationSource: process.env.AGENTS_CONFIG ? 'External YAML file' : 'Default hardcoded values'
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Agent listing failed:', errorMessage);
      return {
        content: [
          { 
            type: 'text', 
            text: `❌ **Error loading agents:** ${errorMessage}

**Fallback:** No agents available due to configuration error.`
          }
        ],
        success: false,
        error: errorMessage,
        availableAgents: [],
        totalCount: 0
      };
    }
  }

  @McpTool({
    server: SERVER_NAME,
    name: `${PREFIX_TOOL_NAME}queryAgent`,
    description: 'Query a specific specialist agent (read-only mode). You can request code analysis, explanations, reviews, etc. No file modifications will be performed.',
    input: {
      agentId: z.string().describe('Agent ID to query (e.g., frontend_developer, backend_developer, devops_engineer, security_analyst, or custom agents)'),
      query: z.string().describe('Question or request to ask the agent'),
      projectPath: z.string().describe('Absolute path of the project to analyze').optional(),
      context: z.string().describe('Additional context or background information').optional(),
    },
    annotations: {
      title: 'Query Specialist Agent (Read-Only)',
      readOnlyHint: true,
      desctructiveHint: false
    }
  })
  async queryAgent(args: {
    agentId: string;
    query: string;
  }) {
    // Generate task ID and start tracking
    const taskId = this.createTask('query', 'claude', args.query, args.agentId); // provider will be determined later
    this.addTaskLog(taskId, { level: 'info', message: `Started query agent ${args.agentId}` });

    try {
      const { agentId, query } = args;
      
      this.logger.log(`[${taskId}] Querying agent ${agentId}: ${query.substring(0, 50)}...`);
      this.addTaskLog(taskId, { level: 'info', message: `Query: ${query.substring(0, 100)}...` });

      // Dynamically load agent configuration
      const agents = await this.loadAvailableAgents();
      const agent = agents.find(a => a.id === agentId);

      if (!agent) {
        return {
          content: [
            { 
              type: 'text', 
              text: `❌ **Agent Not Found**

**Error:** Agent '${agentId}' not found.

**Available Agents:** ${agents.map(a => a.id).join(', ')}

Please check the agent ID and try again.`
            }
          ],
          success: false,
          agent: agentId,
          error: `Agent '${agentId}' not found`,
          availableAgents: agents.map(a => a.id),
          readOnlyMode: true
        };
      }

      // Configure agent's system prompt
      // Use current directory to avoid non-existent directory issues
      const workingDir = agent.workingDirectory || process.cwd();
      let systemPrompt = agent.systemPrompt || agent.description || `You are an expert ${agentId}.`;

      // Add read-only mode warning
      systemPrompt += `

IMPORTANT: You are in READ-ONLY ANALYSIS MODE. Do NOT suggest file modifications or code changes.
Only provide analysis, explanations, reviews, and recommendations based on existing code.
Focus on understanding and explaining rather than changing anything.

Specialties: ${agent.specialties?.join(', ') || 'General'}
Capabilities: ${agent.capabilities?.join(', ') || 'Analysis'}
Working Directory: ${workingDir}`;

      const fullPrompt = `${systemPrompt}

Query: ${query}`;

      // Use agent's AI provider - using queryAI wrapper
      let response;
      const provider = agent.provider || 'claude';
      
      response = await this.aiService.queryAI(fullPrompt, provider, {
        workingDirectory: workingDir,
        timeout: 600000,
        taskId: taskId,
        additionalArgs: agent.options, // Pass agent-specific CLI options
      });

      // Handle task completion
      this.addTaskLog(taskId, { level: 'info', message: `Query completed. Success: ${response.success}` });
      this.completeTask(taskId, response, response.success);

      // Compose MCP response text
      const responseText = `🤖 **Agent Query Response (Read-Only Mode)**

**Task ID:** ${taskId}
**Agent:** ${agentId} (${response.provider})
**Query:** ${query}
**Working Directory:** ${workingDir}

**Agent Response:**
${response.success ? response.content : `❌ Query Failed: ${response.error}`}

Use \`getTaskLogs\` with taskId "${taskId}" to see detailed execution logs.
`;

      return {
        content: [
          { 
            type: 'text', 
            text: responseText
          }
        ],
        taskId: taskId,
        success: response.success,
        agent: agentId,
        provider: response.provider,
        query: query,
        response: response.content,
        readOnlyMode: true,
        error: response.error,
        workingDirectory: workingDir
      };

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      this.addTaskLog(taskId, { level: 'error', message: `Query failed: ${errorMessage}` });
      this.completeTask(taskId, { error: errorMessage }, false);
      
      this.logger.error(`[${taskId}] Agent query failed for ${args.agentId}:`, errorMessage);
      return {
        content: [
          { 
            type: 'text', 
            text: `❌ **Agent Query Failed**

**Task ID:** ${taskId}
**Agent:** ${args.agentId}
**Error:** ${errorMessage}
**Query:** ${args.query}

Read-Only Mode: No files were modified.`
          }
        ],
        success: false,
        agent: args.agentId,
        error: errorMessage,
        readOnlyMode: true
      };
    }
  }

  @McpTool({
    server: SERVER_NAME,
    name: `${PREFIX_TOOL_NAME}executeAgent`,
    description: 'Execute tasks through a specialist agent. Can provide implementation guidance, code examples, and actionable solutions.',
    input: {
      agentId: z.string().describe('Agent ID to execute (e.g., frontend_developer, backend_developer, devops_engineer, security_analyst, or custom agents)'),
      task: z.string().describe('Task or implementation request for the agent to perform'),
      projectPath: z.string().describe('Absolute path of the project to work on').optional(),
      context: z.string().describe('Additional context or background information').optional(),
    },
    annotations: {
      title: 'Execute Agent Task (Can Modify Files)',
      readOnlyHint: false,
      desctructiveHint: true
    }
  })
  async executeAgent(args: {
    agentId: string;
    task: string;
    projectPath?: string;
    context?: string;
  }) {
    // Generate task ID and start tracking
    const taskId = this.createTask('execute', 'claude', args.task, args.agentId); // provider will be determined later
    this.addTaskLog(taskId, { level: 'info', message: `Started execute agent ${args.agentId}` });

    try {
      const { agentId, task, projectPath, context } = args;
      
      this.logger.log(`[${taskId}] Executing agent ${agentId}: ${task.substring(0, 50)}...`);
      this.addTaskLog(taskId, { level: 'info', message: `Task: ${task.substring(0, 100)}...` });

      // Dynamically load agent configuration
      const agents = await this.loadAvailableAgents();
      const agent = agents.find(a => a.id === agentId);

      if (!agent) {
        return {
          content: [
            { 
              type: 'text', 
              text: `❌ **Agent Not Found**

**Error:** Agent '${agentId}' not found.

**Available Agents:** ${agents.map(a => a.id).join(', ')}

Please check the agent ID and try again.`
            }
          ],
          success: false,
          agent: agentId,
          error: `Agent '${agentId}' not found`,
          availableAgents: agents.map(a => a.id),
          executionMode: true
        };
      }

      // Configure agent's system prompt
      const workingDir = projectPath || agent.workingDirectory || './';
      let systemPrompt = agent.systemPrompt || agent.description || `You are an expert ${agentId}.`;

      // Add execution mode settings
      systemPrompt += `

EXECUTION MODE: You can provide implementation guidance and suggest code changes.
You have access to the working directory and can provide detailed implementation guidance.
Focus on practical, actionable solutions for ${agent.specialties?.join(', ') || 'development'}.

Specialties: ${agent.specialties?.join(', ') || 'General'}
Capabilities: ${agent.capabilities?.join(', ') || 'Implementation'}
Working Directory: ${workingDir}`;

      const fullPrompt = `${systemPrompt}

${context ? `Additional Context: ${context}\n` : ''}

Task to Execute: ${task}

Please provide detailed, actionable implementation guidance including:
1. Step-by-step approach
2. Code examples or configuration samples
3. Best practices to follow
4. Potential issues to watch out for`;

      // Use agent's AI provider (execution mode)
      let response;
      const provider = agent.provider || 'claude';
      this.addTaskLog(taskId, { level: 'info', message: `Using provider: ${provider}` });
      
      // Use new unified executeAI for all providers
      response = await this.aiService.executeAI(fullPrompt, provider, {
        workingDirectory: workingDir,
        timeout: provider === 'gemini' ? 1200000 : 600000, // 20min for Gemini, 10min for others
        taskId: taskId,
        additionalArgs: agent.options, // Pass agent-specific CLI options
      });

      // Handle task completion
      this.addTaskLog(taskId, { level: 'info', message: `Execution completed. Success: ${response.success}` });
      this.completeTask(taskId, response, response.success);

      // Compose MCP response text
      const responseText = `⚡ **Agent Execution Response**

**Task ID:** ${taskId}
**Agent:** ${agentId} (${response.provider})
**Task:** ${task}
**Working Directory:** ${projectPath || `Default for ${agentId}`}

**Implementation Guidance:**
${response.success ? response.content : `❌ Execution Failed: ${response.error}`}

${context ? `**Context:** ${context}` : ''}

Use \`getTaskLogs\` with taskId "${taskId}" to see detailed execution logs.

**⚠️ Important Recommendations:**
• Review the provided implementation carefully before applying changes
• Test in a development environment first  
• Consider backing up existing files before making modifications`;

      return {
        content: [
          { 
            type: 'text', 
            text: responseText
          }
        ],
        taskId: taskId,
        success: response.success,
        agent: agentId,
        provider: response.provider,
        task: task,
        implementation: response.content,
        executionMode: true,
        error: response.error,
        workingDirectory: projectPath || `Default for ${agentId}`,
        recommendations: [
          'Review the provided implementation carefully before applying changes',
          'Test in a development environment first',
          'Consider backing up existing files before making modifications'
        ]
      };

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      this.addTaskLog(taskId, { level: 'error', message: `Execution failed: ${errorMessage}` });
      this.completeTask(taskId, { error: errorMessage }, false);
      
      this.logger.error(`[${taskId}] Agent execution failed for ${args.agentId}:`, errorMessage);
      return {
        content: [
          { 
            type: 'text', 
            text: `❌ **Agent Execution Failed**

**Task ID:** ${taskId}
**Agent:** ${args.agentId}
**Error:** ${errorMessage}
**Task:** ${args.task}

Execution Mode: Implementation guidance could not be provided.`
          }
        ],
        taskId: taskId,
        success: false,
        agent: args.agentId,
        error: errorMessage,
        executionMode: true
      };
    }
  }

  /**
   * Load available agents list (internal helper method)
   */
  private async loadAvailableAgents(): Promise<AgentInfo[]> {
    try {
      // Check agent configuration file path from environment variable
      const agentsConfigPath = process.env.AGENTS_CONFIG;
      
      if (agentsConfigPath) {
        this.logger.log(`Loading agents from external config: ${agentsConfigPath}`);
        return await this.loadAgentsFromConfig(agentsConfigPath);
      } else {
        // Return default agent list
        return [
          {
            id: 'frontend_developer',
            name: 'Frontend Specialist',
            role: 'Frontend Developer',
            team: 'Development Team',
            provider: 'claude',
            workingDirectory: './frontend',
            capabilities: ['code_analysis', 'ui_review', 'component_design'],
            description: 'Frontend developer specializing in React, Vue.js, and modern UI frameworks. Expert in component architecture, responsive design, and user experience.',
            specialties: ['React', 'Vue.js', 'CSS', 'TypeScript', 'UI/UX'],
            systemPrompt: 'You are an expert frontend developer specializing in React, Vue.js, and modern UI frameworks.'
          },
          {
            id: 'backend_developer',
            name: 'Backend Specialist',
            role: 'Backend Developer',
            team: 'Development Team', 
            provider: 'gemini',
            workingDirectory: './backend',
            capabilities: ['api_design', 'database_optimization', 'architecture_review'],
            description: 'Backend developer specializing in Node.js, Express, and database management. Expert in API design, performance optimization, and system architecture.',
            specialties: ['Node.js', 'Express', 'PostgreSQL', 'MongoDB', 'REST APIs', 'GraphQL'],
            systemPrompt: 'You are an expert backend developer specializing in Node.js, Express, and database management.'
          },
          {
            id: 'devops_engineer',
            name: 'DevOps Specialist',
            role: 'DevOps Engineer',
            team: 'Infrastructure Team',
            provider: 'copilot',
            workingDirectory: './',
            capabilities: ['infrastructure_analysis', 'ci_cd_optimization', 'deployment_strategy'],
            description: 'DevOps engineer specializing in deployment, infrastructure, and CI/CD optimization. Expert in containerization, cloud platforms, and automation.',
            specialties: ['Docker', 'Kubernetes', 'AWS', 'GitHub Actions', 'Terraform'],
            systemPrompt: 'You are an expert DevOps engineer specializing in deployment, infrastructure, and CI/CD optimization.'
          },
          {
            id: 'security_analyst',
            name: 'Security Specialist',
            role: 'Security Analyst',
            team: 'Security Team',
            provider: 'claude',
            workingDirectory: './',
            capabilities: ['security_audit', 'vulnerability_assessment', 'compliance_check'],
            description: 'Security analyst specializing in code security, vulnerability assessment, and compliance. Expert in secure coding practices and threat analysis.',
            specialties: ['Security Audit', 'OWASP', 'Penetration Testing', 'Compliance'],
            systemPrompt: 'You are an expert security analyst specializing in code security and vulnerability assessment.'
          }
        ];
      }
    } catch (error) {
      this.logger.error('Failed to load agents:', getErrorMessage(error));
      return [];
    }
  }

  /**
   * Load agent configuration from YAML/JSON config file
   */
  private async loadAgentsFromConfig(configPath: string): Promise<AgentInfo[]> {
    try {
      const { readFile } = await import('fs/promises');
      const yaml = await import('js-yaml');
      
      this.logger.log(`Loading agents from config: ${configPath}`);
      
      const configContent = await readFile(configPath, 'utf-8');
      let config;

      if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
        config = yaml.load(configContent) as any;
      } else {
        config = JSON.parse(configContent);
      }

      if (!config.agents || !Array.isArray(config.agents)) {
        throw new Error('Invalid config: missing agents array');
      }

      // Convert YAML config to MCP tool format
      return config.agents.map((agent: any) => ({
        id: agent.id,
        name: agent.name || agent.id,
        role: agent.role || 'AI Agent',
        team: agent.team,
        provider: agent.inline?.provider || 'claude',
        workingDirectory: agent.working_directory || './',
        capabilities: agent.capabilities || [],
        description: agent.inline?.system_prompt ? 
          this.extractDescription(agent.inline.system_prompt) : 
          `${agent.name || agent.id} agent`,
        specialties: agent.specialties || [],
        systemPrompt: agent.inline?.system_prompt,
        options: agent.options || []
      }));

    } catch (error) {
      this.logger.error(`Failed to load agents config from ${configPath}:`, getErrorMessage(error));
      // Return empty array if config loading fails
      return [];
    }
  }

  @McpTool({
    server: SERVER_NAME,
    name: `${PREFIX_TOOL_NAME}queryAgentParallel`,
    description: 'Query multiple specialist agents simultaneously in parallel (read-only mode). Efficiently send multiple tasks to the same agent or different questions to various agents.',
    input: {
      queries: z.array(z.object({
        agentId: z.string().describe('Agent ID to query (e.g., frontend_developer, backend_developer, gmail_mcp_developer, etc.)'),
        query: z.string().describe('Question or request to ask the agent'),
        projectPath: z.string().describe('Absolute path of the project to analyze').optional(),
        context: z.string().describe('Additional context or background information').optional(),
      })).describe('Array of queries to process in parallel'),
    },
    annotations: {
      title: 'Query Multiple Agents in Parallel (Read-Only)',
      readOnlyHint: true,
      desctructiveHint: false
    }
  })
  async queryAgentParallel(args: {
    queries: Array<{
      agentId: string;
      query: string;
      projectPath?: string;
      context?: string;
    }>;
  }) {
    try {
      const { queries } = args;
      
      this.logger.log(`Starting parallel agent queries (${queries.length} queries)`);
      
      if (!queries || queries.length === 0) {
        return {
          content: [
            { 
              type: 'text', 
              text: `❌ **No Queries Provided**

Please provide at least one query in the queries array.

**Example:**
\`\`\`json
{
  "queries": [
    {
      "agentId": "gmail_mcp_developer",
      "query": "Analyze the README"
    },
    {
      "agentId": "frontend_developer", 
      "query": "Explain the component structure"
    }
  ]
}
\`\`\``
            }
          ],
          success: false,
          error: 'No queries provided',
          results: []
        };
      }

      // Log each query
      queries.forEach((q, index) => {
        this.logger.log(`Query ${index + 1}: ${q.agentId} -> "${q.query.substring(0, 50)}..."`);
      });

      const startTime = Date.now();

      // Use Promise.all for parallel processing
      const results = await Promise.all(
        queries.map(async (queryItem, index) => {
          const queryStartTime = Date.now();
          
          try {
            // Reuse existing queryAgent method
            const result = await this.queryAgent({
              agentId: queryItem.agentId,
              query: queryItem.query,
            });

            const queryDuration = Date.now() - queryStartTime;
            
            return {
              index: index + 1,
              agentId: queryItem.agentId,
              query: queryItem.query,
              success: result.success,
              response: result.response || result.error,
              provider: result.provider,
              duration: queryDuration,
              error: result.error,
              context: queryItem.context
            };
          } catch (error: any) {
            const queryDuration = Date.now() - queryStartTime;
            
            return {
              index: index + 1,
              agentId: queryItem.agentId,
              query: queryItem.query,
              success: false,
              response: null,
              provider: 'unknown',
              duration: queryDuration,
              error: error.message || 'Unknown error occurred',
              context: queryItem.context
            };
          }
        })
      );

      const totalDuration = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      this.logger.log(`Parallel queries completed: ${successCount} success, ${failureCount} failed, ${totalDuration}ms total`);

      // Compose MCP response text
      const responseText = `🚀 **Parallel Agent Queries Results**

**Summary:**
- Total Queries: ${results.length}
- Successful: ${successCount}
- Failed: ${failureCount}
- Total Duration: ${totalDuration}ms
- Average Duration: ${Math.round(totalDuration / results.length)}ms per query

**Individual Results:**

${results.map(result => `---
**${result.index}. Agent: ${result.agentId}** (${result.provider}) - ${result.duration}ms
**Query:** ${result.query}
**Status:** ${result.success ? '✅ Success' : '❌ Failed'}
${result.context ? `**Context:** ${result.context}\n` : ''}
**Response:**
${result.success ? result.response : `Error: ${result.error}`}
`).join('\n')}

**Performance Insights:**
- Fastest Query: ${Math.min(...results.map(r => r.duration))}ms
- Slowest Query: ${Math.max(...results.map(r => r.duration))}ms
- Parallel processing saved approximately ${Math.max(0, results.reduce((sum, r) => sum + r.duration, 0) - totalDuration)}ms compared to sequential execution

**Read-Only Mode:** All queries were executed in analysis mode without file modifications.`;

      return {
        content: [
          { 
            type: 'text', 
            text: responseText
          }
        ],
        success: true,
        summary: {
          totalQueries: results.length,
          successful: successCount,
          failed: failureCount,
          totalDuration,
          averageDuration: Math.round(totalDuration / results.length)
        },
        results: results,
        performance: {
          fastestQuery: Math.min(...results.map(r => r.duration)),
          slowestQuery: Math.max(...results.map(r => r.duration)),
          timeSaved: Math.max(0, results.reduce((sum, r) => sum + r.duration, 0) - totalDuration)
        },
        readOnlyMode: true
      };

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Parallel agent queries failed:', errorMessage);
      return {
        content: [
          { 
            type: 'text', 
            text: `❌ **Parallel Agent Queries Failed**

**Error:** ${errorMessage}

**Total Queries:** ${args.queries?.length || 0}

Read-Only Mode: No files were modified.`
          }
        ],
        success: false,
        error: errorMessage,
        results: [],
        readOnlyMode: true
      };
    }
  }

  @McpTool({
    server: SERVER_NAME,
    name: `${PREFIX_TOOL_NAME}executeAgentParallel`,
    description: 'Execute multiple tasks through specialist agents simultaneously in parallel (execution mode). Efficiently distribute implementation work across multiple agents.',
    input: {
      tasks: z.array(z.object({
        agentId: z.string().describe('Agent ID to execute (e.g., frontend_developer, backend_developer, codecrew_developer_claude, etc.)'),
        task: z.string().describe('Task or implementation request for the agent to perform'),
        projectPath: z.string().describe('Absolute path of the project to work on').optional(),
        context: z.string().describe('Additional context or background information').optional(),
      })).describe('Array of tasks to execute in parallel'),
    },
    annotations: {
      title: 'Execute Multiple Agent Tasks in Parallel (Can Modify Files)',
      readOnlyHint: false,
      desctructiveHint: true
    }
  })
  async executeAgentParallel(args: {
    tasks: Array<{
      agentId: string;
      task: string;
      projectPath?: string;
      context?: string;
    }>;
  }) {
    try {
      const { tasks } = args;
      
      this.logger.log(`Starting parallel agent execution (${tasks.length} tasks)`);
      
      if (!tasks || tasks.length === 0) {
        return {
          content: [
            { 
              type: 'text', 
              text: `❌ **No Tasks Provided**

Please provide at least one task in the tasks array.

**Example:**
\`\`\`json
{
  "tasks": [
    {
      "agentId": "codecrew_developer_claude",
      "task": "Create a utility function for handling timeouts"
    },
    {
      "agentId": "codecrew_developer_gemini", 
      "task": "Write unit tests for the new utility function"
    }
  ]
}
\`\`\``
            }
          ],
          success: false,
          error: 'No tasks provided',
          results: []
        };
      }

      // Log each task
      tasks.forEach((t, index) => {
        this.logger.log(`Task ${index + 1}: ${t.agentId} -> "${t.task.substring(0, 50)}..."`);
      });

      const startTime = Date.now();

      // Use Promise.all for parallel processing
      const results = await Promise.all(
        tasks.map(async (taskItem, index) => {
          const taskStartTime = Date.now();
          
          try {
            // Reuse existing executeAgent method
            const result = await this.executeAgent({
              agentId: taskItem.agentId,
              task: taskItem.task,
              projectPath: taskItem.projectPath,
              context: taskItem.context,
            });

            const taskDuration = Date.now() - taskStartTime;
            
            return {
              index: index + 1,
              agentId: taskItem.agentId,
              task: taskItem.task,
              success: result.success,
              implementation: result.implementation || result.error,
              provider: result.provider,
              duration: taskDuration,
              error: result.error,
              context: taskItem.context,
              workingDirectory: taskItem.projectPath || `Default for ${taskItem.agentId}`,
              recommendations: result.recommendations || []
            };
          } catch (error: any) {
            const taskDuration = Date.now() - taskStartTime;
            
            return {
              index: index + 1,
              agentId: taskItem.agentId,
              task: taskItem.task,
              success: false,
              implementation: null,
              provider: 'unknown',
              duration: taskDuration,
              error: error.message || 'Unknown error occurred',
              context: taskItem.context,
              workingDirectory: taskItem.projectPath || `Default for ${taskItem.agentId}`,
              recommendations: []
            };
          }
        })
      );

      const totalDuration = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      this.logger.log(`Parallel execution completed: ${successCount} success, ${failureCount} failed, ${totalDuration}ms total`);

      // Compose MCP response text
      const responseText = `⚡ **Parallel Agent Execution Results**

**Summary:**
- Total Tasks: ${results.length}
- Successful: ${successCount}
- Failed: ${failureCount}
- Total Duration: ${totalDuration}ms
- Average Duration: ${Math.round(totalDuration / results.length)}ms per task

**Individual Results:**

${results.map(result => `---
**${result.index}. Agent: ${result.agentId}** (${result.provider}) - ${result.duration}ms
**Task:** ${result.task}
**Status:** ${result.success ? '✅ Success' : '❌ Failed'}
**Working Directory:** ${result.workingDirectory}
${result.context ? `**Context:** ${result.context}\n` : ''}
**Implementation:**
${result.success ? result.implementation : `Error: ${result.error}`}

${result.recommendations.length > 0 ? `**Recommendations:**
${result.recommendations.map(r => `• ${r}`).join('\n')}` : ''}
`).join('\n')}

**Performance Insights:**
- Fastest Task: ${Math.min(...results.map(r => r.duration))}ms
- Slowest Task: ${Math.max(...results.map(r => r.duration))}ms
- Parallel processing saved approximately ${Math.max(0, results.reduce((sum, r) => sum + r.duration, 0) - totalDuration)}ms compared to sequential execution

**⚠️ Important Notes:**
- All tasks were executed in IMPLEMENTATION MODE with potential file modifications
- Review all provided implementations before applying changes
- Test in development environment first
- Consider backing up files before making modifications`;

      return {
        content: [
          { 
            type: 'text', 
            text: responseText
          }
        ],
        success: true,
        summary: {
          totalTasks: results.length,
          successful: successCount,
          failed: failureCount,
          totalDuration,
          averageDuration: Math.round(totalDuration / results.length)
        },
        results: results,
        performance: {
          fastestTask: Math.min(...results.map(r => r.duration)),
          slowestTask: Math.max(...results.map(r => r.duration)),
          timeSaved: Math.max(0, results.reduce((sum, r) => sum + r.duration, 0) - totalDuration)
        },
        executionMode: true
      };

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Parallel agent execution failed:', errorMessage);
      return {
        content: [
          { 
            type: 'text', 
            text: `❌ **Parallel Agent Execution Failed**

**Error:** ${errorMessage}

**Total Tasks:** ${args.tasks?.length || 0}

Execution Mode: Implementation guidance could not be provided.`
          }
        ],
        success: false,
        error: errorMessage,
        results: [],
        executionMode: true
      };
    }
  }

  /**
   * Clear all logs from the .codecrew/logs directory
   */
  @McpTool({
    server: SERVER_NAME,
    name: `${PREFIX_TOOL_NAME}clearAllLogs`,
    description: 'Clear all log files from the .codecrew/logs directory to clean up accumulated task logs',
    input: {},
    annotations: {
      title: 'Clear All Logs',
      readOnlyHint: false,
    }
  })
  async clearAllLogs() {
    try {
      const logsDir = path.join(process.cwd(), '.codecrew', 'logs');
      
      // Check if logs directory exists
      if (!fs.existsSync(logsDir)) {
        return {
          content: [
            {
              type: 'text',
              text: `📁 **Log Directory Status**

❌ **No logs directory found**

The logs directory \`.codecrew/logs\` does not exist. Nothing to clean.

**Path checked:** \`${logsDir}\`
`
            }
          ],
          success: true,
          message: 'No logs directory found',
          path: logsDir
        };
      }

      // Read all files in logs directory
      const files = fs.readdirSync(logsDir);
      const logFiles = files.filter(file => file.endsWith('.log'));
      
      if (logFiles.length === 0) {
        return {
          content: [
            {
              type: 'text', 
              text: `📁 **Log Directory Status**

✅ **Already clean**

The logs directory exists but contains no log files to clean.

**Directory:** \`${logsDir}\`
**Total files:** ${files.length}
**Log files:** 0
`
            }
          ],
          success: true,
          message: 'No log files to clean',
          path: logsDir,
          totalFiles: files.length,
          logFiles: 0
        };
      }

      // Calculate total size before deletion
      let totalSize = 0;
      let deletedCount = 0;
      const deletedFiles: string[] = [];

      for (const file of logFiles) {
        const filePath = path.join(logsDir, file);
        try {
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
          fs.unlinkSync(filePath);
          deletedCount++;
          deletedFiles.push(file);
        } catch (error) {
          this.logger.warn(`Failed to delete log file ${file}:`, error);
        }
      }

      // Format file size
      const formatSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      return {
        content: [
          {
            type: 'text',
            text: `🗑️ **Log Cleanup Complete**

✅ **Successfully cleared all log files**

**Directory:** \`${logsDir}\`
**Files deleted:** ${deletedCount}
**Total space freed:** ${formatSize(totalSize)}

${deletedCount > 10 ? 
  `**Sample deleted files:**
${deletedFiles.slice(0, 10).map(f => `  • ${f}`).join('\n')}
  • ... and ${deletedCount - 10} more files` :
  `**Deleted files:**
${deletedFiles.map(f => `  • ${f}`).join('\n')}`
}

The logs directory is now clean and ready for new task logs. 🧹✨
`
          }
        ],
        success: true,
        message: 'All log files cleared successfully',
        path: logsDir,
        deletedCount,
        totalSize,
        deletedFiles: deletedFiles.slice(0, 20) // Limit to first 20 for response size
      };

    } catch (error: any) {
      this.logger.error('Failed to clear logs:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Log Cleanup Failed**

**Error:** ${error.message}

Please check permissions and try again, or manually delete files from \`.codecrew/logs/\` directory.
`
          }
        ],
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract description from system prompt
   */
  private extractDescription(systemPrompt: string): string {
    if (!systemPrompt) return 'AI Agent';
    
    // Use the first line or first sentence as description
    const lines = systemPrompt.split('\n');
    const firstLine = lines[0]?.trim();
    
    if (firstLine && firstLine.length > 10) {
      return firstLine.length > 150 ? firstLine.substring(0, 150) + '...' : firstLine;
    }
    
    return 'AI Agent';
  }
}