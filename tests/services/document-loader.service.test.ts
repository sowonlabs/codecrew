import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentLoaderService } from '../../src/services/document-loader.service';
import * as path from 'path';

describe('DocumentLoaderService', () => {
  let service: DocumentLoaderService;
  const projectPath = path.resolve(__dirname, '../../');

  beforeEach(() => {
    service = new DocumentLoaderService();
  });

  describe('initialization', () => {
    it('should initialize with documents.yaml', async () => {
      await service.initialize(projectPath);
      
      expect(service.isInitialized()).toBe(true);
      const names = service.getDocumentNames();
      expect(names.length).toBeGreaterThan(0);
      expect(names).toContain('readme');
    });

    it('should handle missing documents.yaml gracefully', async () => {
      await service.initialize('/nonexistent/path');
      
      expect(service.isInitialized()).toBe(true);
      expect(service.getDocumentNames()).toHaveLength(0);
    });
  });

  describe('document access', () => {
    beforeEach(async () => {
      await service.initialize(projectPath);
    });

    it('should get document content', async () => {
      const content = await service.getDocumentContent('readme');
      
      expect(content).toBeDefined();
      expect(content).toContain('CodeCrew Documentation');
    });

    it('should get document TOC', async () => {
      const toc = await service.getDocumentToc('readme');
      
      expect(toc).toBeDefined();
      expect(toc).toContain('# CodeCrew Documentation');
      expect(toc).toContain('## Table of Contents');
    });

    it('should get document section', async () => {
      const section = await service.getDocumentSection('readme', 'Getting Started');
      
      expect(section).toBeDefined();
      expect(section).toContain('## Getting Started');
      expect(section).toContain('Installation');
    });

    it('should return undefined for non-existent document', async () => {
      const content = await service.getDocumentContent('nonexistent');
      
      expect(content).toBeUndefined();
    });

    it('should handle lazy-loaded documents', async () => {
      // agent-best-practices is marked as lazy in documents.yaml
      const content = await service.getDocumentContent('agent-best-practices');
      
      expect(content).toBeDefined();
      expect(content).toContain('Agent Best Practices');
    });
  });

  describe('document metadata', () => {
    beforeEach(async () => {
      await service.initialize(projectPath);
    });

    it('should get document summary', async () => {
      const summary = await service.getDocumentSummary('readme');
      
      expect(summary).toBeDefined();
      expect(summary).toBe('CodeCrew main documentation');
    });

    it('should return undefined for documents without summary', async () => {
      const summary = await service.getDocumentSummary('nonexistent');
      
      expect(summary).toBeUndefined();
    });
  });

  describe('TOC extraction with depth', () => {
    beforeEach(async () => {
      await service.initialize(projectPath);
    });

    it('should respect maxDepth parameter', async () => {
      const toc1 = await service.getDocumentToc('readme', 1);
      const toc2 = await service.getDocumentToc('readme', 2);
      
      expect(toc1).toBeDefined();
      expect(toc2).toBeDefined();
      
      // toc1 should have fewer lines than toc2
      const lines1 = toc1!.split('\n').length;
      const lines2 = toc2!.split('\n').length;
      expect(lines1).toBeLessThanOrEqual(lines2);
    });
  });
});
