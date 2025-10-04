# 버그 리스트

## 지침
버그는 사이드이펙이 없도록 작성해야 합니다.
에이전트 중에 테스터 에이전트를 활용해서 협업을 하세요.
작업 발생 중에 버그가 발생하면 'bug-00000000' 포맷을 참고해서 아래에 추가를 해 주세요.
상태에 대해서 설명하면 created, rejected, in-progress, resolved, closed 상태가 있으며
첫 버그 발생시에는 created로 작성합니다. resolved 상태에서는 삭제를 하면 안되고 사람인 유저 개발자가 확인 후에 closed 상태로 변경할 수 있습니다. (채팅을 통해서 또는 사람이 직접 수정)

### 브랜치 정책
버그가 발생하면 현재 작업중인 버전이 아닌 경우에는 main 브랜치에서 bugfix/bug-00000000 브랜치를 worktree 디렉토리 하위에 git worktree로 생성합니다.
이 디렉토리에 수정작업을 진행하고 테스터와 협업을 통해 테스트가 완료가 되면 작업내용을 커밋을 한 후에 상태를 resolved로 변경합니다. 그리고 작업자를 dohapark으로 변경 해 주세요. (사람 개발자가 확인 후에 closed가 됩니다. 확인후 현상 재현시 rejected가 됨. 작업자는 rejected 된 이슈를 확인하세요.)
상세하게 기술할 문서 작성이 필요한 경우 doc에 bug ID로 md 파일을 작성해 주세요.

## bugs (Total:7, Created:5, Resolved:2)
### 병렬처리 버그
ID: bug-00000000
우선순위: 긴급
상태: created
작성자: codecrew_dev
작업자: -
생성일: 2025-10-03 19:18:11
수정일: 2025-10-03 20:12:23
현상: 이 버그 현상에 대해서 적어주세요.
환경: 맥os / 윈도우
원인: 이 버그 원인을 파악하고 원인을 적어주세요.
해결책: 해결책을 적어주세요.
사유: 버그가 재현되어 리젝되었습니다.
---

### Claude CLI v2.0 Breaking Changes  
ID: bug-00000002
우선순위: 긴급
버전: 0.3.5
상태: in-progress
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
상태: created
작성자: dohapark
작업자: -
생성일: 2025-10-03 19:22:00
수정일: -
현상:
```
🔍 DEBUG: Checking if claude has queryWithTools: function
🔧 DEBUG: Using queryWithTools for claude in query mode
🔧 DEBUG: Response content type: string
```
위와 같은 로그가 MCP에서도 나오고 있는 상황이라서 MCP에서 파싱오류가 남.
기타 실행할 때에도 로그가 보여서 버그라고 느껴짐
환경: 맥os / 윈도우
원인: 이 버그 원인을 파악하고 원인을 적어주세요.
해결책: 해결책을 적어주세요.
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
상태: created
작성자: codecrew_tester
작업자: -
생성일: 2025-10-04 16:14:52
수정일: -
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

검증 필요:
- ConversationStorageService.addMessage() 메소드 동작 확인
- 파일 시스템 권한 문제 여부 확인
- Thread ID sanitization 문제 확인

참고문서: reports/report-20251004_161452.md (검증 테스트 리포트)
---

### MCP 에이전트 파일 수정 도구 부재 (설계 개선)
ID: bug-00000006
우선순위: 긴급
버전: 0.3.5
상태: resolved
작성자: GitHub Copilot
작업자: dohapark
생성일: 2025-10-04 16:45:00
수정일: 2025-10-04 17:30:00
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
