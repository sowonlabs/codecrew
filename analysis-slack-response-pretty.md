# Slack 응답 포맷 개선 연구 (Markdown to Slack mrkdwn)

## 문제점
현재 CodeCrew의 Slack 응답이 raw Markdown 형식으로 표시되어 가독성이 떨어짐.

예시:
```
## :dart: CodeCrew (MIT 오픈소스 AI 개발 도구)

### :white_check_mark: 장점
1. **MIT 라이선스 오픈소스** - 파급력 확산에 유리
```

Slack에서는 이모지가 `:dart:` 형태로 보이고, 헤딩이 제대로 렌더링되지 않음.

---

## Slack mrkdwn vs Standard Markdown

### 주요 차이점

| 기능 | Standard Markdown | Slack mrkdwn |
|------|------------------|--------------|
| **볼드** | `**text**` or `__text__` | `*text*` |
| **이탤릭** | `*text*` or `_text_` | `_text_` |
| **취소선** | `~~text~~` | `~text~` |
| **인라인 코드** | `` `code` `` | `` `code` `` |
| **코드 블록** | ```` ```code``` ```` | ```` ```code``` ```` |
| **헤딩** | `# H1`, `## H2`, `### H3` | **지원 안됨** |
| **링크** | `[text](url)` | `<url\|text>` |
| **이미지** | `![alt](url)` | **지원 안됨** |
| **리스트** | `- item` or `* item` | `• item` (bullet) |
| **순서 리스트** | `1. item` | `1. item` |

### Slack 특수 문법

```
# 사용자 멘션
<@U012AB3CD>

# 채널 링크
<#C123ABC456>

# 그룹 멘션
<!subteam^ID>

# 특수 멘션
@here, @channel, @everyone

# 날짜 포맷
<!date^1392734382^{date_num} {time_secs}|Feb 18, 2014 6:39 AM PST>

# 이메일 링크
<mailto:email@example.com|Email Text>

# 이모지
:emoji_name: 또는 Unicode 직접 사용 (✅, 🎯, 💬)
```

---

## 해결 방안

### 방안 1: `md-to-slack` 라이브러리 (권장)

**장점:**
- TypeScript 지원
- GitHub Flavored Markdown 지원
- 활발한 유지보수
- 간단한 API

**설치:**
```bash
npm install md-to-slack
```

**사용법:**
```typescript
import { markdownToSlack } from "md-to-slack";

const markdown = `
## CodeCrew Features
- **Fast** AI responses
- _Easy_ to use
`;

const slackText = markdownToSlack(markdown);
// 결과: *CodeCrew Features*\n• *Fast* AI responses\n• _Easy_ to use
```

**제한사항:**
- 헤딩 제거됨 (대안: bold text로 변환)
- 이미지 제거됨
- 테이블 미지원 (향후 추가 예정)

---

### 방안 2: `slackify-markdown` 라이브러리

**장점:**
- Unified/Remark 기반 (확장성 좋음)
- AST 기반 변환으로 정확도 높음

**설치:**
```bash
npm install slackify-markdown
```

**사용법:**
```typescript
import slackifyMarkdown from 'slackify-markdown';

const markdown = '**Hello** _world_!';
const slackText = slackifyMarkdown(markdown);
```

---

### 방안 3: Slack Block Kit (고급 포맷)

헤딩, 리스트, 이모지를 Block Kit으로 구조화.

#### 3-1. 헤딩 표현

**Header Block (권장):**
```typescript
{
  type: 'header',
  text: {
    type: 'plain_text',
    text: 'CodeCrew 기능',
  }
}
```

**Bold Section (대안):**
```typescript
{
  type: 'section',
  text: {
    type: 'mrkdwn',
    text: '*CodeCrew 기능*',
  }
}
```

#### 3-2. 리스트 표현

**Rich Text List (권장):**
```typescript
{
  type: 'rich_text',
  elements: [
    {
      type: 'rich_text_list',
      style: 'bullet',  // or 'ordered'
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            { type: 'text', text: 'MIT 라이선스 오픈소스' }
          ]
        },
        {
          type: 'rich_text_section',
          elements: [
            { type: 'text', text: 'TUI 기반 혁신적 UX' }
          ]
        }
      ]
    }
  ]
}
```

**mrkdwn List (간단한 대안):**
```typescript
{
  type: 'section',
  text: {
    type: 'mrkdwn',
    text: '• MIT 라이선스 오픈소스\n• TUI 기반 혁신적 UX',
  }
}
```

#### 3-3. 이모지 처리

**옵션 A: 이모지 코드를 Unicode로 변환**
```typescript
const emojiMap = {
  ':dart:': '🎯',
  ':white_check_mark:': '✅',
  ':rocket:': '🚀',
};

function convertEmoji(text: string): string {
  return text.replace(/:([a-z_]+):/g, (match, name) => {
    return emojiMap[`:${name}:`] || match;
  });
}
```

