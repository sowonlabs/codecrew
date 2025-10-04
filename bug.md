# 버그 리스트

## 지침
버그는 사이드이펙이 없도록 작성해야 합니다.
에이전트 중에 테스터 에이전트를 활용해서 협업을 하세요.
작업 발생 중에 버그가 발생하면 'bug-00000000' 포맷을 참고해서 아래에 추가를 해 주세요.
상태에 대해서 설명하면 created, analyzed, in-progress, rejected, resolved, closed 상태가 있으며
첫 버그 발생시에는 created로 작성합니다. 
analyzed는 버그 분석이 완료되어 '분석:' 항목이 추가되고 상태가 analyzed로 변경된 상태입니다.
resolved 상태에서는 삭제를 하면 안되고 사람인 유저 개발자가 확인 후에 closed 상태로 변경할 수 있습니다. (채팅을 통해서 또는 사람이 직접 수정)

### 브랜치 정책
버그가 발생하면 현재 작업중인 버전이 아닌 경우에는 main 브랜치에서 bugfix/bug-00000000 브랜치를 worktree 디렉토리 하위에 git worktree로 생성합니다.
이 디렉토리에 수정작업을 진행하고 테스터와 협업을 통해 테스트가 완료가 되면 작업내용을 커밋을 한 후에 상태를 resolved로 변경합니다. 그리고 작업자를 dohapark으로 변경 해 주세요. (사람 개발자가 확인 후에 closed가 됩니다. 확인후 현상 재현시 rejected가 됨. 작업자는 rejected 된 이슈를 확인하세요.)
상세하게 기술할 문서 작성이 필요한 경우 doc에 bug ID로 md 파일을 작성해 주세요.

## bugs (Total:13, Created:7, Resolved:4, Closed:2)
### 병렬처리 버그 (예시 - 버그 작성 포맷 템플릿)
ID: bug-00000000
우선순위: 긴급
상태: example
작성자: codecrew_dev
작업자: -
생성일: 2025-10-03 19:18:11
수정일: 2025-10-03 20:12:23
현상: 이 버그 현상에 대해서 적어주세요.
환경: 맥os / 윈도우
원인: 이 버그 원인을 파악하고 원인을 적어주세요.
분석: 
  1. 현재 문제점 정확히 파악
  2. 원인 상세 분석
  3. 구체적인 해결책 제안 (코드 예시 포함)
  4. 예상되는 문제점과 해결 방법
  5. 테스트 방법
해결책: 해결책을 적어주세요.
사유: 버그가 재현되어 리젝되었습니다.
---

### Claude CLI v2.0 Breaking Changes  
ID: bug-00000002
우선순위: 긴급
버전: 0.3.5
상태: closed
작성자: GitHub Copilot
작업자: GitHub Copilot
생성일: 2025-10-03 19:15:00
수정일: 2025-10-03 21:00:00
현상:
Slack Bot에서 Claude 에이전트 실행 시 `spawn ENOENT` 에러 발생하여 실행 실패
환경:
macOS / Claude CLI v2.0.5 (심볼릭 링크) / CodeCrew v0.3.5 / dotenv 환경
원인:
1. ✅ Claude CLI v2.0.0 플래그 순서 변경 (해결됨)
2. ✅ console.log stdout 오염 (해결됨)
3. ✅ PATH 환경 변수 문제 (해결됨: getToolPath로 fallback 경로 체크)
4. ✅ 심볼릭 링크 해결 (해결됨: realpathSync 사용)
5. 🔄 .js 파일 spawn 실행 실패 (작업 중)
   - `cli.js`를 spawn으로 직접 실행 시 ENOENT
   - shebang은 있지만 spawn이 인식 못함
해결책:
.js 파일은 `node` 명령어로 명시적으로 실행하도록 수정
```typescript
if (executablePath.endsWith('.js')) {
  spawnArgs = [executablePath, ...args];
  executable = process.execPath; // Use node
}
```
참고문서: docs/bug-00000002.md
---

### Slack Bot 에러 발생 시 Completed 아이콘 표시
ID: bug-00000003
우선순위: 높음
버전: 0.3.5
상태: created
작성자: dohapark
작업자: -
생성일: 2025-10-03 21:00:00
수정일: -
현상:
Slack Bot에서 에러가 발생했는데도 `:white_check_mark: Completed!` 메시지와 아이콘이 표시됨
실제로는 "Claude CLI is not installed" 에러가 발생했지만 사용자에게는 성공한 것처럼 보임
환경:
macOS / Slack Bot / CodeCrew v0.3.5
원인:
Slack Bot의 응답 처리 로직에서 에러 상태를 제대로 체크하지 않고 무조건 Completed 표시
해결책:
src/slack/slack-bot.ts에서 result.success를 체크하여 실패 시 에러 메시지 표시
참고문서: -
---

### 로그 버그
ID: bug-00000001
우선순위: 긴급
버전: 0.3.5
상태: resolved
작성자: dohapark
작업자: dohapark
생성일: 2025-10-03 19:22:00
수정일: 2025-10-04 18:30:00
현상:
```
🔍 DEBUG: Checking if claude has queryWithTools: function
🔧 DEBUG: Using queryWithTools for claude in query mode
🔧 DEBUG: Response content type: string
```
위와 같은 로그가 MCP에서도 나오고 있는 상황이라서 MCP에서 파싱오류가 남.
기타 실행할 때에도 로그가 보여서 버그라고 느껴짐

환경: 맥os / 윈도우

