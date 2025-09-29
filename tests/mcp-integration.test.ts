import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  InitializeRequest,
  InitializeResultSchema,
  CallToolRequest,
  CallToolResultSchema,
  ListToolsRequest,
  ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import child_process with importOriginal to avoid mocking issues
const { execSync } = await vi.importActual('child_process') as typeof import('child_process');

const MINUTE = 60_000;

// Get current directory path
const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('CodeCrew MCP server integration test', () => {
  let client: Client;
  let transport: StdioClientTransport;
  
  beforeAll(async () => {
    console.log('Starting CodeCrew MCP server...');
    
    // Run NestJS build command
    try {
      console.log('Building NestJS project...');
      execSync('npm run build', {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit'
      });
    } catch (error) {
      console.error('Build failed:', error);
      throw error;
    }
    
    // Check built JavaScript file path
    const mainJsPath = path.resolve(__dirname, '..', 'dist/main.js');
    
    if (!fs.existsSync(mainJsPath)) {
      throw new Error(`Built file not found: ${mainJsPath}`);
    }
    
    // Create MCP client
    client = new Client({
      name: 'codecrew-test-client',
      version: '1.0.0',
    });
    
    // Create StdioClientTransport with AGENTS_CONFIG environment variable
    transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/main.js'],
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        'AGENTS_CONFIG': './example.yaml',
        'PATH': process.env.PATH || '', // 명시적으로 PATH 설정
      }
    });
    
    // Connect client and transport
    console.log('Connecting to CodeCrew MCP server...');
    await client.connect(transport);
    
    console.log('CodeCrew MCP server is ready. Starting tests.');
  });
  
  afterAll(async () => {
    // Close connection after tests
    if (transport) {
      await transport.close();
      console.log('Closed CodeCrew MCP server connection.');
    }
  });

  it('initialize test', async () => {
    const request: InitializeRequest = {
      method: 'initialize',
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          roots: { listChanged: false },
          sampling: {}
        },
        clientInfo: {
          name: "codecrew-test",
          version: "1.0.0"
        }
      }
    };

    const response = await client.request(request, InitializeResultSchema);
    console.log('Initialize Response:', JSON.stringify(response, null, 2));
    
    expect(response.serverInfo.name).toBe('codecrew');
    expect(response.serverInfo.version).toBe('0.1.0');
    expect(response.protocolVersion).toBe('2024-11-05');
  }, MINUTE);

  it('list tools test', async () => {
    const request: ListToolsRequest = {
      method: 'tools/list'
    };

    const response = await client.request(request, ListToolsResultSchema);
    console.log('Tools List Response:', JSON.stringify(response, null, 2));
    
    expect(response.tools).toBeDefined();
    expect(Array.isArray(response.tools)).toBe(true);
    expect(response.tools.length).toBeGreaterThan(0);
    
    // Check if listAgents tool exists
    const listAgentsTool = response.tools.find(tool => 
      tool.name === 'codecrew_listAgents'
    );
    expect(listAgentsTool).toBeDefined();
    expect(listAgentsTool?.description).toContain('전문가 에이전트 목록');
  }, MINUTE);

  it('listAgents tool test - external YAML config loading', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'codecrew_listAgents',
        arguments: {}
      }
    };

    const response = await client.request(request, CallToolResultSchema);
    console.log('ListAgents Response:', JSON.stringify(response, null, 2));
    
    expect(response.content).toBeDefined();
    expect(Array.isArray(response.content)).toBe(true);
    expect(response.content.length).toBeGreaterThan(0);
    
    // Parse the result from the text content
    const textContent = response.content.find(content => content.type === 'text');
    expect(textContent).toBeDefined();
    
    // Check if the response contains expected information
    expect(textContent!.text).toContain('Available AI Agents');
    expect(textContent!.text).toContain('frontend_developer');
    expect(textContent!.text).toContain('External YAML file');
    
    // Verify the additional response data (outside content)
    expect((response as any).success).toBe(true);
    expect((response as any).availableAgents).toBeDefined();
    expect(Array.isArray((response as any).availableAgents)).toBe(true);
    expect((response as any).totalCount).toBeGreaterThan(0);
    expect((response as any).configurationSource).toBe('External YAML file');
    
    // Check if agents are loaded from external YAML
    const availableAgents = (response as any).availableAgents;
    const frontendAgent = availableAgents.find((agent: any) => 
      agent.id === 'frontend_developer'
    );
    expect(frontendAgent).toBeDefined();
    
    // Verify YAML-specific data (specialties from example.yaml)
    if (frontendAgent.specialties && frontendAgent.specialties.length > 0) {
      console.log('✅ External YAML configuration successfully loaded!');
      expect(frontendAgent.specialties).toContain('React');
      expect(frontendAgent.specialties).toContain('TypeScript');
    } else {
      console.log('ℹ️ Using default configuration (YAML not loaded)');
      expect(frontendAgent.capabilities).toContain('code_analysis');
    }
    
    console.log(`📊 Total agents loaded: ${(response as any).totalCount}`);
    console.log('📋 Agent IDs:', availableAgents.map((agent: any) => agent.id));
  }, MINUTE);

  it('checkAIProviders tool test', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'codecrew_checkAIProviders',
        arguments: {}
      }
    };

    const response = await client.request(request, CallToolResultSchema);
    console.log('CheckAIProviders Response:', JSON.stringify(response, null, 2));
    
    expect(response.content).toBeDefined();
    expect(Array.isArray(response.content)).toBe(true);
    
    // The response should contain information about available AI providers
    const textContent = response.content.find(content => content.type === 'text');
    expect(textContent).toBeDefined();
    expect(textContent!.text).toContain('AI');
  }, MINUTE);

  it('analyzeProject tool test', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'codecrew_analyzeProject',
        arguments: {
          projectPath: path.resolve(__dirname, '..'),
          query: '이 프로젝트는 어떤 기술을 사용하는 NestJS 프로젝트인가요?',
          provider: 'claude',
          maxDepth: 2
        }
      }
    };

    const response = await client.request(request, CallToolResultSchema);
    console.log('AnalyzeProject Response:', JSON.stringify(response, null, 2));
    
    expect(response.content).toBeDefined();
    expect(Array.isArray(response.content)).toBe(true);
    
    // Check response structure
    const textContent = response.content.find(content => content.type === 'text');
    expect(textContent).toBeDefined();
    expect(textContent!.text.length).toBeGreaterThan(0);
    
    // Verify additional response data
    expect((response as any).success).toBe(true);
    expect((response as any).projectAnalysis).toBeDefined();
    expect((response as any).aiResponse).toBeDefined();
    
    const projectAnalysis = (response as any).projectAnalysis;
    expect(projectAnalysis.path).toContain('codecrew');
    expect(projectAnalysis.totalFiles).toBeGreaterThan(0);
    expect(Array.isArray(projectAnalysis.languages)).toBe(true);
    expect(Array.isArray(projectAnalysis.frameworks)).toBe(true);
    
    // Should detect NestJS and TypeScript
    if (projectAnalysis.frameworks.length > 0) {
      console.log('✅ Detected frameworks:', projectAnalysis.frameworks);
    }
    if (projectAnalysis.languages.length > 0) {
      console.log('✅ Detected languages:', projectAnalysis.languages);
    }
    
    const aiResponse = (response as any).aiResponse;
    expect(aiResponse.provider).toBe('claude');
    console.log('🤖 AI Response success:', aiResponse.success);
    
    if (aiResponse.success) {
      console.log('📄 AI Analysis preview:', aiResponse.content.substring(0, 200) + '...');
    } else {
      console.log('⚠️ AI Response error:', aiResponse.error);
    }
  }, 10 * MINUTE); // 10 minute timeout for AI analysis

  it('debugEnvironment tool test', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'codecrew_debugEnvironment',
        arguments: {}
      }
    };

    const response = await client.request(request, CallToolResultSchema);
    console.log('DebugEnvironment Response:', JSON.stringify(response, null, 2));
    
    expect(response.content).toBeDefined();
    expect(Array.isArray(response.content)).toBe(true);
  }, MINUTE);

  it('queryAgent tool test with frontend_developer', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'codecrew_queryAgent',
        arguments: {
          agentId: 'gmail_mcp_developer',
          query: 'README.md 파일을 분석해줘',
          context: 'Testing MCP server functionality'
        }
      }
    };

    const response = await client.request(request, CallToolResultSchema);
    console.log('QueryAgent Response:', JSON.stringify(response, null, 2));
    
    expect(response.content).toBeDefined();
    expect(Array.isArray(response.content)).toBe(true);
    
    // The response should contain the agent's response or an error message
    const textContent = response.content.find(content => content.type === 'text');
    expect(textContent).toBeDefined();
    
    // Should contain information about the query or error details
    expect(textContent!.text.length).toBeGreaterThan(0);
  }, MINUTE);

  it('getTaskLogs without taskId test', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'codecrew_getTaskLogs',
        arguments: {}
      }
    };

    const response = await client.request(request, CallToolResultSchema);
    console.log('GetTaskLogs (no taskId) Response:', JSON.stringify(response, null, 2));
    
    expect(response.content).toBeDefined();
    expect(Array.isArray(response.content)).toBe(true);
    
    // The response should contain task list or no tasks message
    const textContent = response.content.find(content => content.type === 'text');
    expect(textContent).toBeDefined();
    expect(textContent!.text.length).toBeGreaterThan(0);
  }, MINUTE);

  it('getTaskLogs with invalid taskId test', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'codecrew_getTaskLogs',
        arguments: {
          taskId: 'invalid_task_id'
        }
      }
    };

    const response = await client.request(request, CallToolResultSchema);
    console.log('GetTaskLogs (invalid taskId) Response:', JSON.stringify(response, null, 2));
    
    expect(response.content).toBeDefined();
    expect(Array.isArray(response.content)).toBe(true);
    
    // The response should contain error message
    const textContent = response.content.find(content => content.type === 'text');
    expect(textContent).toBeDefined();
    expect(textContent!.text).toContain('Task Not Found');
  }, MINUTE);

  it('complete workflow: queryAgent then getTaskLogs test', async () => {
    // First, execute a query to generate a task
    const queryRequest: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'codecrew_queryAgent',
        arguments: {
          agentId: 'mcp_developer_claude',
          query: 'What is 2+2?'
        }
      }
    };

    const queryResponse = await client.request(queryRequest, CallToolResultSchema);
    console.log('Query Agent Response:', JSON.stringify(queryResponse, null, 2));
    
    expect(queryResponse.content).toBeDefined();
    expect(Array.isArray(queryResponse.content)).toBe(true);
    
    // Extract taskId from response text
    const queryTextContent = queryResponse.content.find(content => content.type === 'text');
    expect(queryTextContent).toBeDefined();
    
    const taskIdMatch = queryTextContent!.text.match(/Task ID:\*\* (task_[a-zA-Z0-9_]+)/);
    expect(taskIdMatch).toBeTruthy();
    
    const taskId = taskIdMatch![1];
    console.log('Extracted Task ID:', taskId);
    
    // Now, get the task logs using the extracted taskId
    const logsRequest: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'codecrew_getTaskLogs',
        arguments: {
          taskId: taskId
        }
      }
    };

    const logsResponse = await client.request(logsRequest, CallToolResultSchema);
    console.log('GetTaskLogs Response:', JSON.stringify(logsResponse, null, 2));
    
    expect(logsResponse.content).toBeDefined();
    expect(Array.isArray(logsResponse.content)).toBe(true);
    
    // The response should contain detailed task information
    const logsTextContent = logsResponse.content.find(content => content.type === 'text');
    expect(logsTextContent).toBeDefined();
    expect(logsTextContent!.text).toContain('Task Details');
    expect(logsTextContent!.text).toContain(taskId);
  }, MINUTE * 2);
});