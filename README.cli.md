# CodeCrew CLI 설계 문서

## 🎯 개념

**CodeCrew CLI = 에이전트 협업을 위한 파이프라인 도구**

Discord나 Slack에서 멘션하는 것처럼 자연스럽게 AI 에이전트들과 협업할 수 있는 명령줄 도구입니다.

### 핵심 특징
- 🏷️ **멘션 기반 에이전트 호출** (`@agent`)
- 🔄 **Unix 스타일 파이프라인 지원** (`|`)
- ⚡ **자동 병렬/순차 실행**
- 🧠 **컨텍스트 전달 및 협업**

## 📋 기본 명령어

### query - 분석 및 질의
```bash
# 단일 에이전트 질의
codecrew query "@backend analyze current API structure"

# 복수 에이전트 질의 (자동 병렬)
codecrew query "@security @performance @maintainability review this codebase"

# 커스텀 설정 파일 사용
codecrew query --config ./team-agents.yaml "@backend @frontend analyze project"
```

### execute - 실행 및 구현
```bash
# 단일 에이전트 실행
codecrew execute "@frontend create login component"

# 복수 에이전트 실행 (자동 병렬)
codecrew execute "@backend @frontend implement OAuth authentication"

# 커스텀 설정 파일 사용
codecrew execute --config ./production-agents.yaml "@devops deploy to production"
```

### 서브명령어
```bash
# AI 도구 상태 확인
codecrew doctor

# 프로젝트 초기화
codecrew init
```

## 🔄 에이전트 호출 패턴

### 1. 공통 태스크 (그룹 멘션)
```bash
# 모든 에이전트가 같은 작업을 각자 전문 영역에서 수행
codecrew execute "@backend @frontend implement user authentication"
```
**동작:**
- `@backend`: API, 데이터베이스, 세션 관리 구현
- `@frontend`: 로그인 폼, 인증 상태 관리, UI 구현

### 2. 개별 태스크 (개별 멘션)
```bash
# 각 에이전트가 서로 다른 작업을 동시에 수행
codecrew execute "@backend create user API" "@frontend design login UI" "@devops setup OAuth server"
```
**동작:**
- `@backend`: "create user API" 작업
- `@frontend`: "design login UI" 작업  
- `@devops`: "setup OAuth server" 작업

### 3. 순차 실행 (파이프라인)
```bash
# 한 에이전트의 결과를 다음 에이전트에게 전달
codecrew execute "@backend create user API" | codecrew execute "@frontend create client code"
```
**동작:**
1. `@backend`가 API 생성 → 결과 출력
2. `@frontend`가 그 결과를 받아서 클라이언트 코드 생성

## 🚀 실제 사용 시나리오

### 개발 워크플로우
```bash
# 1. 요구사항 분석 (여러 관점)
codecrew query "@product @ux @technical analyze user feedback about checkout process"

# 2. 아키텍처 설계
codecrew query "@architect design improved checkout system" | \

# 3. 보안 검토
codecrew query "@security review checkout design for vulnerabilities" | \

# 4. 병렬 구현
codecrew execute "@backend @frontend @payment implement secure checkout"

# 5. 테스트 및 배포
codecrew execute "@tester create integration tests" | \
codecrew execute "@devops deploy to staging"
```

### 코드 리뷰 프로세스
```bash
# 현재 코드를 여러 전문가가 동시에 리뷰
codecrew query "@developer show current payment processing code" | \
codecrew query "@security @performance @maintainability review this implementation"
```

### 버그 수정 워크플로우
```bash
# 문제 진단
codecrew query "@backend investigate database connection timeouts"

# 해결책 설계  
codecrew query "@architect @devops design database failover solution" | \

# 구현 및 배포
codecrew execute "@backend implement connection pooling" "@devops setup database clustering"
```

### 기능 개발 (전체 스택)
```bash
# 설계 단계
codecrew query "@architect design real-time notification system" | \

# 기술 스택 검토
codecrew query "@backend @frontend @mobile evaluate implementation options" | \

# 병렬 구현
codecrew execute "@backend create notification API" "@frontend add notification UI" "@mobile implement push notifications" | \

# 통합 테스트
codecrew execute "@tester create end-to-end notification tests"
```

## 🛠️ 기술 구현 개요