원인:
개발 중 디버깅을 위해 추가한 `console.log` DEBUG 로그들이 프로덕션 코드에 남아있음.
다음 파일들에 DEBUG 로그가 포함되어 있었음:
1. src/ai-provider.service.ts (queryAI, executeAI 메서드)
2. src/providers/claude.provider.ts (queryWithTools 메서드)
3. src/providers/gemini.provider.ts (execute, queryWithTools 메서드)
4. src/providers/copilot.provider.ts (execute, queryWithTools, parseToolUse 메서드)

이러한 로그들이 stdout으로 출력되어 MCP에서 JSON 파싱 오류를 발생시키고,
일반 CLI 실행 시에도 불필요한 로그가 표시되는 문제 발생.

해결책:
모든 provider 파일과 service 파일에서 `console.log` DEBUG 로그 제거.
필요한 로그는 NestJS Logger를 통해 출력하도록 유지.

수정 파일:
- src/ai-provider.service.ts: console.log DEBUG 로그 6개 제거
- src/providers/claude.provider.ts: console.log DEBUG 로그 3개 제거
- src/providers/gemini.provider.ts: console.log DEBUG 로그 12개 제거
- src/providers/copilot.provider.ts: console.log DEBUG 로그 24개 제거

검증:
✅ CLI 실행 시 DEBUG 로그 출력 없음 확인
✅ Gemini provider 테스트 시 DEBUG 로그 출력 없음 확인
✅ 소스 코드에서 console.log DEBUG 패턴 없음 확인
---

### Thread 대화 연속성 버그 (Conversation Context Not Preserved)
ID: bug-00000004
우선순위: 긴급
버전: 0.3.5
상태: resolved
작성자: codecrew_tester
작업자: dohapark
생성일: 2025-10-04 15:56:32
수정일: 2025-10-04 16:08:00
현상:
`--thread` 옵션을 사용한 대화에서 이전 메시지의 컨텍스트가 보존되지 않음.
스레드는 생성되고 파일도 저장되지만, 다음 쿼리에서 이전 대화 내용을 기억하지 못함.

테스트 케이스:
```bash
# 첫 번째 메시지
node dist/main.js query "@claude:haiku test" --thread "test-thread"
# 응답: 정상

# 두 번째 메시지 (이전 내용 기억해야 함)
node dist/main.js query "@claude:haiku 이전 메시지에서 내가 뭐라고 물어봤지?" --thread "test-thread"
# 응답: "I do not see a previous message in the context"
```

환경: macOS / CodeCrew v0.3.5 / CLI 모드
원인:
1. ✅ `excludeCurrent: true` 파라미터 문제 - 히스토리 로드 시 마지막 Assistant 메시지가 제외됨
2. ✅ 컨텍스트 포맷팅 문제 - `<Context>` 태그 형식이 AI가 대화 히스토리로 인식하지 못함

해결책:
1. ✅ query.handler.ts 73라인: `excludeCurrent: false` 로 변경 - 히스토리 fetch 시점에서는 새 메시지가 아직 추가되지 않았으므로 모든 메시지를 포함해야 함
2. ✅ codecrew.tool.ts 446-455라인: 컨텍스트 포맷팅 개선 - `## Previous Conversation:` 형식으로 변경하여 AI가 대화 히스토리로 명확히 인식하도록 함

수정 파일:
- src/cli/query.handler.ts (L73-76)
- src/codecrew.tool.ts (L446-455)

검증:
```bash
# 테스트 1: 이름 기억
node dist/main.js query "@claude:haiku My favorite programming language is Python" --thread "verify-fix"
node dist/main.js query "@claude:haiku What is my favorite programming language?" --thread "verify-fix"
# ✅ 응답: "According to our previous conversation, your favorite programming language is Python."

# 테스트 2: 원본 버그 시나리오
node dist/main.js query "@claude:haiku test" --thread "bug-reproduce"
node dist/main.js query "@claude:haiku 이전 메시지에서 내가 뭐라고 물어봤지?" --thread "bug-reproduce"
# ✅ 응답: "이전 메시지에서 'test'라는 테스트 메시지를 보내셨지만..."
```

참고문서: reports/report-20251004_155632.md (테스터 리포트)
---

### Thread 대화 파일 저장 안됨 (Thread Conversation Files Not Being Saved)
ID: bug-00000005
우선순위: 긴급
버전: 0.3.5
상태: closed
작성자: codecrew_tester
작업자: dohapark
생성일: 2025-10-04 16:14:52
수정일: 2025-10-04 17:58:00
종료일: 2025-10-04 18:20:00
현상:
Thread 대화가 세션 중에는 정상 작동하지만 `.codecrew/conversations/` 디렉토리에 파일이 저장되지 않음.
대화 컨텍스트는 메모리에서만 유지되고 디스크에 영구 저장되지 않아 CLI 재시작 시 대화 내용이 손실됨.

테스트 케이스:
```bash
# Thread 대화 생성
node dist/main.js query "@claude:haiku My name is Alice" --thread "test-verification"
node dist/main.js query "@claude:haiku What is my name?" --thread "test-verification"
# ✅ 세션 중: 정상 작동 (Alice 기억함)

# 디렉토리 확인
ls -la .codecrew/conversations/
# ❌ 문제: test-verification.json 파일이 생성되지 않음
```

환경: macOS / CodeCrew v0.3.5 / CLI 모드

증거:
- 디렉토리: `/Users/doha/git/codecrew/.codecrew/conversations/`
- 최신 파일 타임스탬프: Oct 4 16:07 (테스트 실행 시각 16:12 이전)
- 기대된 파일: `test-verification.json`, `test-korean.json`, `test-multi.json`
- 실제 결과: 파일 생성 안됨

