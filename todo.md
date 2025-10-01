# 에러 수정
  - 병렬처리 안됨
```shell
codecrew query \
    "@claude 1+1?" \
    "@claude 2+2?"
```

  - 파이프 작동 안함
```bash
codecrew query "@claude 내일 비온다고 이야기 해줘." \ |
codecrew query "@claude 내일 소풍가려고 하는데 괜찮겠지?"
```

## 모델 옵션 제공
```bash
gemini --model=gemini-2.5-pro -p "what's your model? 2.5 pro? flash?"
copilot --model=claude-sonnet-4 -p "what's your model?"
claude --model=claude-sonnet-4-5-20250929 -p "what's your model?"
```

### 각 CLI 도구별 사용 가능한 모델

**gemini:**
- `gemini-2.5-flash` (기본)
- `gemini-2.5-pro`

**copilot:**
- `gpt-5`
- `claude-sonnet-4`
- `claude-sonnet-4.5`

**claude:**
- `claude-sonnet-4-5`
- `claude-sonnet-4-5-20250929`
- `sonnet`
- `opus`
- `haiku`
- `default`
- `opusplan`

# 할일

1. gemini 오류 중간에 잡기... (할당량 생길시)

```
[ERROR] [ImportProcessor] Failed to import private: ENOENT: no such file or directory, access '/Users/doha/git/co
decrew/.github/private'                                                                                          [ERROR] [ImportProcessor] Failed to import protected: ENOENT: no such file or directory, access '/Users/doha/git/
codecrew/.github/protected'                                                                                      [ERROR] [ImportProcessor] Failed to import public: ENOENT: no such file or directory, access '/Users/doha/git/cod
ecrew/.github/public'                                                                                            [ERROR] [ImportProcessor] Failed to import try: ENOENT: no such file or directory, access '/Users/doha/git/codecr
ew/.github/try'                                                                                                  [ERROR] [ImportProcessor] Failed to import property: ENOENT: no such file or directory, access '/Users/doha/git/c
odecrew/.github/property'                                                                                        [ERROR] [ImportProcessor] Failed to import end: ENOENT: no such file or directory, access '/Users/doha/git/codecr
ew/.github/end'                                                                                                  [ERROR] [ImportProcessor] Failed to import throw: ENOENT: no such file or directory, access '/Users/doha/git/code
crew/.github/throw'                                                                                              [ERROR] [ImportProcessor] Failed to import catch: ENOENT: no such file or directory, access '/Users/doha/git/code
crew/.github/catch'                                                                                              [ERROR] [ImportProcessor] Failed to import finally: ENOENT: no such file or directory, access '/Users/doha/git/co
decrew/.github/finally'                                                                                          [ERROR] [ImportProcessor] Failed to import autoreleasepool: ENOENT: no such file or directory, access '/Users/doh
a/git/codecrew/.github/autoreleasepool'                                                                          [ERROR] [ImportProcessor] Failed to import synthesize: ENOENT: no such file or directory, access '/Users/doha/git
/codecrew/.github/synthesize'                                                                                    [ERROR] [ImportProcessor] Failed to import dynamic: ENOENT: no such file or directory, access '/Users/doha/git/co
decrew/.github/dynamic'                                                                                          [ERROR] [ImportProcessor] Failed to import selector: ENOENT: no such file or directory, access '/Users/doha/git/c
odecrew/.github/selector'                                                                                        [ERROR] [ImportProcessor] Failed to import optional: ENOENT: no such file or directory, access '/Users/doha/git/c
odecrew/.github/optional'                                                                                        [ERROR] [ImportProcessor] Failed to import required: ENOENT: no such file or directory, access '/Users/doha/git/c
odecrew/.github/required'                                                                                        [ERROR] [ImportProcessor] Failed to import encode: ENOENT: no such file or directory, access '/Users/doha/git/cod
ecrew/.github/encode'                                                                                            [ERROR] [ImportProcessor] Failed to import package: ENOENT: no such file or directory, access '/Users/doha/git/co
decrew/.github/package'                                                                                          [ERROR] [ImportProcessor] Failed to import import: ENOENT: no such file or directory, access '/Users/doha/git/cod
ecrew/.github/import'                                                                                            [ERROR] [ImportProcessor] Failed to import defs: ENOENT: no such file or directory, access '/Users/doha/git/codec
rew/.github/defs'                                                                                                [ERROR] [ImportProcessor] Failed to import compatibility_alias: ENOENT: no such file or directory, access '/Users
/doha/git/codecrew/.github/compatibility_alias'                                                                  [ERROR] [ImportProcessor] Failed to import class: ENOENT: no such file or directory, access '/Users/doha/git/code
crew/.github/class'                                                                                              [ERROR] [ImportProcessor] Failed to import protocol: ENOENT: no such file or directory, access '/Users/doha/git/c
odecrew/.github/protocol'                                                                                        [ERROR] [ImportProcessor] Failed to import implementation"};return{name:"Objective-C",aliases:["mm","objc","obj-c
","obj-c++","objective-c++"],keywords:Z,illegal:"</",contains:[B,A.C_LINE_COMMENT_MODE,A.C_BLOCK_COMMENT_MODE,A.C_NUMBER_MODE,A.QUOTE_STRING_MODE,A.APOS_STRING_MODE,{className:"string",variants:[{begin:'@"',end:'"',illegal:"\\n",contains:[A.BACKSLASH_ESCAPE]}]},{className:"meta",begin:/#\s*[a-z]+\b/,end:/$/,keywords:{"meta-keyword":"if: ENOENT: no such file or directory, access '/Users/doha/git/codecrew/.github/implementation"};return{name:"Objective-C",aliases:["mm","objc","obj-c","obj-c++","objective-c++"],keywords:Z,illegal:"</",contains:[B,A.C_LINE_COMMENT_MODE,A.C_BLOCK_COMMENT_MODE,A.C_NUMBER_MODE,A.QUOTE_STRING_MODE,A.APOS_STRING_MODE,{className:"string",variants:[{begin:'@"',end:'"',illegal:"\\n",contains:[A.BACKSLASH_ESCAPE]}]},{className:"meta",begin:/#\s*[a-z]+\b/,end:/$/,keywords:{"meta-keyword":"if'                                                                                 [ERROR] [ImportProcessor] Failed to import font-face"},{begin:"@",end:"[{;]",returnBegin:!0,keywords:{$pattern:/[
a-z-]+/,keyword:"and: ENOENT: no such file or directory, access '/Users/doha/git/codecrew/.github/font-face"},{begin:"@",end:"[{;]",returnBegin:!0,keywords:{$pattern:/[a-z-]+/,keyword:"and'                                     [ERROR] [ImportProcessor] Failed to import sentry/node: ENOENT: no such file or directory, access '/Users/doha/gi
t/codecrew/.github/sentry/node'                                                                                  [ERROR] [ImportProcessor] Failed to import grpc/proto-loader: ENOENT: no such file or directory, access '/Users/d
oha/git/codecrew/.github/grpc/proto-loader'                                                                      [ERROR] [ImportProcessor] Failed to import grpc/proto-loader: ENOENT: no such file or directory, access '/Users/d
oha/git/codecrew/.github/grpc/proto-loader'                                                                      [ERROR] [ImportProcessor] Failed to import anthropic-ai/claude-code";if({ISSUES_EXPLAINER:"report: ENOENT: no suc
h file or directory, access '/Users/doha/git/codecrew/.github/anthropic-ai/claude-code";if({ISSUES_EXPLAINER:"report'                                                                                                             [ERROR] [ImportProcessor] Failed to import author: ENOENT: no such file or directory, access '/Users/doha/git/cod
ecrew/.github/author'                                                                                            Loaded cached credentials.
[ERROR] [ImportProcessor] Failed to import private: ENOENT: no such file or directory, access '/Users/doha/git/co
decrew/.github/private'                                                                                          [ERROR] [ImportProcessor] Failed to import protected: ENOENT: no such file or directory, access '/Users/doha/git/
codecrew/.github/protected'                                                                                      [ERROR] [ImportProcessor] Failed to import public: ENOENT: no such file or directory, access '/Users/doha/git/cod
ecrew/.github/public'                                                                                            [ERROR] [ImportProcessor] Failed to import try: ENOENT: no such file or directory, access '/Users/doha/git/codecr
ew/.github/try'                                                                                                  [ERROR] [ImportProcessor] Failed to import property: ENOENT: no such file or directory, access '/Users/doha/git/c
odecrew/.github/property'                                                                                        [ERROR] [ImportProcessor] Failed to import end: ENOENT: no such file or directory, access '/Users/doha/git/codecr
ew/.github/end'                                                                                                  [ERROR] [ImportProcessor] Failed to import throw: ENOENT: no such file or directory, access '/Users/doha/git/code
crew/.github/throw'                                                                                              [ERROR] [ImportProcessor] Failed to import catch: ENOENT: no such file or directory, access '/Users/doha/git/code
crew/.github/catch'                                                                                              [ERROR] [ImportProcessor] Failed to import finally: ENOENT: no such file or directory, access '/Users/doha/git/co
decrew/.github/finally'                                                                                          [ERROR] [ImportProcessor] Failed to import autoreleasepool: ENOENT: no such file or directory, access '/Users/doh
a/git/codecrew/.github/autoreleasepool'                                                                          [ERROR] [ImportProcessor] Failed to import synthesize: ENOENT: no such file or directory, access '/Users/doha/git
/codecrew/.github/synthesize'                                                                                    [ERROR] [ImportProcessor] Failed to import dynamic: ENOENT: no such file or directory, access '/Users/doha/git/co
decrew/.github/dynamic'                                                                                          [ERROR] [ImportProcessor] Failed to import selector: ENOENT: no such file or directory, access '/Users/doha/git/c
odecrew/.github/selector'                                                                                        [ERROR] [ImportProcessor] Failed to import optional: ENOENT: no such file or directory, access '/Users/doha/git/c
odecrew/.github/optional'                                                                                        [ERROR] [ImportProcessor] Failed to import required: ENOENT: no such file or directory, access '/Users/doha/git/c
odecrew/.github/required'                                                                                        [ERROR] [ImportProcessor] Failed to import encode: ENOENT: no such file or directory, access '/Users/doha/git/cod
ecrew/.github/encode'                                                                                            [ERROR] [ImportProcessor] Failed to import package: ENOENT: no such file or directory, access '/Users/doha/git/co
decrew/.github/package'                                                                                          [ERROR] [ImportProcessor] Failed to import import: ENOENT: no such file or directory, access '/Users/doha/git/cod
ecrew/.github/import'                                                                                            [ERROR] [ImportProcessor] Failed to import defs: ENOENT: no such file or directory, access '/Users/doha/git/codec
rew/.github/defs'                                                                                                [ERROR] [ImportProcessor] Failed to import compatibility_alias: ENOENT: no such file or directory, access '/Users
/doha/git/codecrew/.github/compatibility_alias'                                                                  [ERROR] [ImportProcessor] Failed to import class: ENOENT: no such file or directory, access '/Users/doha/git/code
crew/.github/class'                                                                                              [ERROR] [ImportProcessor] Failed to import protocol: ENOENT: no such file or directory, access '/Users/doha/git/c
odecrew/.github/protocol'                                                                                        [ERROR] [ImportProcessor] Failed to import implementation"};return{name:"Objective-C",aliases:["mm","objc","obj-c
","obj-c++","objective-c++"],keywords:Z,illegal:"</",contains:[B,A.C_LINE_COMMENT_MODE,A.C_BLOCK_COMMENT_MODE,A.C_NUMBER_MODE,A.QUOTE_STRING_MODE,A.APOS_STRING_MODE,{className:"string",variants:[{begin:'@"',end:'"',illegal:"\\n",contains:[A.BACKSLASH_ESCAPE]}]},{className:"meta",begin:/#\s*[a-z]+\b/,end:/$/,keywords:{"meta-keyword":"if: ENOENT: no such file or directory, access '/Users/doha/git/codecrew/.github/implementation"};return{name:"Objective-C",aliases:["mm","objc","obj-c","obj-c++","objective-c++"],keywords:Z,illegal:"</",contains:[B,A.C_LINE_COMMENT_MODE,A.C_BLOCK_COMMENT_MODE,A.C_NUMBER_MODE,A.QUOTE_STRING_MODE,A.APOS_STRING_MODE,{className:"string",variants:[{begin:'@"',end:'"',illegal:"\\n",contains:[A.BACKSLASH_ESCAPE]}]},{className:"meta",begin:/#\s*[a-z]+\b/,end:/$/,keywords:{"meta-keyword":"if'                                                                                 [ERROR] [ImportProcessor] Failed to import font-face"},{begin:"@",end:"[{;]",returnBegin:!0,keywords:{$pattern:/[
a-z-]+/,keyword:"and: ENOENT: no such file or directory, access '/Users/doha/git/codecrew/.github/font-face"},{begin:"@",end:"[{;]",returnBegin:!0,keywords:{$pattern:/[a-z-]+/,keyword:"and'                                     [ERROR] [ImportProcessor] Failed to import sentry/node: ENOENT: no such file or directory, access '/Users/doha/gi
t/codecrew/.github/sentry/node'                                                                                  [ERROR] [ImportProcessor] Failed to import grpc/proto-loader: ENOENT: no such file or directory, access '/Users/d
oha/git/codecrew/.github/grpc/proto-loader'                                                                      [ERROR] [ImportProcessor] Failed to import grpc/proto-loader: ENOENT: no such file or directory, access '/Users/d
oha/git/codecrew/.github/grpc/proto-loader'                                                                      [ERROR] [ImportProcessor] Failed to import anthropic-ai/claude-code";if({ISSUES_EXPLAINER:"report: ENOENT: no suc
h file or directory, access '/Users/doha/git/codecrew/.github/anthropic-ai/claude-code";if({ISSUES_EXPLAINER:"report'                                                                                                             [ERROR] [ImportProcessor] Failed to import author: ENOENT: no such file or directory, access '/Users/doha/git/cod
ecrew/.github/author'                                                                                            Loaded cached credentials.
^C
```

2. 각 툴마다 모델 설정하는 옵션 추가할 것
3. MCP 연동 해서 query/execute 실행해 볼 것
4. 유스케이스로 examples 만들어 볼 것. (메일 확인, 기사 확인, 투자 분석, 구글 문서 연동해서 지식넣어서 연동)
5. 문서시스템 도입 여부 검토 (SowonFlow 처럼 handlebars 템플릿 적용)
6. 홍보물 제작 (SNS, 블로그, 유튜브 영상, GIF짤 생성)
