# Slack Thread Conversation History - 구현 완료

## 📋 개요

Slack 스레드 내 대화 히스토리를 기억하고 AI 에이전트에게 컨텍스트로 전달하는 기능을 구현했습니다.
추후 CLI chat 서브명령어 추가를 대비하여 확장 가능한 아키텍처로 설계했습니다.

## 🏗️ 아키텍처

### 1. 플랫폼 독립적 인터페이스 설계

```
src/conversation/
├── conversation-history.interface.ts  # 공통 인터페이스
├── base-conversation-history.provider.ts  # 공통 로직
├── slack-conversation-history.provider.ts  # Slack 구현체
├── conversation-config.ts  # 설정 관리
└── index.ts  # 모듈 export
```

#### 핵심 인터페이스

```typescript
interface IConversationHistoryProvider {
  fetchHistory(threadId: string, options?: FetchHistoryOptions): Promise<ConversationThread>;
  formatForAI(thread: ConversationThread, options?: FetchHistoryOptions): string;
  hasHistory(threadId: string): Promise<boolean>;
}
```

### 2. Slack 구현체 (`SlackConversationHistoryProvider`)

**주요 기능:**
- Slack `conversations.replies` API를 사용한 스레드 메시지 조회
- 30초 TTL 캐싱으로 API 호출 최적화
- Slack 포맷 정리 (멘션, 링크, 채널 태그)
- 민감 정보 자동 필터링 (password, token, api_key, secret)

**스레드 ID 형식:**
```
{channel}:{thread_ts}
예: C09JJBZ210R:1234567890.123456
```

### 3. Slack Bot 통합

**변경사항 (`src/slack/slack-bot.ts`):**

```typescript
// 1. 히스토리 프로바이더 초기화
this.conversationHistory = new SlackConversationHistoryProvider();
this.conversationHistory.initialize(client);

// 2. 스레드 감지 및 히스토리 조회
if (message.thread_ts) {
  const threadId = `${message.channel}:${threadTs}`;
  const thread = await this.conversationHistory.fetchHistory(threadId, {
    limit: 20,
    maxContextLength: 4000,
    excludeCurrent: true,
  });

  // 3. AI 컨텍스트에 포함
  const historyContext = this.conversationHistory.formatForAI(thread);
  contextText += '\n\n' + historyContext;
}
```

## ⚙️ 설정

### 환경 변수

```bash
# 대화 히스토리 활성화/비활성화
CONVERSATION_HISTORY_ENABLED=true

# 최대 메시지 개수
CONVERSATION_MAX_MESSAGES=20

# 최대 컨텍스트 길이 (문자)
CONVERSATION_MAX_CONTEXT_LENGTH=4000

# 캐시 TTL (밀리초)
CONVERSATION_CACHE_TTL=30000

# 최대 캐시 크기
CONVERSATION_MAX_CACHE_SIZE=100
```

### 기본값 (`DEFAULT_CONVERSATION_CONFIG`)

```typescript
{
  maxMessages: 20,
  maxContextLength: 4000,
  cacheTTL: 30000,
  maxCacheSize: 100,
  enabled: true,
}
```

## 🔐 Slack 권한 업데이트

### 필수 권한 추가

| Scope | 용도 |
|-------|------|
| `channels:history` | 공개 채널 스레드 히스토리 읽기 ✅ (기존) |
| `im:history` | DM 스레드 히스토리 읽기 🆕 |
| `groups:history` | 비공개 채널 스레드 히스토리 읽기 🆕 (선택) |

### 권한 추가 방법

1. https://api.slack.com/apps → Your App
2. **OAuth & Permissions** → Bot Token Scopes
3. `im:history`, `groups:history` 추가
4. **Install App** → Reinstall to Workspace

## 🎯 사용 시나리오

### 시나리오 1: 공개 채널 스레드

```
User: @codecrew Python에서 리스트 정렬하는 방법 알려줘
Bot: list.sort() 또는 sorted(list)를 사용하세요.

User: 역순으로도 가능해?
Bot: [이전 대화 참조] 네, reverse=True 옵션을 추가하면 됩니다.
     예: list.sort(reverse=True)
```

### 시나리오 2: DM 스레드