원인 (추정):
1. 파일 저장 메커니즘이 트리거되지 않음
2. Thread 이름에 대한 파일 경로 생성 문제
3. 비동기 write 작업이 완료되기 전에 종료됨
4. ConversationStorageService의 saveThread 메소드 호출 누락

해결책 (제안):
1. conversation-storage.service.ts의 saveThread 메소드 호출 여부 확인
2. query.handler.ts에서 addMessage 후 명시적 저장 호출 추가
3. 비동기 작업 완료 대기 (await) 확인
4. 파일 저장 로깅 추가하여 저장 과정 추적

영향도:
- 세션 중: 컨텍스트 정상 작동 ✅
- 영구 저장: 파일 저장 실패 ❌
- 데이터 손실: CLI 재시작 시 대화 내용 손실
- 장기 Thread 대화: 지속성 없음

검증 결과:
✅ **버그 재현 불가 - 정상 작동 확인**
- Thread 대화 파일이 `.codecrew/conversations/` 디렉토리에 정상적으로 저장됨
- 파일 구조 및 메타데이터 정확하게 기록됨
- bug-00000004 수정 과정에서 함께 해결된 것으로 추정

최종 검증 (2025-10-04):
✅ **완전 수정 확인 - 모든 테스트 통과 (4/4)**
- 테스트 스레드 ID: verify-bug-005-20251004_171757
- 3개 메시지 대화 생성 및 저장 확인
- JSON 파일 구조 검증: threadId, messages[], metadata 모두 정상
- 파일 권한 및 타임스탬프 정상: 1,261 bytes, Oct 4 17:18
- 모든 메시지 내용 및 메타데이터 정확하게 저장됨

참고문서: 
- reports/report-20251004_161452.md (초기 발견 리포트)
- reports/report-20251004_164138.md (검증 테스트 - 버그 재현 불가)
- reports/report-20251004_171915.md (최종 검증 - 완전 수정 확인)
---

### MCP 에이전트 파일 수정 도구 부재 (설계 개선)
ID: bug-00000006
우선순위: 긴급
버전: 0.3.5
상태: closed
작성자: GitHub Copilot
작업자: dohapark
생성일: 2025-10-04 16:45:00
수정일: 2025-10-04 17:30:00
종료일: 2025-10-04 17:55:00
현상:
Slack Bot에서 에이전트가 파일을 수정할 수 없음.
CLI에서는 `execute` 명령어로 파일 수정이 가능하지만, Slack에서는 불가능함.

테스트 비교:
```bash
# CLI 모드 (정상 작동)
node dist/main.js execute "@codecrew_dev" "Create test.txt"
# ✅ 성공: codecrew_dev가 Claude CLI로 spawn되어 Write 도구 사용

# Slack 모드 (파일 수정 불가)
@codecrew Create test.txt
# ❌ 실패: codecrew_dev가 queryAgent로 실행되어 read-only
```

환경: 
- macOS / CodeCrew v0.3.5 / Slack Bot 모드
- Slack Bot → queryAgent (read-only)
- CLI → executeAgent (can modify files)

원인 (코드 분석 완료):
**Slack Bot이 항상 `queryAgent`를 사용하여 read-only 모드로 실행:**

```typescript
// src/slack/slack-bot.ts Line 170
const result = await this.codeCrewTool.queryAgent({
  agentId: this.defaultAgent,
  query: userRequest,
  context: contextText || undefined,
});
```

- `queryAgent`: Read-only mode (파일 수정 불가)
- `executeAgent`: Implementation mode (파일 수정 가능)

**CLI와의 차이:**
```typescript
// CLI execute command
node dist/main.js execute "@agent" "task"
→ cli/execute.handler.ts
→ codecrew.tool.ts executeAgent()
→ Claude CLI spawn with Write tools ✅

// Slack Bot
Slack message "@agent task"
→ slack-bot.ts handleCommand()
→ codecrew.tool.ts queryAgent() ❌
→ Claude CLI spawn with read-only
```

증거:
1. **Slack Bot 코드** (src/slack/slack-bot.ts:170):
   ```typescript
   const result = await this.codeCrewTool.queryAgent({
     agentId: this.defaultAgent, // codecrew_dev
     query: userRequest,
   });
   ```

2. **queryAgent vs executeAgent 차이** (src/codecrew.tool.ts):
   - queryAgent: "read-only mode. No file modifications"
   - executeAgent: "Can provide implementation guidance, code examples, and actionable solutions"

3. **MCP 테스트 성공** (task_1759563588319_ad43hpw3o):
   - `executeAgent`를 통해 파일 생성 ✅
   - Write 도구 사용 가능 확인

해결책:
**Slack Bot이 executeAgent를 사용하도록 변경:**

```typescript
// src/slack/slack-bot.ts Line 170
// Before:
const result = await this.codeCrewTool.queryAgent({
  agentId: this.defaultAgent,
  query: userRequest,
  context: contextText || undefined,
});

// After:
const result = await this.codeCrewTool.executeAgent({
  agentId: this.defaultAgent,
  task: userRequest,
  context: contextText || undefined,
});
```

**주의사항:**
- executeAgent는 파일 수정이 가능하므로 보안 위험 증가
- Slack workspace 멤버만 접근 가능하도록 권한 확인 필요
- 또는 사용자가 명시적으로 요청할 때만 executeAgent 사용:
  ```typescript
  if (userRequest.includes('create') || userRequest.includes('modify')) {
    // Use executeAgent
  } else {
    // Use queryAgent
  }
  ```

영향도:
- 기능: Slack에서 파일 수정 불가능 (심각)
- CLI: 정상 작동 (executeAgent 사용)
- 보안: executeAgent 사용 시 권한 검토 필요

