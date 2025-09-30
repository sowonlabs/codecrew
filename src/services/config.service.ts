import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

export interface AgentConfig {
  id: string;
  name?: string;
  role?: string;
  team?: string;
  working_directory?: string;
  options?: {
    query?: string[];
    execute?: string[];
  };
  inline?: {
    type: 'agent';
    provider: 'claude' | 'gemini' | 'copilot';
    system_prompt: string;
  };
}

@Injectable()
export class ConfigService implements OnModuleInit {
  private readonly logger = new Logger(ConfigService.name);
  private agents: Map<string, AgentConfig> = new Map();

  onModuleInit() {
    this.loadAgentConfigs();
  }

  private loadAgentConfigs() {
    const configPath = path.join(process.cwd(), 'agents.yaml');
    this.logger.log(`Loading agent configurations from: ${configPath}`);

    if (!existsSync(configPath)) {
      this.logger.warn('agents.yaml not found. No agent configurations loaded.');
      return;
    }

    try {
      const configContent = readFileSync(configPath, 'utf8');
      const config = yaml.load(configContent) as any;

      if (config.agents && Array.isArray(config.agents)) {
        for (const agent of config.agents) {
          if (agent.id) {
            this.agents.set(agent.id, agent);
          }
        }
        this.logger.log(`Loaded ${this.agents.size} agent configurations.`);
      }
    } catch (error) {
      this.logger.error('Failed to load or parse agents.yaml', error);
    }
  }

  getAgentConfig(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId);
  }

  getAllAgentIds(): string[] {
    return Array.from(this.agents.keys());
  }
}
