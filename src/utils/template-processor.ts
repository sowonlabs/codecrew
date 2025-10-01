import * as Handlebars from 'handlebars';
import { DocumentLoaderService } from '../services/document-loader.service';

/**
 * Additional context for template processing
 */
export interface TemplateContext {
  /** Environment variables */
  env?: Record<string, string | undefined>;
  /** Agent options passed via CLI */
  options?: string[];
  /** Agent metadata */
  agent?: {
    id: string;
    name: string;
    provider: string;
    model?: string;
    workingDirectory?: string;
  };
  /** Query/execution mode */
  mode?: 'query' | 'execute';
  /** Additional custom variables */
  vars?: Record<string, any>;
}

/**
 * Process Handlebars template with document variables and context
 * 
 * Supports:
 * - {{{documents.doc-name.content}}} - Full document content
 * - {{{documents.doc-name.toc}}} - Table of contents
 * - {{documents.doc-name.summary}} - Document summary
 * - {{#if env.VAR_NAME}}...{{/if}} - Environment variable conditions
 * - {{#if agent.model}}...{{/if}} - Agent metadata conditions
 * - {{#if (eq mode "query")}}...{{/if}} - Mode-based conditions
 * - {{vars.customKey}} - Custom variables
 * 
 * @param template - Template string with Handlebars variables
 * @param documentLoader - DocumentLoaderService instance
 * @param additionalContext - Optional additional context (env, options, agent, mode, vars)
 * @returns Processed template with all context injected
 */
export async function processDocumentTemplate(
  template: string,
  documentLoader: DocumentLoaderService,
  additionalContext?: TemplateContext,
): Promise<string> {
  if (!documentLoader.isInitialized()) {
    // Even without documents, we might have other context
    if (!additionalContext) {
      return template;
    }
  }

  // Build context object with all available data
  const context: any = { 
    documents: {},
    env: additionalContext?.env || process.env,
    options: additionalContext?.options || [],
    agent: additionalContext?.agent || {},
    mode: additionalContext?.mode,
    vars: additionalContext?.vars || {},
  };

  // Extract document references from template
  // Pattern: {{{documents.doc-name.property}}}
  const pattern = /{{{documents\.([^.}]+)\.([^}]+)}}}/g;
  const matches = [...template.matchAll(pattern)];
  
  if (matches.length > 0 && documentLoader.isInitialized()) {
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
  }

  // Register Handlebars helpers for advanced conditions
  registerHandlebarsHelpers();

  // Compile and render template
  const compiledTemplate = Handlebars.compile(template, { noEscape: true });
  return compiledTemplate(context);
}

/**
 * Register custom Handlebars helpers for conditions and comparisons
 */
function registerHandlebarsHelpers() {
  // Only register once
  if (Handlebars.helpers['eq']) {
    return;
  }

  // Equality helper: {{#if (eq a b)}}
  Handlebars.registerHelper('eq', function(a: any, b: any) {
    return a === b;
  });

  // Not equal helper: {{#if (ne a b)}}
  Handlebars.registerHelper('ne', function(a: any, b: any) {
    return a !== b;
  });

  // Contains helper: {{#if (contains array value)}}
  Handlebars.registerHelper('contains', function(array: any[], value: any) {
    return Array.isArray(array) && array.includes(value);
  });

  // Logical AND: {{#if (and a b)}}
  Handlebars.registerHelper('and', function(a: any, b: any) {
    return a && b;
  });

  // Logical OR: {{#if (or a b)}}
  Handlebars.registerHelper('or', function(a: any, b: any) {
    return a || b;
  });

  // Not helper: {{#if (not a)}}
  Handlebars.registerHelper('not', function(a: any) {
    return !a;
  });
}

/**
 * Check if a template contains document references
 */
export function hasDocumentReferences(template: string): boolean {
  return /{{{documents\.[^}]+}}}/g.test(template);
}
