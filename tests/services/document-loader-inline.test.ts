import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentLoaderService } from '../../src/services/document-loader.service';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('DocumentLoaderService - Inline Content', () => {
  let service: DocumentLoaderService;
  const projectPath = path.resolve(__dirname, '../../');

  beforeEach(() => {
    service = new DocumentLoaderService();
  });

  describe('raw markdown string format', () => {
    it('should load inline markdown from yaml string', async () => {
      // Use test-documents.yaml which has inline content
      await service.initialize(projectPath);
      
      // Override to use test config
      service = new DocumentLoaderService();
      // Temporarily create a test documents.yaml
      const testConfig = `
documents:
  inline-test: |
    # Inline Document
    This is raw markdown content.
    ## Section 1
    Content here.
`;
      const testPath = path.join(projectPath, 'test-inline-docs.yaml');
      await fs.writeFile(testPath, testConfig, 'utf-8');
      
      try {
        // Load from test file by setting DOCUMENTS_CONFIG env
        const originalEnv = process.env.DOCUMENTS_CONFIG;
        process.env.DOCUMENTS_CONFIG = testPath;
        
        await service.initialize(projectPath);
        
        const content = await service.getDocumentContent('inline-test');
        expect(content).toBeDefined();
        expect(content).toContain('# Inline Document');
        expect(content).toContain('## Section 1');
        
        const toc = await service.getDocumentToc('inline-test');
        expect(toc).toContain('# Inline Document');
        expect(toc).toContain('## Section 1');
        
        // Restore env
        if (originalEnv) {
          process.env.DOCUMENTS_CONFIG = originalEnv;
        } else {
          delete process.env.DOCUMENTS_CONFIG;
        }
      } finally {
        // Clean up test file
        await fs.unlink(testPath).catch(() => {});
      }
    });
  });

  describe('documents.yaml with multiple formats', () => {
    it('should handle mix of inline and file-based documents', async () => {
      await service.initialize(projectPath);
      
      const names = service.getDocumentNames();
      expect(names.length).toBeGreaterThan(0);
      
      // Should have inline documents
      expect(names).toContain('quick-tips');
      expect(names).toContain('coding-standards');
      
      // Should have file-based documents
      expect(names).toContain('readme');
      
      // Test inline document content
      const quickTips = await service.getDocumentContent('quick-tips');
      expect(quickTips).toBeDefined();
      expect(quickTips).toContain('Quick Tips');
      
      const codingStandards = await service.getDocumentContent('coding-standards');
      expect(codingStandards).toBeDefined();
      expect(codingStandards).toContain('Coding Standards');
    });
  });
});
