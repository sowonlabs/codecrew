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
  /** Conversation messages for history */
  messages?: Array<{
    text: string;
    isAssistant: boolean;
  }>;
  /** Available tools */
  tools?: {
    list: Array<{
      name: string;
      description: string;
      input_schema: any;
      output_schema?: any;
    }>;
    json: string;
    count: number;
  };
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
 * - {{#if tools}}...{{/if}} - Check if tools are available
 * - {{{tools.json}}} - All tools as JSON string
 * - {{tools.count}} - Number of available tools
 * - {{vars.customKey}} - Custom variables
 * 
 * @param template - Template string with Handlebars variables
 * @param documentLoader - DocumentLoaderService instance
 * @param additionalContext - Optional additional context (env, options, agent, mode, tools, vars)
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
    tools: additionalContext?.tools,
    vars: additionalContext?.vars || {},
  };

  // Register Handlebars helpers for advanced conditions
  registerHandlebarsHelpers();

  // Extract document references from template
  // Pattern: {{{documents.doc-name.property}}}
  const pattern = /{{{documents\.([^.}]+)\.([^}]+)}}}/g;
  const matches = [...template.matchAll(pattern)];
  
  if (matches.length > 0 && documentLoader.isInitialized()) {
    // Collect unique document names
    const docNames = Array.from(new Set(matches.map(m => m[1]).filter((name): name is string => !!name)));
    
    // Load all referenced documents
    for (const docName of docNames) {
      let content = await documentLoader.getDocumentContent(docName);
      const toc = await documentLoader.getDocumentToc(docName);
      const summary = await documentLoader.getDocumentSummary(docName);
      
      // Process document content as template to support nested variables
      // This allows documents to use {{agent.xxx}}, {{env.xxx}}, etc.
      if (content) {
        try {
          const docTemplate = Handlebars.compile(content, { noEscape: true });
          content = docTemplate(context);
        } catch (error) {
          // If document content has invalid Handlebars syntax, use as-is
          // Silently ignore template errors in document content
          // (documents may contain literal {{...}} examples that aren't meant to be processed)
        }
      }
      
      // Normalize docName for object key (replace hyphens with underscores if needed)
      const normalizedName = docName;
      
      context.documents[normalizedName] = {
        content: content || '',
        toc: toc || '',
        summary: summary || '',
      };
    }
  }

  // Compile and render main template
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

  // JSON stringify helper: {{{json object}}}
  Handlebars.registerHelper('json', function(context: any) {
    return JSON.stringify(context, null, 2);
  });
}

/**
 * Check if a template contains document references
 */
export function hasDocumentReferences(template: string): boolean {
  return /{{{documents\.[^}]+}}}/g.test(template);
}
