import * as Handlebars from 'handlebars';
import { DocumentLoaderService } from '../services/document-loader.service';

/**
 * Process Handlebars template with document variables
 * 
 * Supports:
 * - {{{documents.doc-name.content}}} - Full document content
 * - {{{documents.doc-name.toc}}} - Table of contents
 * - {{{documents.doc-name.summary}}} - Document summary
 * 
 * @param template - Template string with Handlebars variables
 * @param documentLoader - DocumentLoaderService instance
 * @returns Processed template with document content injected
 */
export async function processDocumentTemplate(
  template: string,
  documentLoader: DocumentLoaderService,
): Promise<string> {
  if (!documentLoader.isInitialized()) {
    return template; // Return as-is if no documents
  }

  // Extract document references from template
  // Pattern: {{{documents.doc-name.property}}}
  const pattern = /{{{documents\.([^.}]+)\.([^}]+)}}}/g;
  const matches = [...template.matchAll(pattern)];
  
  if (matches.length === 0) {
    return template; // No document references
  }

  // Build context object with document data
  const context: any = { documents: {} };
  
  // Collect unique document names
  const docNames = Array.from(new Set(matches.map(m => m[1]).filter((name): name is string => !!name)));
  
  // Load all referenced documents
  for (const docName of docNames) {
    const content = await documentLoader.getDocumentContent(docName);
    const toc = await documentLoader.getDocumentToc(docName);
    const summary = await documentLoader.getDocumentSummary(docName);
    
    // Normalize docName for object key (replace hyphens with underscores if needed)
    const normalizedName = docName;
    
    context.documents[normalizedName] = {
      content: content || '',
      toc: toc || '',
      summary: summary || '',
    };
  }

  // Compile and render template
  const compiledTemplate = Handlebars.compile(template, { noEscape: true });
  return compiledTemplate(context);
}

/**
 * Check if a template contains document references
 */
export function hasDocumentReferences(template: string): boolean {
  return /{{{documents\.[^}]+}}}/g.test(template);
}
