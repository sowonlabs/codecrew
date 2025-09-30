export interface AgentConfig {
  id: string;
  working_directory: string;
  inline: {
    type: 'agent';
    provider: 'claude' | 'gemini' | 'copilot';
    system_prompt: string;
  };
  tools?: string[]; // Available tools
  capabilities?: {
    autonomous_work?: boolean; // Whether autonomous work is possible
    file_operations?: boolean; // File manipulation permissions
    tool_access?: string[]; // List of accessible tools
  };
}

export interface AgentsConfig {
  agents: AgentConfig[];
}

export interface AgentQueryOptions {
  workingDirectory?: string;
  context?: string; // Additional context
  timeout?: number;
  readOnlyMode?: boolean; // Read-only mode (no modification operations)
}

export interface AgentResponse {
  content: string;
  agent: string;
  provider: string;
  command: string;
  success: boolean;
  error?: string;
  actions?: AgentAction[]; // Executed actions
  readOnly?: boolean; // Whether executed in read-only mode
  taskId?: string; // Task ID for tracking
}

export interface AgentAction {
  type: 'file_read' | 'file_write' | 'tool_call' | 'analysis';
  target: string;
  result: string;
  timestamp: Date;
}

export interface AgentInfo {
  id: string;
  name?: string;
  role?: string;
  team?: string;
  provider: 'claude' | 'gemini' | 'copilot';
  workingDirectory: string;
  capabilities: string[];
  description: string;
  specialties?: string[];
  systemPrompt?: string;
  options?: string[]; // Flexible CLI options array (e.g., ["--allowedTools=Edit,Bash", "--add-dir=."])
}