우선순위: 긴급
- Slack Bot의 핵심 기능인 코드 수정이 불가능
- CLI와 Slack의 동작이 다름 (일관성 문제)
- 사용자 기대와 실제 동작 불일치

수정 파일:
- src/slack/slack-bot.ts (Line 170)

검증 방법:
```bash
# Slack Bot 테스트
1. Slack에서 "@codecrew Create test.txt with content 'hello'"
2. 파일 생성 확인: ls test.txt
3. 성공: 파일 생성됨 ✅
```

참고:
- Task Log: task_1759563588319_ad43hpw3o (executeAgent 테스트 성공)
- Slack Bot 코드: src/slack/slack-bot.ts
- MCP Tool: src/codecrew.tool.ts (queryAgent vs executeAgent)
---

### agents.yaml 문서 동적 로딩 기능 미작동
ID: bug-00000007
우선순위: 중간
버전: 0.3.5
상태: created
작성자: CSO 프로젝트
작업자: -
생성일: 2025-10-04 00:00:00
수정일: -
현상:
`agents.yaml`에서 `{{{documents.xxx.content}}}` Mustache 문법을 사용한 문서 동적 로딩이 작동하지 않음.
에이전트 실행 시 문서 내용이 빈 문자열로 치환됨.

테스트 케이스:
```yaml
documents:
  - id: "codecrew-docs"
    name: "CodeCrew 프로젝트 문서"
    path: "./docs/codecrew.md"

agents:
  - id: "cso"
    inline:
      system_prompt: |
        <business-documentation>
        {{{documents.codecrew-docs.content}}}
        </business-documentation>
```

실제 로그 증거:
파일: `.codecrew/logs/task_1759570888659_7wb6rk8v3.log` (라인 120-123)
```
## 참고 문서
<business-documentation>
**CodeCrew 프로젝트:**


**AI 비즈니스 전략:**

</business-documentation>
```
✅ 기대 결과: 문서 내용이 포함되어야 함
❌ 실제 결과: 빈 문자열

환경: macOS / CodeCrew v0.3.5

원인 (추정):
1. 문서 파싱 로직 미구현 - {{{documents.xxx.content}}} 치환 로직이 없음
2. 문서 로드 타이밍 이슈 - 에이전트 실행 시점에 문서를 읽지 않음
3. Mustache 템플릿 엔진 설정 오류 - 템플릿 엔진이 설정되지 않았거나 문서 객체를 주입하지 않음

해결책:
**Option 1: 즉시 수정 (Quick Fix)** - 난이도: 쉬움 (1-2시간)
system_prompt에 문서 내용을 직접 포함
- 장점: 즉시 동작
- 단점: 문서 수정 시마다 agents.yaml 전체 수정 필요, Google Docs 동기화 의미 상실

**Option 2: 템플릿 엔진 구현 (Proper Fix)** ⭐ 권장 - 난이도: 중간 (4-8시간)
codecrew CLI에 문서 로딩 로직 추가
구현 위치: src/cli/agent-loader.ts, src/utils/template-renderer.ts
구현 단계:
1. Mustache 템플릿 엔진 추가 (`npm install mustache`)
2. agents.yaml 파싱 시 documents 섹션 로드
3. 각 에이전트의 system_prompt를 Mustache 렌더링
4. 렌더링된 프롬프트를 AI에 전달

필요 코드 예시:
```typescript
// scripts/load-agent.ts (가칭)
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as Mustache from 'mustache';

interface Document {
  id: string;
  path: string;
  content?: string;
}

function loadDocuments(config: any): Record<string, Document> {
  const docs: Record<string, Document> = {};
  for (const doc of config.documents || []) {
    const content = fs.readFileSync(doc.path, 'utf-8');
    docs[doc.id] = { ...doc, content };
  }
  return docs;
}

function renderAgentPrompt(agent: any, documents: Record<string, Document>): string {
  const context = { documents };
  return Mustache.render(agent.inline.system_prompt, context);
}
```

영향도:
- 기능적 영향:
  ✅ 정상 작동: 에이전트는 system_prompt에 직접 작성된 내용으로 답변 생성 가능
  ❌ 미작동: 외부 문서 파일을 참조한 동적 컨텍스트 제공 불가
- 비즈니스 임팩트:
  현재: system_prompt에 전략 정보를 하드코딩 → 문서 수정 시마다 YAML 수정 필요
  기대: 문서 파일만 업데이트 → 에이전트가 자동으로 최신 정보 참조 → Google Docs 연동의 핵심 가치 실현

우선순위 평가:
- 비즈니스 임팩트: 3/5 (Google Docs 연동이 핵심 기능이나 우회 가능)
- 기술적 긴급성: 3/5 (에이전트는 작동하나 유지보수 비용 증가)
- 사용자 불편: 4/5 (문서 수정할 때마다 YAML 수정 필요)
- 구현 난이도: 2/5 (템플릿 엔진은 표준 기술)
총점: 12/20 → 권장 우선순위: **Medium (2주 내 수정)**

테스트 케이스:
Test 1: 단일 문서 로드
```yaml
documents:
  - id: "test-doc"
    path: "./test.md"
agents:
  - id: "test-agent"
    inline:
      system_prompt: "Content: {{{documents.test-doc.content}}}"
```
기대 결과: test.md 내용이 프롬프트에 포함

Test 2: 다중 문서 로드
```yaml
documents:
  - id: "doc1"
    path: "./doc1.md"
  - id: "doc2"
    path: "./doc2.md"
agents:
  - id: "multi-agent"
    inline:
      system_prompt: |
        Doc1: {{{documents.doc1.content}}}
        Doc2: {{{documents.doc2.content}}}
```
기대 결과: 두 문서 내용 모두 포함

