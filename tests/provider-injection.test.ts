import { Test, TestingModule } from '@nestjs/testing';
import { AIProviderService } from '../src/ai-provider.service';
import { ClaudeProvider } from '../src/providers/claude.provider';
import { CopilotProvider } from '../src/providers/copilot.provider';
import { GeminiProvider } from '../src/providers/gemini.provider';
import { StderrLogger } from '../src/stderr.logger';

describe('Provider Injection Test', () => {
  it('should instantiate AIProviderService with providers', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIProviderService,
        ClaudeProvider,
        CopilotProvider,
        GeminiProvider,
      ],
    }).compile();

    const service = module.get<AIProviderService>(AIProviderService);
    expect(service).toBeDefined();
  });
});
