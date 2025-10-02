# CodeCrew Tool Call Implementation

## 📋 개요

CodeCrew는 자체 도구 시스템을 구현하여 AI 에이전트가 특별한 기능을 수행할 수 있도록 합니다.

## 🔧 동작 원리

### 1. 도구 호출 흐름

```
사용자 질문
    ↓
프롬프트 생성 (도구 목록 자동 추가)
    ↓
Claude CLI 실행
    ↓
AI 판단 및 응답
    ├─ 일반 답변 → 그대로 반환
    └─ CodeCrew 도구 필요 → JSON 형식으로 응답
            ↓
        parseToolUse() - JSON 감지
            ↓
        ToolCallService.execute()
            ↓
        도구 실행 결과 반환
```

### 2. JSON 가로채기 방식

**핵심 아이디어**: AI가 도구를 직접 실행할 수 없으므로, **JSON 응답을 유도하고 가로챕니다**.

```typescript
// AI의 응답
{
  "type": "tool_use",
  "name": "codecrew:help",
  "input": {}
}

// CodeCrew가 이를 감지하고 실행
const result = await ToolCallService.execute('help', {});
```

## 🎯 구현 상세

### 1. 도구 등록 (ToolCallService)

```typescript
// src/services/tool-call.service.ts
private registerBuiltinTools(): void {
  this.register(
    {
      name: 'help',  // codecrew: prefix는 자동 추가
      description: 'Get help information about CodeCrew',
      input_schema: { ... },
      output_schema: { ... }
    },
    {
      execute: async (context) => {
        // 실제 도구 실행 로직
        return { success: true, data: { help: "..." } };
      }
    }
  );
}
```

### 2. 프롬프트 강화 (ClaudeProvider)

```typescript
// src/providers/claude.provider.ts
private buildPromptWithTools(prompt: string, tools: Tool[]): string {
  // 도구 목록과 사용법을 프롬프트 앞에 추가
  const toolsSection = `
## 🔧 CodeCrew Custom Tools Available

You have access to ${tools.length} special CodeCrew tool(s)...

**How to use CodeCrew tools:**
When you determine that a CodeCrew tool is needed, respond with this JSON format:
\`\`\`json
{
  "type": "tool_use",
  "name": "codecrew:tool_name",
  "input": { ... }
}
\`\`\`

**Decision Guide:**
1. First check if your native tools can accomplish the task
2. If not, check the CodeCrew tools above
3. Use CodeCrew tools for specialized functionality
  `;
  
  return toolsSection + prompt;
}
```

### 3. JSON 파싱 및 실행

```typescript
async query(prompt: string, options: AIQueryOptions = {}): Promise<AIResponse> {
  // 1. 도구 정보를 프롬프트에 추가
  let enhancedPrompt = prompt;
  if (this.toolCallService) {
    const tools = this.toolCallService.list();
    enhancedPrompt = this.buildPromptWithTools(prompt, tools);
  }
  
  // 2. Claude CLI 실행
  const response = await super.query(enhancedPrompt, options);
  
  // 3. CodeCrew 도구 사용 감지
  if (response.success && this.toolCallService) {
    const toolUse = this.parseToolUse(response.content);
    
    if (toolUse.isToolUse && toolUse.toolName) {
      // 4. 도구 실행
      const actualToolName = toolUse.toolName.replace('codecrew:', '');
      const toolResult = await this.toolCallService.execute(
        actualToolName,
        toolUse.toolInput || {}
      );
      
      // 5. 결과 반환
      return {
        ...response,
        content: JSON.stringify(toolResult, null, 2),
      };
    }
  }
  
  // 6. 일반 응답 처리
  return response;
}
```

### 4. JSON 감지 (마크다운 지원)

```typescript
private parseToolUse(streamJsonOutput: string): { isToolUse: boolean; toolName?: string; toolInput?: any } {
  const lines = streamJsonOutput.trim().split('\n');
  
  for (const line of lines) {
    const parsed = JSON.parse(line);
    
    // Claude가 마크다운 코드 블록에 JSON을 넣는 경우
    if (parsed.type === 'assistant' && parsed.message?.content) {
      for (const item of parsed.message.content) {
        if (item.type === 'text' && item.text) {
          // 마크다운에서 JSON 추출
          const jsonMatch = item.text.match(/```json\s*\n?([\s\S]*?)\n?```/m);
          if (jsonMatch) {
            const toolJson = JSON.parse(jsonMatch[1]);
            if (toolJson.name?.startsWith('codecrew:')) {
              return {
                isToolUse: true,
                toolName: toolJson.name,
                toolInput: toolJson.input || {}
              };
            }
          }
        }
      }
    }
  }
  
  return { isToolUse: false };
}
```

## 🎭 AI 도구 선택 방식

### Claude CLI 내장 도구 vs CodeCrew 도구

| 구분 | Claude 내장 도구 | CodeCrew 도구 |
|------|-----------------|--------------|
| **인식** | 실행 가능한 함수로 인식 | 텍스트 설명으로 인식 |
| **실행** | Claude CLI가 직접 실행 | JSON 응답 → CodeCrew가 가로채서 실행 |
| **우선순위** | 높음 (디폴트) | 낮음 (명시적 설명 필요) |
| **예시** | Read, Write, Edit, Bash | codecrew:help, codecrew:read_file |

### AI의 판단 과정

```
1. 사용자 질문 분석
2. Claude 내장 도구로 해결 가능? 
   ├─ Yes → 내장 도구 사용
   └─ No  → CodeCrew 도구 확인
           ├─ 적합한 도구 있음 → JSON 응답
           └─ 없음 → 일반 답변
