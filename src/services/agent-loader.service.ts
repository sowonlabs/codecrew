import { Injectable, Logger, Optional } from '@nestjs/common';
import { AgentInfo } from '../agent.types';
import * as yaml from 'js-yaml';
import { readFile } from 'fs/promises';
import { getErrorMessage } from '../utils/error-utils';
import type { TemplateContext } from '../utils/template-processor';
import { DocumentLoaderService } from './document-loader.service';
import { TemplateService } from './template.service';

/**
 * AgentLoaderService - Centralized agent configuration loading
 *
 * This service provides a single source of truth for loading agent configurations,
 * eliminating code duplication between ToolCallService and CodeCrewTool.
 *
 * Benefits:
 * - No circular dependencies
 * - Single responsibility (only loads agent data)
 * - Easy to test and maintain
 * - - Can be used by any service that needs agent information
 */
@Injectable()
export class AgentLoaderService {
  private readonly logger = new Logger('AgentLoaderService');

  constructor(
    @Optional() private readonly documentLoaderService?: DocumentLoaderService,
    @Optional() private readonly templateService?: TemplateService,
  ) {}

  /**
   * Default CLI agents that are always available
   */
  private readonly defaultCliAgents: AgentInfo[] = [
    {
      id: 'claude',
      name: 'Claude AI',
      role: 'AI Assistant',
      team: 'AI Team',
      provider: 'claude',
      workingDirectory: './',
      capabilities: ['general_assistance', 'code_analysis', 'writing'],
      description: 'Claude AI assistant for general tasks, code analysis, and writing assistance.',
      specialties: ['General AI', 'Code Analysis', 'Writing', 'Problem Solving'],
    },
    {
      id: 'gemini',
      name: 'Gemini AI',
      role: 'AI Assistant',
      team: 'AI Team',
      provider: 'gemini',
      workingDirectory: './',
      capabilities: ['general_assistance', 'code_analysis', 'research'],
      description: 'Gemini AI assistant for general tasks, code analysis, and research assistance.',
      specialties: ['General AI', 'Code Analysis', 'Research', 'Data Analysis'],
    },
    {
      id: 'copilot',
      name: 'GitHub Copilot',
      role: 'AI Assistant',
      team: 'AI Team',
      provider: 'copilot',
      workingDirectory: './',
      capabilities: ['code_generation', 'code_completion', 'debugging'],
      description: 'GitHub Copilot AI assistant for code generation, completion, and debugging.',
      specialties: ['Code Generation', 'Code Completion', 'Debugging', 'GitHub Integration'],
    },
  ];

  /**
   * Get all available agents (using loadAvailableAgents)
   * Simple wrapper for backward compatibility
   *
   * @returns Promise<AgentInfo[]> - Combined list of all agents
   */
  async getAllAgents(): Promise<AgentInfo[]> {
    return this.loadAvailableAgents();
  }

  /**
   * Get default CLI agents only
   */
  getDefaultCliAgents(): AgentInfo[] {
    return [...this.defaultCliAgents];
  }

  /**
   * Get configuration source info
   */
  getConfigSource(): { source: string; path?: string } {
    const agentsConfigPath = process.env.AGENTS_CONFIG;
    return {
      source: agentsConfigPath ? 'External YAML file' : 'Default hardcoded values',
      path: agentsConfigPath,
    };
  }