```
User: (DM) 프로젝트 구조 설명해줘
Bot: 프로젝트는 src/, tests/, docs/ 디렉토리로 구성되어 있습니다...

User: src 디렉토리에 뭐가 있어?
Bot: [이전 대화 참조] src/ 디렉토리에는...
```

## 🔍 컨텍스트 포맷

AI에게 전달되는 컨텍스트 형식:

```
Slack user: U08LSF2KNVD, Channel: C09JJBZ210R

Previous conversation in this Slack thread:
User: Python에서 리스트 정렬하는 방법 알려줘
Assistant: list.sort() 또는 sorted(list)를 사용하세요.
User: 역순으로도 가능해?
```

## 🛡️ 보안 및 최적화

### 민감 정보 필터링

```typescript
protected sanitizeMessage(text: string): string {
  return text
    .replace(/password[:\s]*\S+/gi, 'password: ***')
    .replace(/token[:\s]*\S+/gi, 'token: ***')
    .replace(/api[_-]?key[:\s]*\S+/gi, 'api_key: ***')
    .replace(/secret[:\s]*\S+/gi, 'secret: ***');
}
```

### 토큰 제한 관리

1. **메시지 개수 제한**: 최근 20개 (기본값)
2. **컨텍스트 길이 제한**: 4000자 (기본값)
3. **역순 추가**: 오래된 메시지부터 제외

### 캐싱 전략

- **TTL**: 30초
- **크기**: 100개 스레드
- **LRU**: 크기 초과 시 가장 오래된 항목 제거

## 🚀 확장성

### CLI Chat 추가 준비

```typescript
// 미래: CLI용 구현체 추가
export class CliConversationHistoryProvider extends BaseConversationHistoryProvider {
  async fetchHistory(sessionId: string): Promise<ConversationThread> {
    // 로컬 파일 시스템 또는 DB에서 세션 히스토리 조회
  }
}
```

### 다른 플랫폼 추가

```typescript
// Discord, Teams 등
export class DiscordConversationHistoryProvider extends BaseConversationHistoryProvider {
  async fetchHistory(channelId: string): Promise<ConversationThread> {
    // Discord API 사용
  }
}
```

## 📊 성능 고려사항

### API 호출 최적화

- **캐싱**: 30초 내 같은 스레드 재조회 방지
- **조건부 조회**: `message.thread_ts` 존재할 때만 조회
- **에러 처리**: 조회 실패 시 히스토리 없이 계속 진행

### 메모리 관리

- 캐시 크기 제한: 100개 스레드
- 각 스레드당 최대 20개 메시지
- 메시지당 최대 4000자

## ❓ 문제 해결

### 스레드 히스토리가 작동하지 않을 때

1. **권한 확인**
   ```bash
   # Slack App 설정에서 확인
   - im:history ✅
   - groups:history ✅ (선택)
   ```

2. **Bot 재설치**
   - OAuth & Permissions → Reinstall to Workspace

3. **로그 확인**
   ```bash
   # 히스토리 조회 로그 확인
   📚 Including X previous messages in context
   ```

### "Missing Scope" 오류

```
Error: missing_scope
```

→ `im:history` 또는 `groups:history` 권한 추가 후 Bot 재설치

## 📝 테스트 체크리스트

- [x] 공개 채널 스레드에서 히스토리 조회
- [x] DM 스레드에서 히스토리 조회
- [x] 비공개 채널 스레드 (groups:history 필요)
- [x] 긴 스레드 (20개 이상) 토큰 제한 적용
- [x] 권한 없을 때 graceful fallback
- [x] 캐싱 동작 확인
- [x] 빌드 성공 확인

## 🔗 관련 파일

- `src/conversation/` - 대화 히스토리 모듈
- `src/slack/slack-bot.ts` - Slack Bot 통합
- `SLACK_INSTALL.md` - 설치 가이드 (권한 업데이트)
- `feature-slack-thread.md` - 초기 분석 문서

## 📚 다음 단계

1. **CLI Chat 구현**: `CliConversationHistoryProvider` 추가
2. **요약 기능**: 긴 스레드 자동 요약
3. **메트릭**: 히스토리 조회 성능 모니터링
4. **A/B 테스트**: 히스토리 on/off 비교

---

**구현 완료!** 🎉 Slack 스레드 대화 히스토리 관리 기능이 정상적으로 작동합니다.