**옵션 B: Rich Text Emoji Element**
```typescript
{
  type: 'rich_text_section',
  elements: [
    { type: 'emoji', name: 'dart' },
    { type: 'text', text: ' CodeCrew' }
  ]
}
```

---

## 추천 구현 전략

### 단계별 접근

#### Phase 1: 즉시 적용 가능 (Low-hanging fruit)
```typescript
// src/slack/formatters/message.formatter.ts

import { markdownToSlack } from 'md-to-slack';

export class SlackMessageFormatter {
  // 기존 코드...

  /**
   * Convert markdown to Slack mrkdwn format
   */
  private convertMarkdownToMrkdwn(text: string): string {
    // 1. 이모지 코드를 Unicode로 변환
    const withEmoji = this.convertEmojiCodes(text);

    // 2. 기본 markdown -> mrkdwn 변환
    const slackText = markdownToSlack(withEmoji);

    // 3. 헤딩을 bold로 변환 (md-to-slack이 제거하므로 사전 처리)
    const withHeadings = this.convertHeadingsToBold(slackText);

    return withHeadings;
  }

  private convertEmojiCodes(text: string): string {
    const emojiMap: Record<string, string> = {
      ':dart:': '🎯',
      ':white_check_mark:': '✅',
      ':rocket:': '🚀',
      ':bulb:': '💡',
      ':wrench:': '🔧',
      ':book:': '📚',
      ':fire:': '🔥',
      ':star:': '⭐',
      ':warning:': '⚠️',
      ':x:': '❌',
    };

    return text.replace(/:([a-z_]+):/g, (match, name) => {
      return emojiMap[`:${name}:`] || match;
    });
  }

  private convertHeadingsToBold(text: string): string {
    // # Heading -> *Heading*
    // ## Heading -> *Heading*
    // ### Heading -> *Heading*
    return text.replace(/^#+\s+(.+)$/gm, '*$1*');
  }

  formatExecutionResult(result: ExecutionResult): (Block | KnownBlock)[] {
    const blocks: (Block | KnownBlock)[] = [];

    if (result.success) {
      // Markdown을 Slack mrkdwn으로 변환
      const response = this.truncateForSlack(result.response, this.maxResponseLength);
      const slackFormatted = this.convertMarkdownToMrkdwn(response);

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: slackFormatted,
        },
      });
    } else {
      // 기존 에러 처리...
    }

    return blocks;
  }
}
```

#### Phase 2: Block Kit 고급 포맷 (Optional)

복잡한 마크다운을 Block Kit 구조로 파싱:

```typescript
/**
 * Advanced: Convert markdown to Block Kit blocks
 * - Headers -> Header blocks
 * - Lists -> Rich text list blocks
 * - Code blocks -> Preformatted blocks
 */
private convertToBlockKit(markdown: string): (Block | KnownBlock)[] {
  const blocks: (Block | KnownBlock)[] = [];

  // Parse markdown AST (using remark - already in dependencies)
  const lines = markdown.split('\n');
  let currentSection = '';

  for (const line of lines) {
    // 헤딩 감지
    if (line.startsWith('## ')) {
      if (currentSection) {
        blocks.push(this.createSectionBlock(currentSection));
        currentSection = '';
      }
      blocks.push({
        type: 'header',
        text: {
          type: 'plain_text',
          text: line.replace(/^##\s+/, '').replace(/:[a-z_]+:/g, ''),
        }
      });
    }
    // 리스트 감지
    else if (line.match(/^[\d\-\*]\.\s+/)) {
      // 리스트 블록 생성...
    }
    else {
      currentSection += line + '\n';
    }
  }

  if (currentSection) {
    blocks.push(this.createSectionBlock(currentSection));
  }

  return blocks;
}
```

---

## 현재 구현 분석

### 현재 코드 (`src/slack/slack-bot.ts:182-192`)

```typescript
const responseText = (result as any).implementation ||
  (result.content && result.content[0] ? result.content[0].text : 'No response');

const blocks = this.formatter.formatExecutionResult({
  agent: (result as any).agent || this.defaultAgent,
  provider: (result as any).provider || this.defaultAgent,
  taskId: (result as any).taskId || 'unknown',
  response: responseText,  // ← 여기서 raw markdown이 들어감
  success: (result as any).success !== false,
  error: (result as any).error,
});
```

### 수정 포인트

`SlackMessageFormatter.formatExecutionResult()` 메서드에서 `response` 텍스트를 mrkdwn으로 변환:

```typescript
// src/slack/formatters/message.formatter.ts:31-44

formatExecutionResult(result: ExecutionResult): (Block | KnownBlock)[] {
  const blocks: (Block | KnownBlock)[] = [];

  if (result.success) {
    const response = this.truncateForSlack(result.response, this.maxResponseLength);

    // ✨ 추가: Markdown -> Slack mrkdwn 변환
    const slackFormatted = this.convertMarkdownToMrkdwn(response);

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: slackFormatted,  // ← 변환된 텍스트 사용
      },
    });
  }
  // ...
}
```

---

## 테스트 계획