  /**
   * Load all available agents (built-in + user-defined)
   * This is the main entry point for loading agents
   */
  async loadAvailableAgents(): Promise<AgentInfo[]> {
    try {
      let allAgents: AgentInfo[] = [];

      // 1. Load built-in agents from template (cached or from GitHub)
      this.logger.log('Loading built-in agents from template...');
      try {
        const builtInAgents = await this.loadBuiltInAgents();
        allAgents = [...builtInAgents];
        this.logger.log(`Loaded ${builtInAgents.length} built-in agents`);
      } catch (error) {
        this.logger.warn('Failed to load built-in agents, using fallback defaults');
        // Fallback to hardcoded defaults if template loading fails
        allAgents = [...this.defaultCliAgents];
      }

      // 2. Load user-defined agents from agents.yaml (if exists)
      const path = await import('path');
      const agentsConfigPath = process.env.AGENTS_CONFIG || path.join(process.cwd(), 'agents.yaml');
      this.logger.log(`Loading user agents from config: ${agentsConfigPath}`);

      try {
        const userAgents = await this.loadAgentsFromConfig(agentsConfigPath);
        this.logger.log(`Loaded ${userAgents.length} user-defined agents`);

        // 3. Merge: user agents can override built-in agents with same ID
        const builtInIds = new Set(allAgents.map((a) => a.id));
        const newUserAgents = userAgents.filter((a) => !builtInIds.has(a.id));
        const overrideUserAgents = userAgents.filter((a) => builtInIds.has(a.id));

        // Replace built-in agents with user overrides
        for (const userAgent of overrideUserAgents) {
          const index = allAgents.findIndex((a) => a.id === userAgent.id);
          if (index >= 0) {
            this.logger.log(`User config overrides built-in agent: ${userAgent.id}`);
            allAgents[index] = userAgent;
          }
        }

        // Add new user agents
        allAgents = [...allAgents, ...newUserAgents];
      } catch (error) {
        this.logger.log('No user agents.yaml found or failed to load, using built-in agents only');
      }

      this.logger.log(`Total agents loaded: ${allAgents.length}`);
      return allAgents;
    } catch (error) {
      this.logger.error('Failed to load agents:', getErrorMessage(error));
      return [...this.defaultCliAgents]; // Ultimate fallback
    }
  }