### yargs 명령어 구조
```typescript
yargs
  .option('config', {
    alias: 'c',
    type: 'string',
    description: 'Path to agents configuration file',
    default: 'agents.yaml'
  })
  .command('query <agents...>', 'Query agents for analysis', {}, handleQuery)
  .command('execute <agents...>', 'Execute tasks with agents', {}, handleExecute)
  .command('doctor', 'Check AI providers status', {}, handleDoctor)
  .command('init', 'Initialize codecrew project', {}, handleInit)
```

### 에이전트 파싱 로직
```typescript
function parseCommand(args: string[]) {
  if (args.length === 1) {
    // "@backend @frontend shared task" 또는 "@backend individual task"
    return parseGroupTask(args[0]);
  } else {
    // "@backend task1" "@frontend task2" "@mobile task3"  
    return parseIndividualTasks(args);
  }
}
```

### stdin/stdout 파이프 지원
```typescript
const hasStdin = !process.stdin.isTTY;
if (hasStdin) {
  const previousResult = await readStdin();
  context = `Previous agent result:\n${previousResult}\n\nCurrent task: ${task}`;
}
```

## 🔗 기존 MCP 도구 연계

### 단일 실행
- `queryAgent` → 단일 에이전트 질의
- `executeAgent` → 단일 에이전트 실행

### 병렬 실행  
- `queryAgentParallel` → 복수 에이전트 동시 질의
- `executeAgentParallel` → 복수 에이전트 동시 실행

### 기타 도구
- `checkAIProviders` → `doctor` 명령어
- `listAgents` → 에이전트 목록 확인

## 📚 명령어 레퍼런스

### 기본 문법
```bash
# 단일 에이전트
codecrew <command> "@agent task description"

# 공통 태스크 (그룹 멘션)
codecrew <command> "@agent1 @agent2 @agent3 shared task"

# 개별 태스크 (개별 멘션)  
codecrew <command> "@agent1 task1" "@agent2 task2" "@agent3 task3"

# 파이프라인 (순차 실행)
codecrew <command> "@agent1 task1" | codecrew <command> "@agent2 task2"

# 커스텀 설정 파일 사용
codecrew <command> --config ./custom-agents.yaml "@agent task"
```

### 설정 파일 탐색 순서
```bash
# 1. --config 옵션이 있으면 해당 파일 사용
codecrew query --config ./team-config.yaml "@backend analyze"

# 2. 현재 디렉토리에 agents.yaml이 있으면 자동 사용
codecrew query "@backend analyze"  # ./agents.yaml 자동 탐지

# 3. 설정 파일이 없으면 에러 발생
# Error: No agents configuration file found. Run 'codecrew init' to create one.
```

### 설정 파일 옵션
```bash
# 기본 설정 파일 (현재 디렉토리의 agents.yaml)
codecrew query "@backend analyze system"

# 커스텀 설정 파일 지정
codecrew execute --config ./team-backend.yaml "@backend @database optimize queries"

# 다른 경로의 설정 파일
codecrew execute --config /path/to/production-agents.yaml "@devops deploy application"

# 상대 경로로 프로젝트별 설정
codecrew query --config ../shared-agents.yaml "@architect review microservices"
```

### 설정 파일 우선순위
1. `--config` 옵션으로 지정된 파일
2. 현재 디렉토리의 `agents.yaml` (기본값)
3. 설정 파일이 없으면 에러 발생

### 사용 가능한 에이전트
```bash
# 에이전트 목록 확인
codecrew doctor  # AI 도구 상태와 함께 표시

# 일반적인 에이전트들
@backend      # 백엔드 개발 전문
@frontend     # 프론트엔드 개발 전문  
@mobile       # 모바일 앱 개발 전문
@devops       # 데브옵스/인프라 전문
@security     # 보안 분석 전문
@architect    # 시스템 아키텍처 전문
@tester       # 테스트 전문
@ux           # UX/UI 디자인 전문
@product      # 제품 기획 전문
@performance  # 성능 최적화 전문
```

## 🎯 다음 구현 단계

1. **CLI 코어 구현** - yargs 구조와 파싱 로직
2. **에이전트 명령어** - query/execute 연결  
3. **서브명령어들** - doctor, init 구현
4. **모드 분리** - CLI vs MCP 서버

---

> **💡 핵심 철학**: 복잡한 개발 작업을 여러 전문 AI 에이전트가 협업하여 해결하는 자연스럽고 직관적인 도구