Test 3: 존재하지 않는 문서
```yaml
documents: []
agents:
  - id: "error-agent"
    inline:
      system_prompt: "{{{documents.nonexistent.content}}}"
```
기대 결과: 명확한 에러 메시지 출력

관련 파일:
- agents.yaml - 에이전트 설정
- .codecrew/logs/task_1759570888659_7wb6rk8v3.log - 버그 재현 로그
- docs/codecrew.md - 참조되어야 하는 문서
- docs/ai-business-ideas.md - 참조되어야 하는 문서

참고문서: -
---

### Slack 메시지 2000자 제한 초과 시 에러
ID: bug-00000008
우선순위: 높음
버전: 0.3.5
상태: resolved
작성자: dohapark
작업자: dohapark
생성일: 2025-10-04
수정일: 2025-10-04 22:00:00
현상:
Slack Bot 응답이 2000자를 초과하면 `invalid_blocks` 에러가 발생하며 사용자에게 에러 메시지만 표시됨.
환경:
macOS / Slack Bot / CodeCrew v0.3.5
원인:
Slack Block Kit의 텍스트 블록 길이 제한(3000자)을 초과하거나, 전체 메시지 구조가 Slack API 제한을 위반함.
해결책:
긴 응답을 여러 메시지로 분할하거나, 파일 업로드 방식으로 전환 필요.

검증:
src/slack/formatters/message.formatter.ts 파일의 formatExecutionResult 메서드 (line 31-90)에서 큰 응답 분할 로직이 이미 구현되어 있음을 확인:
1. 2900자 초과 시 자동 분할 (line 39-56)
2. 50개 블록 제한 검증 (line 155-165)
3. 마크다운 보존 (line 171-213)

참고문서: -
---

### Slack Bot executeAgent 응답에 불필요한 메타데이터 표시
ID: bug-00000009
우선순위: 높음
버전: 0.3.7
상태: resolved
작성자: dohapark
작업자: dohapark
생성일: 2025-10-04 20:14:00
수정일: 2025-10-04 21:28:00
현상:
Slack Bot에서 `executeAgent`를 사용할 때 응답에 불필요한 메타데이터가 모두 표시됨.
간단한 질문("hi")에도 장황한 응답이 나옴:

**표시되는 불필요한 정보:**
- "⚡ **Agent Execution Response**"
- "**Task ID:** task_xxx"
- "**Agent:** cso (claude)"
- "**Working Directory:** Default for cso"
- "**Implementation Guidance:**" 헤더
- "**Context:** Previous conversation..." (이전 대화 전체 포함)
- "Use getTaskLogs with taskId..." 안내
- "**⚠️ Important Recommendations:**" (3개 항목)

**기대 동작:**
Slack에서는 AI의 실제 답변만 깔끔하게 표시되어야 함.
메타데이터는 헤더 블록과 완료 메시지에만:
- 헤더: `🤖 cso`
- 완료 메시지: `✅ Completed! (@cso)`
- 본문: AI의 실제 답변만

환경: macOS / Slack Bot / CodeCrew v0.3.7

원인:
`src/codecrew.tool.ts`의 `executeAgent` 메서드(line 669-688)에서 응답 포맷팅 시 모든 메타데이터를 포함:

```typescript
const responseText = `⚡ **Agent Execution Response**
**Task ID:** ${taskId}
**Agent:** ${agentId} (${response.provider})
...
**Implementation Guidance:**
${response.success ? response.content : ...}
${context ? `**Context:** ${context}` : ''}
...
`;
```

이 `responseText`가 `content[0].text`에 저장되고, Slack Bot이 이를 그대로 표시함.

해결책:
**Option 1: executeAgent 응답에 rawResponse 필드 추가** (추천)
```typescript
return {
  content: [{ type: 'text', text: responseText }], // MCP/CLI용
  rawResponse: response.content, // Slack용 (AI 답변만)
  taskId, success, agent, ...
};
```

Slack Bot에서 `result.rawResponse` 사용:
```typescript
const responseText = (result as any).rawResponse || 
  (result as any).implementation || ...;
```

**Option 2: Slack Bot에서 정규식 파싱** (임시)
- "Implementation Guidance:" 이후 섹션만 추출
- 단점: 포맷 변경 시 깨짐

영향도:
- 사용자 경험: 높음 (모든 메시지에 영향)
- 토큰 사용: 높음 (불필요한 메타데이터)
- 가독성: 심각 (간단한 질문도 장황)

우선순위: 높음

테스트 케이스:
Test 1: 간단한 질문 - "hi"
기대: "안녕하세요! 무엇을 도와드릴까요?"
실제: 8줄 메타데이터 + 답변

Test 2: 스레드 답글 - "요약해줘"
기대: 요약 내용만
실제: 메타데이터 + 이전 대화 전체 + 요약

관련 파일:
- src/codecrew.tool.ts (Line 669-688)
- src/slack/slack-bot.ts (Line 194-202)

참고 로그: .codecrew/logs/task_1759576448661_7j2xohnol.log

해결 방법:
executeAgent 응답에 'implementation' 필드 추가하여 순수 AI 응답만 추출.
Slack Bot에서 'implementation' 필드 우선 사용하도록 수정.

커밋: 4b70dd7 - fix(slack): Remove unnecessary metadata from executeAgent responses (bug-00000009)

참고문서: -
---

### Slack 대화 히스토리에서 Assistant 답변 내용 누락
ID: bug-00000010
우선순위: 긴급
버전: 0.3.7
상태: resolved
작성자: dohapark
작업자: dohapark
생성일: 2025-10-04 20:42:00
수정일: 2025-10-04 21:50:00
현상:
Slack Bot의 대화 히스토리에서 Assistant의 실제 답변 내용이 누락되고 "✅ Completed!" 메시지만 표시됨.
AI가 이전 대화를 참조할 때 내용을 알 수 없음.

