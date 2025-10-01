import { Injectable, Logger } from '@nestjs/common';
import { DocumentManager } from '../knowledge/DocumentManager';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface DocumentDefinition {
  // 문자열: 직접 콘텐츠
  // 객체: 메타데이터 포함
  // 함수: 지연 로딩
  [key: string]: string | DocumentObject | DocumentLoader;
}

export interface DocumentObject {
  content: string;
  type?: 'markdown' | 'text';
  summary?: string;
  metadata?: Record<string, any>;
}

export type DocumentLoader = () => Promise<DocumentObject> | DocumentObject;

export interface DocumentsYaml {
  documents?: {
    // Case 1: 직접 문자열 (raw markdown)
    // my-doc: |
    //   # Title
    // Case 2: 객체 형식
    [key: string]: string | {
      path?: string;
      content?: string;
      summary?: string;
      type?: 'markdown' | 'text';
      lazy?: boolean;
    };
  };
}

/**
 * DocumentLoaderService
 * 
 * SowonFlow의 DocumentManager를 NestJS 서비스로 래핑.
 * documents.yaml 파일을 로드하고 DocumentManager를 초기화합니다.
 * 
 * @example
 * // documents.yaml
 * documents:
 *   coding-standards:
 *     path: "documents/guides/coding-standards.md"
 *     summary: "Company coding standards"
 *   api-reference:
 *     path: "documents/api/reference.md"
 *     lazy: true
 * 
 * @example
 * // Agent system_prompt
 * system_prompt: |
 *   <document name="coding-standards">
 *   {{{documents.coding-standards.content}}}
 *   </document>
 */
@Injectable()
export class DocumentLoaderService {
  private readonly logger = new Logger(DocumentLoaderService.name);
  private documentDefinitions: DocumentDefinition = {};
  private initialized = false;

