import { describe, it, expect } from 'vitest';
import { DocumentManager } from '../../src/knowledge/DocumentManager';

const testMarkdown = `
# Main Title

This is the introduction.

## Getting Started

Welcome to the getting started section.

### Installation

Run npm install to get started.

### Configuration

Edit the config file.

## API Reference

This section describes the API.

### Functions

Here are the available functions.

## Troubleshooting

Common issues and solutions.
`;

describe('DocumentManager', () => {
  describe('extractToc', () => {
    it('should extract TOC with default max depth 3', () => {
      const toc = DocumentManager.extractToc(testMarkdown);
      expect(toc).toContain('# Main Title');
      expect(toc).toContain('## Getting Started');
      expect(toc).toContain('### Installation');
      expect(toc).toContain('### Configuration');
      expect(toc).toContain('## API Reference');
      expect(toc).toContain('### Functions');
      expect(toc).toContain('## Troubleshooting');
    });

    it('should respect maxDepth parameter', () => {
      const toc = DocumentManager.extractToc(testMarkdown, 2);
      expect(toc).toContain('# Main Title');
      expect(toc).toContain('## Getting Started');
      expect(toc).toContain('## API Reference');
      expect(toc).not.toContain('### Installation');
      expect(toc).not.toContain('### Configuration');
    });

    it('should handle empty markdown', () => {
      const toc = DocumentManager.extractToc('');
      expect(toc).toBe('');
    });
  });

  describe('selectSection', () => {
    it('should select section by exact title', () => {
      const section = DocumentManager.selectSection(testMarkdown, 'Getting Started');
      expect(section).toBeDefined();
      expect(section).toContain('## Getting Started');
      expect(section).toContain('Welcome to the getting started section');
      expect(section).toContain('### Installation');
      expect(section).toContain('### Configuration');
      // Should not include next section
      expect(section).not.toContain('## API Reference');
    });

    it('should select section by heading format', () => {
      const section = DocumentManager.selectSection(testMarkdown, '## API Reference');
      expect(section).toBeDefined();
      expect(section).toContain('## API Reference');
      expect(section).toContain('This section describes the API');
      expect(section).toContain('### Functions');
      // Should not include next section
      expect(section).not.toContain('## Troubleshooting');
    });

    it('should select section by slug ID', () => {
      const section = DocumentManager.selectSection(testMarkdown, '#getting-started');
      expect(section).toBeDefined();
      expect(section).toContain('## Getting Started');
    });

    it('should return undefined for non-existent section', () => {
      const section = DocumentManager.selectSection(testMarkdown, 'Non-existent Section');
      expect(section).toBeUndefined();
    });

    it('should handle nested sections correctly', () => {
      const section = DocumentManager.selectSection(testMarkdown, 'Installation');
      expect(section).toBeDefined();
      expect(section).toContain('### Installation');
      expect(section).toContain('Run npm install');
      // Should only include Installation subsection, not Configuration
      expect(section).not.toContain('Configuration');
    });
  });
});