**로그 증거 (task_1759578041374_044cus1no.log):**
```
Additional Context: Previous conversation in this Slack thread:
User: @user 오늘 날씨 알려줘
Assistant: ✅ Completed!          ← 실제 답변 내용이 없음
User: @user 첫번째 응답 뭐라고 왔지?
Assistant: ✅ Completed!          ← 실제 답변 내용이 없음
User: @user 첫번째 응답에 대답한건 누구지?
Assistant: ✅ Completed!          ← 실제 답변 내용이 없음
```

**기대 결과:**
```
User: @user 오늘 날씨 알려줘
Assistant (@cso): 죄송하지만 저는 CSO로서 날씨 정보는...
User: @user 첫번째 응답 뭐라고 왔지?
Assistant (@codecrew_dev): 첫번째 응답은 "오늘 날씨 알려줘"였습니다.
```

환경: macOS / Slack Bot / CodeCrew v0.3.7

원인:
`src/conversation/slack-conversation-history.provider.ts` (line 77)에서 메시지 텍스트 추출 시 `msg.text` 필드만 사용:

```typescript
text: this.sanitizeMessage(this.cleanSlackText(msg.text || '')),
```

**Slack 메시지 구조:**
- `text`: "✅ Completed! (@agent_id)" (간단한 텍스트)
- `blocks`: 실제 AI 답변이 포함된 구조화된 블록

Bot 메시지의 실제 내용은 `blocks[].text.text`에 있으나, 현재 코드는 `text` 필드만 읽어서 "Completed!" 메시지만 가져옴.

해결책:
**Bot 메시지의 경우 blocks에서 내용 추출:**

```typescript
// bot 메시지인 경우 blocks에서 실제 답변 추출
const extractMessageContent = (msg: any): string => {
  if (msg.bot_id && msg.blocks && Array.isArray(msg.blocks)) {
    // header 블록 제외하고 section 블록들만 추출
    const sections = msg.blocks
      .filter((b: any) => b.type === 'section' && b.text?.text)
      .map((b: any) => b.text.text);
    
    if (sections.length > 0) {
      return this.cleanSlackText(sections.join('\n\n'));
    }
  }
  
  // fallback: text 필드 사용
  return this.cleanSlackText(msg.text || '');
};

const messages = result.messages.map((msg: any) => ({
  ...
  text: this.sanitizeMessage(extractMessageContent(msg)),
  ...
}));
```

영향도:
- 대화 연속성: 치명적 (이전 답변 내용을 모름)
- 멀티턴 대화: 불가능 (컨텍스트 손실)
- 에이전트 협업: 불가능 (다른 에이전트 답변 못 봄)

우선순위: 긴급
- 대화 히스토리의 핵심 기능
- 멀티턴 대화 완전히 깨짐
- 에이전트 구분 기능도 무의미

관련 파일:
- src/conversation/slack-conversation-history.provider.ts (Line 77)
- src/slack/slack-bot.ts (메시지 전송 시 blocks 사용)

참고 로그: 
- .codecrew/logs/task_1759578041374_044cus1no.log (초기 발견)
- .codecrew/logs/task_1759581760245_uir9xqf6o.log (사용자 테스트 재현, 2025-10-04 21:42)

테스트 재현 (2025-10-04 21:42):
```
실제 첫 응답: "Hi! I'm ready to help you with the CodeCrew project..."
히스토리 기록: ":white_check_mark: Completed! (@codecrew_dev)"
→ 실제 답변 내용이 완전히 누락되어 "Completed!" 메시지만 저장됨
```

참고문서: -
---

### Slack Bot 큰 메시지 에러 (invalid_blocks)
ID: bug-00000011
우선순위: 높음
버전: 0.3.7
상태: created
작성자: dohapark
작업자: -
생성일: 2025-10-04 20:42:00
수정일: -
현상:
AI 응답이 길 경우 Slack API 에러 발생:
```
❌ Error: An API error occurred: invalid_blocks
```

사용자에게 에러 메시지만 표시되고 실제 AI 답변을 볼 수 없음.

환경: macOS / Slack Bot / CodeCrew v0.3.7

원인:
Slack Block Kit API 제한:
- 단일 section block: 최대 3000자
- 전체 blocks 배열: 최대 50개 블록
- 전체 메시지: 최대 40,000자

**현재 코드 (message.formatter.ts line 38-46):**
```typescript
blocks.push({
  type: 'section',
  text: {
    type: 'mrkdwn',
    text: response,  // ← 3000자 초과 시 에러
  },
});
```

`splitIntoSections()` 메서드는 존재하나 사용되지 않음.

해결책:
**Option 1: splitIntoSections 사용** (임시 해결)
```typescript
const sections = this.splitIntoSections(response, 2900);
sections.forEach(sectionText => {
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: sectionText },
  });
});
```