  /**
   * documents.yaml 파일을 로드하고 초기화합니다.
   * @param projectPath - 프로젝트 루트 경로
   * @param agentsYamlDocuments - agents.yaml의 documents 섹션 (선택적)
   */
  async initialize(projectPath: string, agentsYamlDocuments?: Record<string, any>): Promise<void> {
    if (this.initialized) {
      return;
    }

    const documentsYamlPath = path.join(projectPath, 'documents.yaml');
    
    try {
      const exists = await fs.access(documentsYamlPath).then(() => true).catch(() => false);
      
      if (!exists) {
        this.logger.debug('documents.yaml not found, skipping document system initialization');
        this.initialized = true;
        return;
      }

      const yamlContent = await fs.readFile(documentsYamlPath, 'utf-8');
      const config = yaml.load(yamlContent) as DocumentsYaml;

      if (!config.documents) {
        this.logger.debug('No documents defined in documents.yaml');
        this.initialized = true;
        return;
      }

      // 문서 정의를 DocumentManager 형식으로 변환
      for (const [docName, docConfig] of Object.entries(config.documents)) {
        // Case 1: 직접 문자열 (raw markdown)
        // documents:
        //   my-doc: |
        //     # Title
        //     Content
        if (typeof docConfig === 'string') {
          this.documentDefinitions[docName] = {
            content: docConfig,
            type: 'markdown',
          };
        }
        // Case 2: 객체 형식 with content field
        // documents:
        //   my-doc:
        //     content: |
        //       # Title
        else if (docConfig.content) {
          this.documentDefinitions[docName] = {
            content: docConfig.content,
            type: docConfig.type || 'markdown',
            summary: docConfig.summary,
          };
        }
        // Case 3: 파일 경로로 로드
        else if (docConfig.path) {
          const absolutePath = path.join(projectPath, docConfig.path);
          
          if (docConfig.lazy) {
            // 지연 로딩 함수
            this.documentDefinitions[docName] = async () => {
              this.logger.debug(`Loading document lazily: ${docName} from ${docConfig.path}`);
              const content = await fs.readFile(absolutePath, 'utf-8');
              return {
                content,
                type: docConfig.type || 'markdown',
                summary: docConfig.summary,
              };
            };
          } else {
            // 즉시 로드
            const content = await fs.readFile(absolutePath, 'utf-8');
            this.documentDefinitions[docName] = {
              content,
              type: docConfig.type || 'markdown',
              summary: docConfig.summary,
            };
          }
        }
      }

      this.logger.log(`Loaded ${Object.keys(this.documentDefinitions).length} document definitions from documents.yaml`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.debug(`documents.yaml not found or error: ${errorMessage}`);
    }
    
    // Merge with agents.yaml documents (overrides documents.yaml)
    if (agentsYamlDocuments) {
      this.logger.log('Merging documents from agents.yaml');
      await this.mergeDocuments(projectPath, agentsYamlDocuments);
    }
    
    this.logger.log(`Total documents loaded: ${Object.keys(this.documentDefinitions).length}`);
    this.initialized = true;
  }

  /**
   * agents.yaml 또는 agent.inline.documents의 문서를 병합합니다.
   * @param projectPath - 프로젝트 루트 경로
   * @param documents - 문서 정의 객체
   */
  private async mergeDocuments(projectPath: string, documents: Record<string, any>): Promise<void> {
    for (const [docName, docConfig] of Object.entries(documents)) {
      // Case 1: 직접 문자열
      if (typeof docConfig === 'string') {
        this.documentDefinitions[docName] = {
          content: docConfig,
          type: 'markdown',
        };
        this.logger.debug(`Merged inline document: ${docName}`);
      }
      // Case 2: 객체 형식
      else if (docConfig && typeof docConfig === 'object') {
        if (docConfig.content) {
          this.documentDefinitions[docName] = {
            content: docConfig.content,
            type: docConfig.type || 'markdown',
            summary: docConfig.summary,
          };
          this.logger.debug(`Merged object document: ${docName}`);
        } else if (docConfig.path) {
          const absolutePath = path.join(projectPath, docConfig.path);
          
          if (docConfig.lazy) {
            // 지연 로딩
            this.documentDefinitions[docName] = async () => {
              this.logger.debug(`Loading merged document lazily: ${docName}`);
              const content = await fs.readFile(absolutePath, 'utf-8');
              return {
                content,
                type: docConfig.type || 'markdown',
                summary: docConfig.summary,
              };
            };
          } else {
            // 즉시 로드
            const content = await fs.readFile(absolutePath, 'utf-8');
            this.documentDefinitions[docName] = {
              content,
              type: docConfig.type || 'markdown',
              summary: docConfig.summary,
            };
          }
          this.logger.debug(`Merged file document: ${docName} from ${docConfig.path}`);
        }
      }
    }
  }

  /**
   * 에이전트별 문서를 추가로 병합합니다 (최고 우선순위)
   * @param agentDocuments - 에이전트의 inline.documents
   * @returns 병합된 DocumentDefinition
   */
  async mergeAgentDocuments(agentDocuments: Record<string, string>): Promise<DocumentDefinition> {
    const merged = { ...this.documentDefinitions };
    
    for (const [docName, content] of Object.entries(agentDocuments)) {
      merged[docName] = {
        content,
        type: 'markdown',
      };
      this.logger.debug(`Added agent-specific document: ${docName}`);
    }
    
    return merged;
  }

  /**
   * 초기화를 재설정합니다 (테스트용)
   */
  reset(): void {
    this.documentDefinitions = {};
    this.initialized = false;
  }

  /**
   * 문서 정의를 가져옵니다.
   */
  getDocumentDefinitions(): DocumentDefinition {
    return this.documentDefinitions;
  }

  /**
   * 문서가 로드되었는지 확인합니다.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 문서 이름 목록을 가져옵니다.
   */
  getDocumentNames(): string[] {
    return Object.keys(this.documentDefinitions);
  }

  /**
   * 특정 문서의 TOC를 추출합니다.
   * @param docName - 문서 이름
   * @param maxDepth - 최대 depth (기본값: 3)
   */
  async getDocumentToc(docName: string, maxDepth: number = 3): Promise<string | undefined> {
    const doc = this.documentDefinitions[docName];
    if (!doc) {
      return undefined;
    }

    let content: string;
    
    if (typeof doc === 'string') {
      content = doc;
    } else if (typeof doc === 'function') {
      const result = await doc();
      content = result.content;
    } else {
      content = doc.content;
    }

    return DocumentManager.extractToc(content, maxDepth);
  }

  /**
   * 특정 문서의 섹션을 가져옵니다.
   * @param docName - 문서 이름
   * @param selector - 섹션 선택자 (예: "Getting Started", "## API Reference", "#installation")
   */
  async getDocumentSection(docName: string, selector: string): Promise<string | undefined> {
    const doc = this.documentDefinitions[docName];
    if (!doc) {
      return undefined;
    }

    let content: string;
    
    if (typeof doc === 'string') {
      content = doc;
    } else if (typeof doc === 'function') {
      const result = await doc();
      content = result.content;
    } else {
      content = doc.content;
    }

    return DocumentManager.selectSection(content, selector);
  }

  /**
   * 문서 전체 내용을 가져옵니다.
   * @param docName - 문서 이름
   */
  async getDocumentContent(docName: string): Promise<string | undefined> {
    const doc = this.documentDefinitions[docName];
    if (!doc) {
      return undefined;
    }

    if (typeof doc === 'string') {
      return doc;
    } else if (typeof doc === 'function') {
      const result = await doc();
      return result.content;
    } else {
      return doc.content;
    }
  }

  /**
   * 문서 요약을 가져옵니다.
   * @param docName - 문서 이름
   */
  async getDocumentSummary(docName: string): Promise<string | undefined> {
    const doc = this.documentDefinitions[docName];
    if (!doc) {
      return undefined;
    }

    if (typeof doc === 'string' || typeof doc === 'function') {
      return undefined;
    }
    
    return doc.summary;
  }
}
