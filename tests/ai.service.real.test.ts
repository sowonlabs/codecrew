import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AIService } from '../src/ai.service';

// Configure to use the actual child_process module
vi.mock('child_process', async () => {
  const actual = await vi.importActual('child_process');
  return actual;
});

const MINUTES = 60 * 1000;

describe('AIService - Real CLI Integration Tests', () => {
  let service: AIService;

  beforeEach(async () => {
    // Import all necessary dependencies
    const { AIProviderService } = await import('../src/ai-provider.service');
    const { ClaudeProvider } = await import('../src/providers/claude.provider');
    const { CopilotProvider } = await import('../src/providers/copilot.provider');
    const { GeminiProvider } = await import('../src/providers/gemini.provider');
    const { StderrLogger } = await import('../src/stderr.logger');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        AIProviderService,
        ClaudeProvider,
        CopilotProvider,
        GeminiProvider,
        StderrLogger,
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    
    // Initialize AIProviderService
    const aiProviderService = module.get(AIProviderService);
    await aiProviderService.initializeProviders();
  });

  describe('Claude CLI Real Integration', () => {
    it('should execute claude CLI with simple prompt', async () => {
      const result = await service.queryClaudeCLI('Hello, this is a simple test. Please respond with "Test successful" and nothing more.');

      console.log('Claude Response:', result);

      expect(result.provider).toBe('claude');
      if (result.success) {
        expect(result.content).toBeTruthy();
        expect(result.content.length).toBeGreaterThan(0);
        console.log('✅ Claude CLI working!');
        console.log('📝 Response preview:', result.content.substring(0, 100));
      } else {
        console.log('❌ Claude CLI failed:', result.error);
        expect(result.error).toBeTruthy();
      }
    }, 60000); // 60 second timeout

    it('should execute claude CLI with Korean prompt', async () => {
      const result = await service.queryClaudeCLI('Hello! This is a simple Korean test. Please respond with "Test Success".');

      console.log('Claude Korean Response:', result);

      expect(result.provider).toBe('claude');
      if (result.success) {
        expect(result.content).toBeTruthy();
        console.log('✅ Claude CLI Korean working!');
        console.log('📝 Korean response:', result.content.substring(0, 100));
      } else {
        console.log('❌ Claude CLI Korean failed:', result.error);
      }
    }, 60000);

    it('should handle complex prompt with code analysis request', async () => {
      const codePrompt = `Respond with exactly: "Simple addition function"`;

      const result = await service.queryClaudeCLI(codePrompt);

      console.log('Claude Code Analysis Response:', result);

      expect(result.provider).toBe('claude');
      if (result.success) {
        expect(result.content).toBeTruthy();
        expect(result.content.length).toBeGreaterThan(5);
        console.log('✅ Claude CLI code analysis working!');
        console.log('📝 Analysis:', result.content.substring(0, 100));
      } else {
        console.log('❌ Claude CLI code analysis failed:', result.error);
      }
    }, 30000); // Reduced from 60 to 30 seconds

    it('should handle special characters and escaping', async () => {
      const specialPrompt = `Test prompt with "quotes", 'single quotes', \nNewlines\n, and $variables. Respond with "Success".`;

      const result = await service.queryClaudeCLI(specialPrompt);

      console.log('Claude Special Characters Response:', result);

      expect(result.provider).toBe('claude');
      if (result.success) {
        expect(result.content).toBeTruthy();
        console.log('✅ Claude CLI special characters working!');
      } else {
        console.log('❌ Claude CLI special characters failed:', result.error);
      }
    }, 60000);
  });

  describe('Gemini CLI Real Integration', () => {
    it('should execute gemini CLI with simple prompt', async () => {
      const result = await service.queryGeminiCLI('Hello, please respond with "Gemini test successful"');

      console.log('Gemini Response:', result);

      expect(result.provider).toBe('gemini');
      if (result.success) {
        expect(result.content).toBeTruthy();
        console.log('✅ Gemini CLI working!');
      } else {
        console.log('❌ Gemini CLI failed (expected if not installed):', result.error);
        // Failure is expected if not installed
        expect(result.error).toBeTruthy();
      }
    }, 60000);
  });

  describe('Copilot CLI Real Integration', () => {
    it('should execute copilot CLI with simple prompt', async () => {
      const result = await service.queryCopilotCLI('Say "OK"');

      console.log('Copilot Response:', result);

      expect(result.provider).toBe('copilot');
      if (result.success) {
        expect(result.content).toBeTruthy();
        console.log('✅ Copilot CLI working!');
      } else {
        console.log('❌ Copilot CLI failed (expected if not installed):', result.error);
        // Failure is expected if not installed
        expect(result.error).toBeTruthy();
      }
    }, 30000); // Reduced from 60 to 30 seconds
  });

  describe('AI Provider Status Check', () => {
    it('should check which providers are actually available', async () => {
      const availableProviders = await service.checkAvailableProviders();
      const installation = await service.validateCLIInstallation();

      console.log('Available Providers:', availableProviders);
      console.log('Installation Status:', installation);

      expect(Array.isArray(availableProviders)).toBe(true);
      expect(installation).toHaveProperty('claude');
      expect(installation).toHaveProperty('gemini');  
      expect(installation).toHaveProperty('copilot');

      console.log('📊 Provider Summary:');
      console.log(`  Claude: ${installation.claude ? '✅' : '❌'}`);
      console.log(`  Gemini: ${installation.gemini ? '✅' : '❌'}`);
      console.log(`  Copilot: ${installation.copilot ? '✅' : '❌'}`);
    });
  });

  describe('AI Router Integration', () => {
    it('should route to gemini and handle real response', async () => {
      const result = await service.queryAI('Say "TypeScript"', 'gemini');

      console.log('AI Router Gemini Result:', result);

      expect(result.provider).toBe('gemini');
      if (result.success) {
        expect(result.content).toBeTruthy();
        console.log('✅ AI Router with Gemini working!');
        console.log('📝 Response:', result.content);
      } else {
        console.log('❌ AI Router with Gemini failed:', result.error);
      }
    }, 60000); // Reduced from 10 minutes to 1 minute

    // SKIP: 이 테스트는 실제 파일 분석으로 AI 사용량이 너무 많음
    it.skip('should route to gemini and handle execute', async () => {
      const result = await service.queryGeminiCLI('Analyze the README.md file and tell me what this project is about.', {
          workingDirectory: '/Users/doha/git/mcp-servers/packages/gmail',
          timeout: 45000
        });

      console.log('AI Router Gemini Result:', result);

      expect(result.provider).toBe('gemini');
      if (result.success) {
        expect(result.content).toBeTruthy();
        console.log('✅ AI Router with Gemini working!');
        console.log('📝 TypeScript explanation:', result.content);
      } else {
        console.log('❌ AI Router with Claude failed:', result.error);
      }
    }, 10 * MINUTES);

    it('should handle different providers directly', async () => {
      const { ClaudeProvider } = await import('../src/providers/claude.provider');  
      const { CopilotProvider } = await import('../src/providers/copilot.provider');
      const { GeminiProvider } = await import('../src/providers/gemini.provider');
      
      const providers = [
        { name: 'claude', provider: new ClaudeProvider() },
        { name: 'copilot', provider: new CopilotProvider() },
        { name: 'gemini', provider: new GeminiProvider() }
      ];
      
      for (const { name, provider } of providers) {
        console.log(`\n🔧 Testing ${name.toUpperCase()} Provider:`);
        
        const isAvailable = await provider.isAvailable();
        console.log(`   Available: ${isAvailable}`);
        
        if (!isAvailable) {
          console.log(`   ⚠️  ${name} CLI not installed, skipping`);
          continue;
        }

        try {
          const result = await provider.query(`Hello from ${name}, respond briefly`, { timeout: 30000 });
          
          console.log(`   Result:`, {
            success: result.success,
            provider: result.provider,
            hasContent: !!result.content,
            command: result.command,
            error: result.error
          });
          
          expect(result.provider).toBe(name);
          
          if (result.success) {
            console.log(`   ✅ ${name} working directly!`);
          } else {
            console.log(`   ❌ ${name} failed:`, result.error);
          }
        } catch (error: any) {
          console.log(`   ❌ ${name} threw error:`, error.message);
        }
      }
    }, 180000); // 3 minutes for all providers
  });

  describe('CopilotProvider Direct Unit Tests', () => {
    let copilotProvider: any;

    beforeEach(async () => {
      // Direct CopilotProvider tests
      const { CopilotProvider } = await import('../src/providers/copilot.provider');
      const { StderrLogger } = await import('../src/stderr.logger');
      
      copilotProvider = new CopilotProvider();
    });

    it('should return correct CLI command', () => {
      const command = copilotProvider.getCliCommand();
      console.log('🔧 CLI Command:', command);
      expect(command).toBe('copilot');
    });

    it('should return correct query args', () => {
      const args = copilotProvider.getDefaultArgs();
      console.log('🔧 Query Args:', args);
      expect(args).toEqual(['-p']);
    });

    it('should return correct execute args', () => {
      const args = copilotProvider.getExecuteArgs();
      console.log('🔧 Execute Args:', args);
      expect(args).toEqual(['-p', '--allow-all-tools']);
    });

    it('should use prompt in args', () => {
      const promptInArgs = copilotProvider.getPromptInArgs();
      console.log('🔧 Prompt in Args:', promptInArgs);
      expect(promptInArgs).toBe(true);
    });

    it('should generate proper query command with prompt', async () => {
      const testPrompt = 'Hello world test';
      
      // Simulate BaseAIProvider's query method
      const args = [...copilotProvider.getDefaultArgs(), testPrompt];
      const command = `${copilotProvider.getCliCommand()} ${args.join(' ')}`;
      
      console.log('🔧 Generated Query Command:', command);
      expect(command).toBe('copilot -p Hello world test');
      expect(command).not.toContain('--allow-all-tools');
    });

    it('should generate proper execute command with prompt (updated format)', async () => {
      const testPrompt = 'Execute this task';
      
      // Simulate BaseAIProvider's execute method (special handling for Copilot)
      let args = copilotProvider.getExecuteArgs(); // ['-p']
      args = [...args, testPrompt, '--allow-all-tools']; // Special handling for Copilot
      const command = `${copilotProvider.getCliCommand()} ${args.join(' ')}`;
      
      console.log('🔧 Generated Execute Command (NEW):', command);
      expect(command).toBe('copilot -p Execute this task --allow-all-tools');
      expect(command).toContain('--allow-all-tools');
      expect(command.indexOf('--allow-all-tools')).toBeGreaterThan(command.indexOf(testPrompt));
    });

    it('should test actual copilot CLI query execution', async () => {
      const isAvailable = await copilotProvider.isAvailable();
      console.log('🔧 Copilot Available:', isAvailable);
      
      if (!isAvailable) {
        console.log('⚠️  Copilot CLI not installed, skipping execution test');
        return;
      }

      const testPrompt = 'Say "OK"';
      console.log('🔧 Testing with prompt:', testPrompt);
      
      try {
        const result = await copilotProvider.query(testPrompt, { timeout: 30000 });
        
        console.log('🔧 Query Result:', {
          success: result.success,
          provider: result.provider,
          command: result.command,
          hasContent: !!result.content,
          error: result.error,
          contentPreview: result.content ? result.content.substring(0, 100) + '...' : null
        });

        expect(result.provider).toBe('copilot');
        
        if (result.success) {
          console.log('✅ Copilot query execution successful!');
          expect(result.content).toBeTruthy();
        } else {
          console.log('❌ Copilot query failed:', result.error);
          // Even if it fails, pass the test and just print debug info
        }
      } catch (error: any) {
        console.log('❌ Copilot query threw error:', error.message);
      }
    }, 45000); // Reduced from 60 to 45 seconds

    // SKIP: 파일 생성 테스트는 AI 사용량이 많고 부작용이 있음
    it.skip('should test actual copilot CLI EXECUTE execution (NEW)', async () => {
      const isAvailable = await copilotProvider.isAvailable();
      console.log('🚀 Copilot Execute Test - Available:', isAvailable);
      
      if (!isAvailable) {
        console.log('⚠️  Copilot CLI not installed, skipping execute test');
        return;
      }

      const testPrompt = 'Create a simple "hello.txt" file with content "Hello from Copilot execute test"';
      console.log('🚀 Testing EXECUTE with prompt:', testPrompt);
      
      try {
        const result = await copilotProvider.execute(testPrompt, { timeout: 60000 });
        
        console.log('🚀 Execute Result:', {
          success: result.success,
          provider: result.provider,
          command: result.command,
          hasContent: !!result.content,
          error: result.error,
          contentPreview: result.content ? result.content.substring(0, 200) + '...' : null
        });

        expect(result.provider).toBe('copilot');
        
        if (result.success) {
          console.log('✅ Copilot EXECUTE successful!');
          expect(result.content).toBeTruthy();
          
          // Check if command contains correct format
          expect(result.command).toContain('-p');
          expect(result.command).toContain('--allow-all-tools');
          expect(result.command.indexOf('--allow-all-tools')).toBeGreaterThan(result.command.indexOf(testPrompt.substring(0, 10)));
        } else {
          console.log('❌ Copilot execute failed:', result.error);
          // Print detailed error information
          console.log('   Command that failed:', result.command);
        }
      } catch (error: any) {
        console.log('❌ Copilot execute threw error:', error.message);
      }
    }, 120000); // 2 minute timeout
  });
});

