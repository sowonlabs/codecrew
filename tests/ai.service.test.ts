import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AIService } from '../src/ai.service';
import { EventEmitter } from 'events';
import * as child_process from 'child_process';

describe('AIService - Unit Tests', () => {
  let service: AIService;
  let mockedSpawn: any;
  let mockedExecSync: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AIService],
    }).compile();

    service = module.get<AIService>(AIService);

    const mockSpawnInstance = new EventEmitter();
    mockSpawnInstance.stdout = new EventEmitter();
    mockSpawnInstance.stderr = new EventEmitter();
    mockSpawnInstance.kill = vi.fn();
    mockSpawnInstance.stdin = { write: vi.fn(), end: vi.fn() };

    mockedSpawn = vi.spyOn(child_process, 'spawn').mockReturnValue(mockSpawnInstance as any);
    mockedExecSync = vi.spyOn(child_process, 'execSync').mockReturnValue('' as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('queryClaudeCLI', () => {
    it('should return a successful response from Claude CLI', async () => {
      const mockResponse = {
        content: 'Hello from Claude!',
        provider: 'claude',
        command: 'claude -p (stdin)',
        success: true,
      };
      vi.spyOn(service, 'queryClaudeCLI').mockResolvedValue(mockResponse);

      const result = await service.queryClaudeCLI('Hello!');
      expect(result.success).toBe(true);
      expect(result.content).toBe('Hello from Claude!');
      expect(service.queryClaudeCLI).toHaveBeenCalledWith(
        'Hello!',
        expect.any(Object)
      );
    });

    it('should handle claude command errors', async () => {
      mockedSpawn.stderr.emit('data', 'Command failed');
      mockedSpawn.emit('close', 1);

      const result = await service.queryClaudeCLI('Test prompt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Command failed');
      expect(result.provider).toBe('claude');
    });

    it('should handle claude command timeout', async () => {
      // Simulate a timeout by not emitting 'close'
      const result = await service.queryClaudeCLI('Test prompt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Command timed out');
      expect(result.provider).toBe('claude');
      expect(mockedSpawn.kill).toHaveBeenCalled();
    });
  });

  describe('queryGeminiCLI', () => {
    it('should execute gemini command successfully', async () => {
      mockedSpawn.stdout.emit('data', 'This is a test response from Gemini');
      mockedSpawn.emit('close', 0);

      const result = await service.queryGeminiCLI('Test prompt');

      expect(result.success).toBe(true);
      expect(result.content).toBe('This is a test response from Gemini');
      expect(result.provider).toBe('gemini');
      expect(mockedSpawn).toHaveBeenCalledWith(
        expect.stringContaining('gemini'),
        expect.arrayContaining(['Test prompt']),
        expect.objectContaining({
          timeout: 30000,
        }),
      );
    });
  });

  describe('queryCopilotCLI', () => {
    it('should execute github copilot command successfully', async () => {
      mockedSpawn.stdout.emit('data', 'This is a test response from GitHub Copilot');
      mockedSpawn.emit('close', 0);

      const result = await service.queryCopilotCLI('Test prompt');

      expect(result.success).toBe(true);
      expect(result.content).toBe('This is a test response from GitHub Copilot');
      expect(result.provider).toBe('copilot');
      expect(mockedSpawn).toHaveBeenCalledWith(
        expect.stringContaining('gh'),
        expect.arrayContaining(['copilot', 'suggest', 'Test prompt']),
        expect.objectContaining({
          timeout: 30000,
        }),
      );
    });

    it('should handle github copilot command errors', async () => {
      mockedSpawn.stderr.emit('data', 'Command failed');
      mockedSpawn.emit('close', 1);

      const result = await service.queryCopilotCLI('Test prompt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Command failed');
      expect(result.provider).toBe('copilot');
    });

    it('should handle github copilot command timeout', async () => {
      // Simulate a timeout by not emitting 'close'
      const result = await service.queryCopilotCLI('Test prompt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Command timed out');
      expect(result.provider).toBe('copilot');
      expect(mockedSpawn.kill).toHaveBeenCalled();
    });
  });

  describe('checkAvailableProviders', () => {
    it('should detect available CLI tools', async () => {
      mockedExecSync
        .mockReturnValueOnce('claude help output')
        .mockImplementationOnce(() => {
          throw new Error('Command not found');
        })
        .mockReturnValueOnce('gh copilot help output');

      const providers = await service.checkAvailableProviders();

      expect(providers).toContain('claude');
      expect(providers).not.toContain('gemini');
      expect(providers).toContain('copilot');
    });
  });
});