```

## ✅ 테스트 결과

### 자동 도구 사용 (AI 판단)

```bash
# AI가 스스로 codecrew:help 도구를 사용
$ node dist/main.js query "@claude:haiku How do I use CodeCrew?"

# 결과: AI가 자동으로 codecrew:help 호출
{
  "success": true,
  "data": {
    "help": "CodeCrew - Multi-Agent AI Collaboration Platform\n\n..."
  },
  "metadata": {
    "toolName": "help"  # ✅ CodeCrew 도구 실행됨
  }
}
```

### 특정 명령어 도움말

```bash
$ node dist/main.js query "@claude:haiku Tell me about the 'execute' command"

# AI가 자동으로 command: "execute" 파라미터 추론
{
  "data": {
    "help": "Usage: codecrew execute \"@agent task\"..."
  }
}
```

### 일반 질문 (도구 불필요)

```bash
$ node dist/main.js query "@claude:haiku What is 2+2?"

# 결과: 4
# ✅ 도구를 사용하지 않고 직접 답변
```

## 🔑 핵심 포인트

### 1. Prefix로 구분
- `codecrew:` prefix로 내장 도구와 구분
- AI가 명확하게 인식 가능

### 2. 프롬프트 강화
- 도구 목록과 사용법을 자동으로 프롬프트에 추가
- "Decision Guide"로 우선순위 명시

### 3. 마크다운 지원
- AI가 ```json 코드 블록에 JSON을 넣어도 감지
- 유연한 응답 형식 지원

### 4. 자동 vs 수동
- **자동**: AI가 필요 시 스스로 판단하여 도구 사용
- **수동**: 명시적 지시로도 사용 가능

## 🚀 확장 방법

### 새 도구 추가

```typescript
// src/services/tool-call.service.ts
this.register(
  {
    name: 'analyze_project',  // codecrew:analyze_project로 노출됨
    description: 'Analyze project structure and dependencies',
    input_schema: {
      type: 'object',
      properties: {
        depth: { type: 'number', description: 'Analysis depth' }
      },
      required: []
    }
  },
  {
    execute: async (context) => {
      // 도구 로직 구현
      return {
        success: true,
        data: { analysis: "..." }
      };
    }
  }
);
```

### 다른 AI Provider 지원

```typescript
// src/providers/gemini.provider.ts
// ClaudeProvider와 동일한 패턴 적용
async query(prompt: string, options: AIQueryOptions = {}): Promise<AIResponse> {
  // 1. buildPromptWithTools()로 프롬프트 강화
  // 2. parseToolUse()로 JSON 감지
  // 3. ToolCallService.execute()로 실행
}
```

## 📊 성능 고려사항

- **프롬프트 크기**: 도구 목록이 추가되므로 토큰 사용량 증가
- **응답 시간**: JSON 파싱 오버헤드는 무시 가능 (~1ms)
- **캐싱**: Claude CLI의 prompt caching으로 반복 요청 최적화

## 🔒 보안

- **입력 검증**: 도구 실행 전 input schema 검증
- **경로 제한**: 파일 작업 시 상대 경로 체크
- **권한 관리**: execute vs query 모드 구분

## 📝 요약

**Q: JSON 출력을 유도하고 그 JSON을 가로채서 실행한다는 논리?**

**A: 정확합니다!**

1. ✅ 프롬프트에 도구 정보 추가 (사용법 포함)
2. ✅ AI가 필요하다고 판단하면 JSON으로 응답
3. ✅ CodeCrew가 JSON을 감지하고 파싱
4. ✅ ToolCallService로 실제 도구 실행
5. ✅ 결과를 사용자에게 반환

**장점**:
- AI가 자유롭게 판단하여 도구 사용
- 기존 Claude CLI 도구와 공존 가능
- 확장 가능한 구조

**단점**:
- Claude CLI 내장 도구보다 우선순위 낮음
- 프롬프트 설명이 명확해야 함
