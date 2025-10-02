# MCP Bridge Implementation Plan

## 🎯 목표

CodeCrew 자체 도구를 AI CLI에 **진짜 실행 가능한 도구**로 등록하기

## ❌ 현재 문제점

### 1. JSON 가로채기 방식의 한계
- ✅ Claude Haiku: 적극적으로 사용
- ⚠️ Claude Sonnet: 선택적 사용
- ❌ Gemini: 거의 사용 안 함
- ❌ Copilot: 미지원

### 2. 근본적 문제
```
AI의 관점:
- 내장 도구 (Read, Write): "실행 가능한 함수"
- CodeCrew 도구: "그냥 텍스트 설명"

결과:
- AI가 내장 도구를 먼저 선호
- CodeCrew 도구는 "차선책"으로 인식
```

## ✅ MCP 브릿지 해결책

### 개념
```
CodeCrew MCP Server (stdio)
    ↓ (expose tools)
Claude/Gemini CLI --mcp-config
    ↓ (register as real tools)
AI가 "codecrew:help"를 내장 도구처럼 인식
```

### 장점
1. **동등한 우선순위**: 내장 도구와 같은 레벨
2. **표준 프로토콜**: 모든 MCP 지원 AI에서 동일하게 작동
3. **프롬프트 불필요**: AI가 자연스럽게 도구 인식

## 🔌 MCP 지원 현황

### Claude CLI
```bash
# MCP 서버 연결
claude --mcp-config .mcp.json "your prompt"

# 특정 도구 허용
claude --mcp-config .mcp.json \
       --allowed-tools "codecrew:codecrew__help,codecrew:codecrew__read_file"
```

### Gemini CLI
```bash
# MCP 서버 연결
gemini --allowed-mcp-server-names codecrew "your prompt"
```

### Copilot CLI
- ❌ **MCP 미지원**
- 현재 JSON 가로채기 방식 유지 필요

## 🏗️ 구현 계획

### Phase 1: MCP 도구 노출 확인
```typescript
// src/codecrew.tool.ts에 이미 구현됨
@McpTool({
  server: SERVER_NAME,
  name: `${PREFIX_TOOL_NAME}help`,
  description: '...',
  input: { ... }
})
async getHelp() {
  // ...
}
```

**확인 사항:**
- ✅ CodeCrew MCP 서버가 도구를 노출하는가?
- ✅ `codecrew mcp` 실행 시 stdio로 통신하는가?

### Phase 2: AI CLI에 MCP 연결
```typescript
// src/providers/claude.provider.ts
protected getDefaultArgs(): string[] {
  const args = ['--output-format', 'stream-json', '-p', '--verbose'];
  
  // MCP 서버 연결 추가
  if (this.shouldUseMcp()) {
    args.push('--mcp-config', this.getMcpConfigPath());
    args.push('--allowed-tools', this.getCodeCrewTools());
  }
  
  return args;
}

private shouldUseMcp(): boolean {
  // MCP 브릿지 활성화 여부 확인
  return process.env.CODECREW_USE_MCP_BRIDGE === 'true';
}

private getMcpConfigPath(): string {
  return path.join(process.cwd(), '.mcp.json');
}

private getCodeCrewTools(): string {
  // codecrew:codecrew__help,codecrew:codecrew__read_file
  return 'codecrew:*'; // 모든 CodeCrew 도구 허용
}
```

### Phase 3: 동적 MCP 서버 시작
```typescript
// src/services/mcp-bridge.service.ts
@Injectable()
export class McpBridgeService {
  private mcpServerProcess: ChildProcess | null = null;
  
  async startMcpServer(): Promise<void> {
    if (this.mcpServerProcess) return; // Already running
    
    this.mcpServerProcess = spawn('codecrew', ['mcp'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
    });
    
    // Wait for server to be ready
    await this.waitForReady();
  }
  
  async stopMcpServer(): Promise<void> {
    if (this.mcpServerProcess) {
      this.mcpServerProcess.kill();
      this.mcpServerProcess = null;
    }
  }
  
  private async waitForReady(): Promise<void> {
    // MCP 서버가 준비될 때까지 대기
    return new Promise((resolve) => {
      setTimeout(resolve, 1000); // 간단한 구현
    });
  }
}
```

