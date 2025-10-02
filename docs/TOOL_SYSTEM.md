# CodeCrew Tool System

## Overview

CodeCrew의 tool system은 Mastra framework와 호환되는 구조로 설계되어 있으며, AI 에이전트가 외부 도구를 안전하고 효율적으로 실행할 수 있도록 합니다.

## Architecture

### Tool Definition

Tool은 다음과 같은 구조로 정의됩니다:

```typescript
interface Tool {
  name: string;                    // Tool의 고유 식별자
  description: string;             // AI가 도구 선택에 사용할 설명
  input_schema: {                  // 입력 파라미터 정의
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  output_schema?: {                // 출력 구조 정의 (선택사항)
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}
```

### Execution Context

Tool 실행 시 풍부한 컨텍스트 정보를 제공합니다:

```typescript
interface ToolExecutionContext {
  input: Record<string, any>;      // Tool 입력 파라미터
  runId?: string;                   // 실행 추적 ID
  threadId?: string;                // 대화 스레드 ID
  resourceId?: string;              // 리소스/사용자 식별자
  agentId?: string;                 // 호출한 에이전트 ID
  tracingContext?: {                // 추적/로깅 컨텍스트
    taskId?: string;
    parentSpan?: string;
  };
}
```

### Execution Result

표준화된 실행 결과 형식:

```typescript
interface ToolExecutionResult<T = any> {
  success: boolean;                 // 실행 성공 여부
  data?: T;                         // 결과 데이터
  error?: string;                   // 에러 메시지
  metadata?: {                      // 메타데이터
    executionTime?: number;
    toolName?: string;
    runId?: string;
  };
}
```

## Creating Custom Tools

### Basic Example

```typescript
import { ToolCallService, Tool, ToolExecutor, ToolExecutionContext, ToolExecutionResult } from '@/services/tool-call.service';

// 1. Define the tool
const calculatorTool: Tool = {
  name: 'calculator',
  description: 'Perform basic arithmetic operations',
  input_schema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide'],
        description: 'The arithmetic operation to perform'
      },
      a: {
        type: 'number',
        description: 'First number'
      },
      b: {
        type: 'number',
        description: 'Second number'
      }
    },
    required: ['operation', 'a', 'b']
  },
  output_schema: {
    type: 'object',
    properties: {
      result: {
        type: 'number',
        description: 'The calculation result'
      },
      operation: {
        type: 'string',
        description: 'The operation performed'
      }
    },
    required: ['result', 'operation']
  }
};

// 2. Implement the executor
const calculatorExecutor: ToolExecutor = {
  execute: async (context: ToolExecutionContext): Promise<ToolExecutionResult> => {
    const startTime = Date.now();
    
    try {
      const { operation, a, b } = context.input;
      
      // Validate input
      if (typeof a !== 'number' || typeof b !== 'number') {
        return {
          success: false,
          error: 'Both a and b must be numbers',
          metadata: {
            executionTime: Date.now() - startTime,
            toolName: 'calculator',
            runId: context.runId,
          }
        };
      }
      
      // Perform calculation
      let result: number;
      switch (operation) {
        case 'add':
          result = a + b;
          break;
        case 'subtract':
          result = a - b;
          break;
        case 'multiply':
          result = a * b;
          break;
        case 'divide':
          if (b === 0) {
            return {
              success: false,
              error: 'Division by zero',
              metadata: {
                executionTime: Date.now() - startTime,
                toolName: 'calculator',
                runId: context.runId,
              }
            };
          }
          result = a / b;
          break;
        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
            metadata: {
              executionTime: Date.now() - startTime,
              toolName: 'calculator',
              runId: context.runId,
            }
          };
      }
      
      return {
        success: true,
        data: {
          result,
          operation
        },
        metadata: {
          executionTime: Date.now() - startTime,
          toolName: 'calculator',
          runId: context.runId,
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Execution failed: ${error.message}`,
        metadata: {
          executionTime: Date.now() - startTime,
          toolName: 'calculator',
          runId: context.runId,
        }
      };
    }
  }
};

// 3. Register the tool
@Injectable()
export class CustomToolsService {
  constructor(private readonly toolCallService: ToolCallService) {
    this.registerTools();
  }
  
  private registerTools(): void {
    this.toolCallService.register(calculatorTool, calculatorExecutor);
  }
}
```

### Advanced Example with External API

```typescript
const weatherTool: Tool = {
  name: 'get_weather',
  description: 'Get current weather information for a location',
  input_schema: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'City name or location'
      },
      units: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        description: 'Temperature units',
        default: 'celsius'
      }
    },
    required: ['location']
  },
  output_schema: {
    type: 'object',
    properties: {
      temperature: { type: 'number' },
      humidity: { type: 'number' },
      conditions: { type: 'string' },
      location: { type: 'string' }
    },
    required: ['temperature', 'conditions', 'location']
  }
};