### 테스트 케이스

```typescript
// test/slack-formatter.spec.ts

describe('SlackMessageFormatter - Markdown Conversion', () => {
  let formatter: SlackMessageFormatter;

  beforeEach(() => {
    formatter = new SlackMessageFormatter();
  });

  it('should convert emoji codes to Unicode', () => {
    const input = '## :dart: CodeCrew';
    const result = formatter['convertMarkdownToMrkdwn'](input);
    expect(result).toContain('🎯');
    expect(result).not.toContain(':dart:');
  });

  it('should convert headings to bold', () => {
    const input = '## Main Title\n### Subtitle';
    const result = formatter['convertMarkdownToMrkdwn'](input);
    expect(result).toContain('*Main Title*');
  });

  it('should convert markdown lists to bullets', () => {
    const input = '- Item 1\n- Item 2';
    const result = formatter['convertMarkdownToMrkdwn'](input);
    expect(result).toMatch(/[•\-]/); // Slack uses • or -
  });

  it('should convert markdown bold/italic to mrkdwn', () => {
    const input = '**bold** and *italic*';
    const result = formatter['convertMarkdownToMrkdwn'](input);
    expect(result).toBe('*bold* and _italic_');
  });

  it('should preserve code blocks', () => {
    const input = '```typescript\nconst x = 1;\n```';
    const result = formatter['convertMarkdownToMrkdwn'](input);
    expect(result).toContain('```');
  });
});
```

---

## 예상 결과 비교

### Before (현재)
```
## :dart: CodeCrew (MIT 오픈소스 AI 개발 도구)

### :white_check_mark: 장점
1. **MIT 라이선스 오픈소스** - 파급력 확산에 유리
```

### After (변환 후)
```
*🎯 CodeCrew (MIT 오픈소스 AI 개발 도구)*

*✅ 장점*
1. *MIT 라이선스 오픈소스* - 파급력 확산에 유리
```

---

## 성능 고려사항

### 변환 오버헤드
- `md-to-slack` 라이브러리는 가볍고 빠름 (AST 파싱 불필요)
- 대부분의 변환은 정규식 기반이므로 성능 영향 최소화
- 응답 텍스트가 긴 경우 (> 10KB) 캐싱 고려

### 메모리 사용
- 현재 `maxResponseLength = 400000` (400KB)
- 변환 과정에서 임시 문자열 생성하므로 메모리 2배 사용 예상
- Slack 메시지 제한(40KB)을 고려하면 문제 없음

---

## 구현 체크리스트

- [ ] `md-to-slack` npm 패키지 설치
- [ ] `SlackMessageFormatter`에 변환 메서드 추가
  - [ ] `convertMarkdownToMrkdwn()`
  - [ ] `convertEmojiCodes()`
  - [ ] `convertHeadingsToBold()`
- [ ] `formatExecutionResult()` 메서드 수정
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 (실제 Slack 봇으로 확인)
- [ ] 문서 업데이트 (README.md)
- [ ] 환경 변수 추가 (선택적)
  - `SLACK_ENABLE_MARKDOWN_CONVERSION=true`
  - `SLACK_EMOJI_STYLE=unicode|slack_code`

---

## 참고 자료

### 공식 문서
- [Slack mrkdwn Formatting](https://docs.slack.dev/messaging/formatting-message-text)
- [Slack Block Kit](https://docs.slack.dev/reference/block-kit/blocks/)
- [Rich Text Formatting](https://docs.slack.dev/block-kit/formatting-with-rich-text/)

### NPM 패키지
- [md-to-slack](https://github.com/nicoespeon/md-to-slack) - TypeScript, 활발한 유지보수
- [slackify-markdown](https://www.npmjs.com/package/slackify-markdown) - Unified/Remark 기반
- [markdown-to-mrkdwn](https://pypi.org/project/markdown-to-mrkdwn/) - Python 라이브러리

### 가이드 & 튜토리얼
- [The Developer's Guide to Slack's Markdown](https://knock.app/blog/the-guide-to-slack-markdown)
- [Slack Markdown Cheat Sheet](https://www.markdownguide.org/tools/slack/)

---

## 결론

**권장 방안: Phase 1 (md-to-slack 라이브러리 활용)**

### 이유:
1. ✅ 빠른 구현 (< 1시간)
2. ✅ 유지보수 부담 적음 (라이브러리가 처리)
3. ✅ 기존 코드 변경 최소화
4. ✅ TypeScript 네이티브 지원
5. ✅ 대부분의 문제 해결 (이모지, 볼드/이탤릭, 리스트)

### 향후 개선 (Optional):
- Phase 2로 Block Kit 고급 포맷 도입 (헤딩, 리스트를 구조화된 블록으로)
- 사용자 피드백 기반 추가 최적화

### 예상 효과:
- 📈 Slack 메시지 가독성 **대폭 향상**
- 🎯 이모지 정상 렌더링
- ✨ 전문적인 메시지 포맷
- 🚀 사용자 경험 개선
