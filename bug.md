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

## bugs (Total:4, Created:3, Resolved:1)
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