### Phase 4: Provider 통합
```typescript
// src/providers/claude.provider.ts
constructor(
  private readonly toolCallService?: ToolCallService,
  private readonly mcpBridgeService?: McpBridgeService,
) {
  super('ClaudeProvider');
}

async query(prompt: string, options: AIQueryOptions = {}): Promise<AIResponse> {
  // MCP 브릿지 사용 시
  if (this.mcpBridgeService && process.env.CODECREW_USE_MCP_BRIDGE === 'true') {
    await this.mcpBridgeService.startMcpServer();
    
    // MCP 서버를 통한 도구 사용
    // --mcp-config 옵션이 추가되므로 AI가 직접 도구 호출
    const response = await super.query(prompt, options);
    
    // JSON 가로채기 불필요 - AI가 이미 도구를 실행함
    return response;
  }
  
  // 기존 JSON 가로채기 방식 (fallback)
  return this.queryWithJsonInterception(prompt, options);
}
```

## 🔄 전환 전략

### 단계적 전환
```typescript
// 환경 변수로 제어
CODECREW_USE_MCP_BRIDGE=true  // MCP 브릿지 활성화
CODECREW_USE_MCP_BRIDGE=false // JSON 가로채기 방식 (기본)
```

### 모드 비교
| 모드 | Claude | Gemini | Copilot | 설정 |
|------|--------|--------|---------|------|
| **JSON 가로채기** | ⚠️ 선택적 | ❌ 거의 안 됨 | ❌ 미지원 | 간단 |
| **MCP 브릿지** | ✅ 완벽 | ✅ 완벽 | ❌ 미지원 | 복잡 |
| **하이브리드** | ✅ MCP 우선 | ✅ MCP 우선 | ✅ JSON | 권장 ⭐ |

## 🚧 구현 시 고려사항

### 1. MCP 서버 생명주기
- **문제**: CodeCrew가 자기 자신을 MCP 서버로 실행?
- **해결**: 별도 프로세스로 분리 또는 stdio 공유

### 2. 순환 참조 방지
```
CodeCrew CLI → Claude CLI → MCP Server (CodeCrew) → Claude CLI? ❌
```

**해결책:**
- MCP 서버는 도구만 노출, AI CLI 호출 안 함
- 도구 구현에서 순환 호출 금지

### 3. 포트 충돌
- stdio 기반 MCP 서버 사용 (포트 불필요)
- 각 요청마다 새 프로세스 또는 프로세스 풀

### 4. 성능
- MCP 서버 시작 시간: ~1초
- 프로세스 풀로 재사용
- 또는 장기 실행 데몬

## 📝 테스트 계획

### 1. MCP 서버 도구 노출 확인
```bash
# CodeCrew MCP 서버 실행
codecrew mcp

# 도구 목록 확인 (stdio로 통신)
# tools/list 요청
```

### 2. Claude CLI 연결 테스트
```bash
# MCP 설정 파일 생성
cat > test-mcp.json << 'EOF'
{
  "mcpServers": {
    "codecrew": {
      "command": "codecrew",
      "args": ["mcp"]
    }
  }
}
EOF

# Claude CLI에서 MCP 서버 사용
claude --mcp-config test-mcp.json \
       --allowed-tools "codecrew:*" \
       "Use codecrew:help tool to show usage"
```

### 3. Gemini CLI 연결 테스트
```bash
gemini --allowed-mcp-server-names codecrew \
       "Use codecrew:help tool"
```

## 🎯 기대 효과

### Before (JSON 가로채기)
```
User: "How do I use CodeCrew?"
    ↓
Claude: "Sorry, I'll redirect you to @codecrew" ❌
```

### After (MCP 브릿지)
```
User: "How do I use CodeCrew?"
    ↓
Claude: *checks available tools*
    ↓
Claude: *calls codecrew:help automatically*
    ↓
Result: "CodeCrew - Multi-Agent AI..." ✅
```

## 🚀 다음 단계

1. **MCP 서버 테스트**: `codecrew mcp` 실행하여 도구 노출 확인
2. **수동 연결 테스트**: `claude --mcp-config` 수동 테스트
3. **McpBridgeService 구현**: 자동 MCP 서버 시작/중지
4. **Provider 통합**: Claude/Gemini에 `--mcp-config` 추가
5. **하이브리드 모드**: MCP 우선, JSON 가로채기 fallback

## 📚 참고자료

- Claude CLI MCP: https://github.com/anthropics/claude-cli
- Gemini CLI MCP: (문서 확인 필요)
- MCP Protocol: https://modelcontextprotocol.io/