const weatherExecutor: ToolExecutor = {
  execute: async (context: ToolExecutionContext): Promise<ToolExecutionResult> => {
    const startTime = Date.now();
    
    try {
      const { location, units = 'celsius' } = context.input;
      
      // Call external weather API
      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=YOUR_API_KEY&q=${encodeURIComponent(location)}`
      );
      
      if (!response.ok) {
        return {
          success: false,
          error: `Weather API error: ${response.statusText}`,
          metadata: {
            executionTime: Date.now() - startTime,
            toolName: 'get_weather',
            runId: context.runId,
          }
        };
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: {
          temperature: units === 'celsius' ? data.current.temp_c : data.current.temp_f,
          humidity: data.current.humidity,
          conditions: data.current.condition.text,
          location: data.location.name
        },
        metadata: {
          executionTime: Date.now() - startTime,
          toolName: 'get_weather',
          runId: context.runId,
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to fetch weather: ${error.message}`,
        metadata: {
          executionTime: Date.now() - startTime,
          toolName: 'get_weather',
          runId: context.runId,
        }
      };
    }
  }
};
```

## Built-in Tools

### read_file

파일 시스템에서 파일을 읽습니다.

```typescript
// Input
{
  path: string  // 읽을 파일의 경로
}

// Output
{
  content: string  // 파일 내용
}
```

**사용 예제:**
```bash
codecrew query "@gemini README.md 파일을 읽고 요약해줘"
```

## Tool Execution Flow

1. **Tool Registration**: 서비스 시작 시 tool이 ToolCallService에 등록됨
2. **AI Request**: AI 에이전트가 사용자 요청 분석
3. **Tool Selection**: AI가 적절한 tool 선택
4. **Input Validation**: Tool 입력 파라미터 검증
5. **Execution**: Tool executor가 실행됨
6. **Result Formatting**: 구조화된 결과 반환
7. **AI Response**: AI가 tool 결과를 사용하여 응답 생성

## Comparison with Mastra

| Feature | CodeCrew | Mastra | Status |
|---------|----------|--------|--------|
| Tool Definition | `Tool` interface | `createTool()` | ✅ Compatible |
| Input Schema | JSON Schema | Zod Schema | 🔄 Different format, same purpose |
| Output Schema | JSON Schema (optional) | Zod Schema (optional) | ✅ Both supported |
| Execution Context | `ToolExecutionContext` | `ToolExecutionContext` | ✅ Similar structure |
| Result Format | `ToolExecutionResult` | Varies by tool | ✅ Standardized |
| Validation | Manual in executor | Automatic with Zod | 🔄 Both work |
| Tracing | TaskManagement + tracingContext | TracingContext with spans | ✅ Compatible |

## Best Practices

### 1. Always Validate Input

```typescript
execute: async (context: ToolExecutionContext): Promise<ToolExecutionResult> => {
  const { input } = context;
  
  // Validate required fields
  if (!input.field1 || !input.field2) {
    return {
      success: false,
      error: 'Missing required fields: field1, field2'
    };
  }
  
  // Validate types
  if (typeof input.field1 !== 'string') {
    return {
      success: false,
      error: 'field1 must be a string'
    };
  }
  
  // Continue with execution...
}
```

### 2. Handle Errors Gracefully

```typescript
execute: async (context: ToolExecutionContext): Promise<ToolExecutionResult> => {
  try {
    // Tool logic
    return { success: true, data: result };
  } catch (error: any) {
    return {
      success: false,
      error: `Tool execution failed: ${error.message}`,
      metadata: {
        toolName: 'my_tool',
        runId: context.runId,
      }
    };
  }
}
```

### 3. Provide Execution Metadata

```typescript
const startTime = Date.now();

return {
  success: true,
  data: result,
  metadata: {
    executionTime: Date.now() - startTime,
    toolName: 'my_tool',
    runId: context.runId,
  }
};
```

### 4. Use Descriptive Tool Names and Descriptions

```typescript
{
  name: 'search_database',  // Clear, action-oriented
  description: 'Search the product database by name, category, or SKU. Returns matching products with details.',  // Detailed for AI understanding
}
```

## Debugging Tools

### View Available Tools

```typescript
const tools = toolCallService.list();
console.log('Available tools:', tools.map(t => t.name));
```

### Check Tool Existence

```typescript
if (toolCallService.has('my_tool')) {
  console.log('Tool is registered');
}
```

### Direct Tool Execution

```typescript
const result = await toolCallService.execute('calculator', {
  operation: 'add',
  a: 5,
  b: 3
}, {
  runId: 'test-run-123',
  agentId: 'test-agent'
});

console.log('Result:', result);
```

## Future Enhancements

- [ ] Zod schema validation integration
- [ ] Tool versioning support
- [ ] Tool permission system
- [ ] Tool execution sandboxing
- [ ] Tool composition (chaining)
- [ ] Tool marketplace/registry
- [ ] Real-time tool streaming
- [ ] Tool analytics dashboard

## References

- [Mastra Tools Documentation](https://mastra.ai/docs/tools)
- [Vercel AI SDK Tools](https://sdk.vercel.ai/docs/ai-sdk-core/tools)
- [JSON Schema Specification](https://json-schema.org/)