**Option 2: 멀티턴 응답** (추천)
큰 응답을 여러 메시지로 분할:
```typescript
async sendLargeResponse(say: Function, response: string, threadTs: string) {
  const chunks = this.splitIntoChunks(response, 10000); // 10KB per message
  
  for (let i = 0; i < chunks.length; i++) {
    const blocks = this.formatChunk(chunks[i], i + 1, chunks.length);
    await say({
      text: `Part ${i + 1}/${chunks.length}`,
      blocks: blocks,
      thread_ts: threadTs,
    });
    
    // Rate limit: 1 message per second
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

**Option 3: 파일 업로드** (대용량)
40KB 초과 시 텍스트 파일로 업로드:
```typescript
if (response.length > 40000) {
  await client.files.upload({
    channels: channel,
    thread_ts: threadTs,
    content: response,
    filename: `response_${taskId}.txt`,
    title: 'AI Response (텍스트 파일)',
  });
}
```

영향도:
- 사용자 경험: 높음 (긴 답변 못 봄)
- 발생 빈도: 중간 (복잡한 질문 시)
- 데이터 손실: 있음 (에러 시 답변 유실)

우선순위: 높음
- 긴 답변이 필요한 질문에 답변 불가
- 에러 메시지만 표시되어 혼란

테스트 케이스:
```
Test 1: 3000자 초과 단일 응답
@codecrew "CodeCrew 아키텍처를 상세히 설명해줘 (5000자 이상)"
기대: 멀티턴 또는 분할된 블록으로 표시
실제: invalid_blocks 에러

Test 2: 매우 긴 응답 (10000자+)
@codecrew "모든 버그 리스트를 상세히 설명해줘"
기대: 여러 메시지로 분할 또는 파일 업로드
실제: invalid_blocks 에러
```

관련 파일:
- src/slack/formatters/message.formatter.ts (Line 38-46: 블록 생성)
- src/slack/formatters/message.formatter.ts (Line 113-150: splitIntoSections 메서드)
- src/slack/slack-bot.ts (메시지 전송)

참고문서:
- Slack Block Kit 제한: https://api.slack.com/reference/block-kit/blocks

참고: bug-00000008 (유사 문제)

해결책 상세:

**✅ 선택된 옵션: Option 1 (splitIntoSections) 우선 적용 + Option 2 (멀티턴) 대비**

**선택 이유:**
1. **즉시 효과**: 기존 splitIntoSections() 메서드를 활용하여 1시간 내 구현 가능
2. **점진적 개선**: Option 1로 3000자 제한 해결 → 향후 Option 2로 확장
3. **최소 변경**: message.formatter.ts만 수정하면 되어 사이드 이펙트 최소화
4. **테스트 용이**: 단일 메시지 방식이라 히스토리 저장 등 기존 로직과 호환

**즉시 구현 (Option 1 - splitIntoSections 적용):**

```typescript
// src/slack/formatters/message.formatter.ts
// Line 31-46 수정

formatExecutionResult(result: ExecutionResult): (Block | KnownBlock)[] {
  const blocks: (Block | KnownBlock)[] = [];

  if (result.success) {
    const response = this.truncateForSlack(result.response, this.maxResponseLength);

    // ✅ 3000자 제한 대응: splitIntoSections 사용
    if (response.length > 2900) {
      // 2900자로 분할 (안전 마진 100자)
      const sections = this.splitIntoSections(response, 2900);
      
      sections.forEach((sectionText, index) => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: sectionText,
          },
        });
        
        // 선택적: 섹션 구분선 (가독성 향상)
        if (index < sections.length - 1) {
          blocks.push({ type: 'divider' });
        }
      });
    } else {
      // 짧은 응답은 단일 블록 유지
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: response,
        },
      });
    }
  } else {
    // 에러 처리는 기존 로직 유지
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `❌ *Error*\n\`\`\`${result.error || 'Unknown error'}\`\`\``,
      },
    });

    blocks.push({
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: `Agent: *${result.agent}* (${result.provider}) · Task ID: \`${result.taskId}\``,
      }],
    });
  }

  return blocks;
}
```

**블록 개수 제한 검증 (50개 블록 제한 대응):**

```typescript
// src/slack/formatters/message.formatter.ts
// splitIntoSections 호출 전 검증 로직 추가

private validateBlockCount(response: string, maxCharsPerSection: number): number {
  const estimatedBlocks = Math.ceil(response.length / maxCharsPerSection);
  const MAX_BLOCKS = 48; // 50개 제한에서 헤더/footer 여유분 고려
  
  if (estimatedBlocks > MAX_BLOCKS) {
    // 블록 개수 초과 시 섹션 크기 확대
    return Math.ceil(response.length / MAX_BLOCKS);
  }
  
  return maxCharsPerSection;
}