  /**
   * Load built-in agents from template service
   */
  private async loadBuiltInAgents(): Promise<AgentInfo[]> {
    try {
      let templateContent: string;

      // Try local template first
      try {
        const path = await import('path');
        const fs = await import('fs/promises');
        const templatePath = path.join(__dirname, '..', '..', 'templates', 'agents', 'default.yaml');
        templateContent = await fs.readFile(templatePath, 'utf-8');
        this.logger.log('Loaded built-in agents from local template');
      } catch (localError) {
        // Fallback to GitHub download
        if (!this.templateService) {
          throw new Error('TemplateService not available for GitHub download');
        }
        this.logger.log('Local template not found, trying GitHub...');
        templateContent = await this.templateService.downloadTemplate('default', 'main');
        this.logger.log('Loaded built-in agents from GitHub template');
      }

      const config = yaml.load(templateContent) as any;

      if (!config.agents || !Array.isArray(config.agents)) {
        throw new Error('Invalid template: missing agents array');
      }

      // Initialize DocumentLoaderService with built-in documents
      if (this.documentLoaderService) {
        const path = await import('path');
        const projectPath = path.dirname(process.env.AGENTS_CONFIG || 'agents.yaml');
        await this.documentLoaderService.initialize(projectPath, config.documents);
      }

      // Process templates
      const processedAgents = await Promise.all(
        config.agents.map(async (agent: any) => {
          let systemPrompt = agent.inline?.system_prompt;

          // Process system_prompt template with documents and context
          if (systemPrompt && this.documentLoaderService) {
            const { processDocumentTemplate } = await import('../utils/template-processor');
            const crypto = await import('crypto');
            const securityKey = crypto.randomBytes(8).toString('hex');

            // Build template context
            const templateContext: TemplateContext = {
              env: process.env,
              agent: {
                id: agent.id,
                name: agent.name || agent.id,
                provider: agent.provider || agent.inline?.provider || 'claude',
                model: agent.inline?.model,
                workingDirectory: agent.working_directory || agent.workingDirectory || './',
              },
              tools: undefined, // Will be filled by caller if needed
              vars: {
                security_key: securityKey,
              },
            };

            systemPrompt = await processDocumentTemplate(systemPrompt, this.documentLoaderService, templateContext);
            this.logger.debug(`Processed template for built-in agent: ${agent.id}`);
          }

          return {
            id: agent.id,
            name: agent.name || agent.id,
            role: agent.role || 'AI Agent',
            team: agent.team,
            provider: this.parseProviderConfig(agent),
            workingDirectory: agent.working_directory || './',
            capabilities: agent.capabilities || [],
            description: systemPrompt ? this.extractDescription(systemPrompt) : `${agent.name || agent.id} agent`,
            specialties: agent.specialties || [],
            systemPrompt: systemPrompt,
            options: agent.options || [],
            inline: agent.inline,
          };
        })
      );

      return processedAgents;
    } catch (error) {
      this.logger.error('Failed to load built-in agents from template:', getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Load agent configuration from YAML/JSON config file
   * Enhanced version that handles templates and documents
   */
  async loadAgentsFromConfig(configPath: string): Promise<AgentInfo[]> {
    try {
      const path = await import('path');

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

      // Initialize DocumentLoaderService with project-level documents from agents.yaml
      if (this.documentLoaderService) {
        const projectPath = path.dirname(configPath);
        await this.documentLoaderService.initialize(projectPath, config.documents);
      }

      // Process templates using the template-processor utility
      const agents = await Promise.all(
        config.agents.map(async (agent: any) => {
          let systemPrompt = agent.inline?.system_prompt;

          // Process system_prompt template with documents and context
          if (systemPrompt && this.documentLoaderService) {
            const { processDocumentTemplate } = await import('../utils/template-processor');

            // Build template context
            const templateContext: TemplateContext = {
              env: process.env,
              agent: {
                id: agent.id,
                name: agent.name || agent.id,
                provider: agent.provider || agent.inline?.provider || 'claude',
                model: agent.inline?.model,
                workingDirectory: agent.working_directory || agent.workingDirectory,
              },
              tools: undefined, // Will be filled by caller if needed
              vars: {},
            };

            // Merge agent-specific documents if present
            if (agent.inline?.documents) {
              // Create temporary merged document definitions for this agent
              const mergedDocs = await this.documentLoaderService.mergeAgentDocuments(agent.inline.documents);
              // For template processing, we need to temporarily use merged docs
              const originalDefs = this.documentLoaderService.getDocumentDefinitions();
              (this.documentLoaderService as any).documentDefinitions = mergedDocs;

              systemPrompt = await processDocumentTemplate(systemPrompt, this.documentLoaderService, templateContext);

              // Restore original definitions
              (this.documentLoaderService as any).documentDefinitions = originalDefs;
            } else {
              systemPrompt = await processDocumentTemplate(systemPrompt, this.documentLoaderService, templateContext);
            }

            this.logger.debug(`Processed template for agent: ${agent.id}`);
          }

          return {
            id: agent.id,
            name: agent.name || agent.id,
            role: agent.role || 'AI Agent',
            team: agent.team,
            provider: this.parseProviderConfig(agent),
            workingDirectory: agent.working_directory || './',
            capabilities: agent.capabilities || [],
            description: systemPrompt ? this.extractDescription(systemPrompt) : `${agent.name || agent.id} agent`,
            specialties: agent.specialties || [],
            systemPrompt: systemPrompt,
            options: agent.options || [],
            inline: agent.inline, // Pass inline configuration including model
          };
        })
      );

      return agents;
    } catch (error) {
      this.logger.error(`Failed to load agents config from ${configPath}:`, getErrorMessage(error));
      // Return empty array if config loading fails
      return [];
    }
  }

  /**
   * Parse provider from agent configuration
   * Supports both single string and array formats
   */
  private parseProviderConfig(agent: any): 'claude' | 'gemini' | 'copilot' | ('claude' | 'gemini' | 'copilot')[] {
    // Priority: agent.provider > agent.inline.provider > default 'claude'
    const configProvider = agent.provider || agent.inline?.provider;

    if (Array.isArray(configProvider)) {
      // Already an array: use as-is
      return configProvider as ('claude' | 'gemini' | 'copilot')[];
    } else if (typeof configProvider === 'string') {
      // Single string: use as-is
      return configProvider as 'claude' | 'gemini' | 'copilot';
    } else {
      // No provider specified: default to 'claude'
      return 'claude';
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