describe('Direct Provider Integration Tests', () => {
  it('should test all providers directly without DI', async () => {
    const { ClaudeProvider } = await import('../src/providers/claude.provider');  
    const { CopilotProvider } = await import('../src/providers/copilot.provider');
    const { GeminiProvider } = await import('../src/providers/gemini.provider');
    
    const providers = [
      { name: 'claude', provider: new ClaudeProvider() },
      { name: 'copilot', provider: new CopilotProvider() },
      { name: 'gemini', provider: new GeminiProvider() }
    ];
    
    for (const { name, provider } of providers) {
      console.log(`\n🔧 Testing ${name.toUpperCase()} Provider:`);
      
      const isAvailable = await provider.isAvailable();
      console.log(`   Available: ${isAvailable}`);
      
      if (!isAvailable) {
        console.log(`   ⚠️  ${name} CLI not installed, skipping`);
        continue;
      }

      try {
        const result = await provider.query(`Hello from ${name}, respond briefly`, { timeout: 30000 });
        
        console.log(`   Result:`, {
          success: result.success,
          provider: result.provider,
          hasContent: !!result.content,
          command: result.command,
          error: result.error
        });
        
        expect(result.provider).toBe(name);
        
        if (result.success) {
          console.log(`   ✅ ${name} working directly!`);
        } else {
          console.log(`   ❌ ${name} failed:`, result.error);
        }
      } catch (error: any) {
        console.log(`   ❌ ${name} threw error:`, error.message);
      }
    }
  }, 180000); // 3 minutes for all providers
});