// formatExecutionResult에서 사용
const adjustedMaxChars = this.validateBlockCount(response, 2900);
const sections = this.splitIntoSections(response, adjustedMaxChars);
```

**Option 2 (멀티턴 응답) 향후 구현 가이드:**

멀티턴이 필요한 시나리오:
- 40KB 초과 메시지 (50개 블록으로도 부족)
- 실시간 스트리밍 효과 원할 때
- 긴 코드 생성 작업

구현 위치: `src/slack/slack-bot.ts`에 `sendMultiTurnResponse()` 메서드 추가

```typescript
// 향후 구현 예시 (참고용)
private async sendLargeResponse(
  say: any,
  response: string,
  threadTs: string,
  agentId: string,
) {
  const CHUNK_SIZE = 8000; // 8KB per message
  const chunks = this.splitIntoChunks(response, CHUNK_SIZE);
  
  for (let i = 0; i < chunks.length; i++) {
    const blocks = this.formatter.formatExecutionResult({
      agent: agentId,
      response: chunks[i],
      success: true,
      taskId: 'multi-turn',
      provider: agentId,
    });
    
    await say({
      text: `Part ${i + 1}/${chunks.length} (@${agentId})`,
      blocks: blocks,
      thread_ts: threadTs,
    });
    
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

**예상 문제점과 해결:**

1. **마크다운 파싱 깨짐**
   - 문제: 코드 블록이 섹션 경계에서 잘림
   - 해결: splitIntoSections()의 breakPoint 로직이 이미 처리 (줄바꿈 단위 분할)

2. **divider 블록 추가로 50개 제한 근접**
   - 문제: divider를 넣으면 블록 개수 2배
   - 해결: divider는 선택적으로만 사용 (10개 이상 섹션일 때는 생략)

3. **SLACK_MAX_RESPONSE_LENGTH 환경변수 충돌**
   - 문제: truncateForSlack이 먼저 실행되어 이미 잘림
   - 해결: maxResponseLength를 40000으로 설정하여 truncate 회피

**테스트 방법:**

```bash
# Test 1: 3000자 초과 응답 (splitIntoSections 테스트)
@codecrew "bug.md의 bug-00000010 섹션을 읽고 상세히 설명해줘"
# 기대: 여러 section 블록으로 분할 표시 ✅
# 검증: invalid_blocks 에러 없음 ✅

# Test 2: 매우 긴 응답 (블록 개수 제한 테스트)  
@codecrew "모든 버그 리스트를 상세히 설명해줘 (각 버그마다 원인, 해결책, 코드 예시 포함)"
# 기대: 블록 개수 조정으로 정상 표시 ✅
# 검증: 50개 블록 제한 미초과 확인

# Test 3: 코드 블록 포함 응답 (마크다운 파싱 테스트)
@codecrew "TypeScript로 Slack Bot 예제 3개 작성해줘 (각 100줄)"
# 기대: 코드 블록이 깨지지 않고 표시 ✅
# 검증: ```이 섹션 경계에서 안 잘림
```

**구현 우선순위:**
1. ✅ **즉시 적용** (1시간): formatExecutionResult 수정 (splitIntoSections 활용)
2. 🔄 **검증** (30분): validateBlockCount 로직 추가
3. 📋 **향후** (3시간): Option 2 멀티턴 응답 구현 (필요 시)

**검증 체크리스트:**
- [ ] 3000자 초과 응답 정상 표시
- [ ] invalid_blocks 에러 발생 안 함
- [ ] 블록 개수 50개 미초과
- [ ] 코드 블록 및 마크다운 정상 렌더링
- [ ] 기존 짧은 응답 동작 유지
- [ ] 에러 응답 로직 정상 작동
---

### Slack 스레드에 멘션하지 않은 외부 에이전트가 응답
ID: bug-00000012
우선순위: 긴급
버전: 0.3.7
상태: analyzed
작성자: dohapark
작업자: codecrew_dev
생성일: 2025-10-04 21:54:00
수정일: 2025-10-04 21:56:00
현상:
Slack 스레드에서 @CodeCrew (codecrew_dev)에게만 멘션했는데, 멘션하지 않은 CSO 에이전트가 응답함.
CSO는 다른 서버에 띄워놓은 별도의 CodeCrew 인스턴스 에이전트.

**재현 시나리오:**
```
1. User: "@CodeCrew 첫번째 응답이 뭐였는지 알려줘 (테스트 중)"
2. CodeCrew (codecrew_dev): 정상 응답
3. User: "codecrew_dev가 누구야?" (멘션 없음, 스레드 내 일반 메시지)
4. CodeCrew (codecrew_dev): 정상 응답
5. CSO: "⚡ Agent Execution Response..." 응답 (문제!)
```

**문제점:**
- CSO 에이전트는 스레드에 참여하지 않았음
- @CSO 멘션도 하지 않았음
- 다른 서버의 CodeCrew 인스턴스가 같은 스레드를 모니터링하고 응답

환경: macOS / Slack Bot / CodeCrew v0.3.7 / Multi-instance

원인 (추정):
1. **Slack Event 구독 중복**: 여러 CodeCrew 인스턴스가 동일한 workspace의 message 이벤트를 구독
2. **스레드 필터링 부재**: 각 인스턴스가 자신이 참여한 스레드만 처리하는 로직 없음
3. **Bot ID 구분 부재**: 멘션된 bot과 응답하는 bot의 ID 검증 누락
4. **Event 중복 처리**: Slack Events API에서 동일 이벤트를 여러 앱이 수신

해결책 (제안):
**Option 1: Bot 멘션 검증** (권장)
```typescript
// src/slack/slack-bot.ts
// message 이벤트 처리 시 자신의 bot ID가 멘션되었는지 확인
if (event.text && !event.text.includes(`<@${this.botUserId}>`)) {
  // 멘션되지 않았으면 무시 (스레드 일반 메시지)
  return;
}
```

**Option 2: 스레드 참여 여부 확인**
```typescript
// 스레드에 자신이 이미 참여했는지 확인
if (event.thread_ts) {
  const threadHistory = await client.conversations.replies({
    channel: event.channel,
    ts: event.thread_ts,
  });
  
  const hasParticipated = threadHistory.messages.some(
    msg => msg.bot_id === this.botUserId
  );
  
  if (!hasParticipated && !event.text.includes(`<@${this.botUserId}>`)) {
    // 참여하지 않은 스레드이고 멘션도 없으면 무시
    return;
  }
}
```

**Option 3: Slack App 설정**
- 각 CodeCrew 인스턴스를 별도의 Slack App으로 분리
- 또는 workspace 단위 분리

영향도:
- 사용자 혼란: 심각 (예상치 못한 에이전트가 응답)
- 보안: 중간 (다른 인스턴스가 대화 내용 접근)
- 멀티 인스턴스 운영: 불가능 (충돌 발생)

우선순위: 긴급
- Multi-instance 환경에서 치명적
- 사용자가 의도하지 않은 에이전트 응답
- 대화 흐름 방해

관련 파일:
- src/slack/slack-bot.ts (message 이벤트 핸들러)
- src/slack/slack-bot.ts (멘션 파싱 로직)

참고문서: -
---
