# Bug Analyzer - 자동 버그 분석 스크립트

## 개요

`bug-analyzer.sh`는 `bug.md` 파일을 주기적으로 모니터링하면서 `상태: created`인 버그를 자동으로 발견하고 codecrew_dev 에이전트에게 분석을 요청하는 백그라운드 스크립트입니다.

## 기능

- ✅ `bug.md` 주기적 모니터링 (기본 60초 간격)
- ✅ `상태: created` 버그 자동 감지
- ✅ 중복 분석 방지 (이미 분석한 버그 스킵)
- ✅ codecrew_dev 에이전트 자동 호출
- ✅ 해결책 상세 자동 문서화
- ✅ 분석 로그 기록

## 사용법

### ⚠️ 중요: bash로 실행하세요!

스크립트는 bash 전용입니다. `sh`로 실행하면 색상 출력이 깨집니다.

### 1. 백그라운드 실행 (추천)

```bash
# nohup으로 백그라운드 실행
cd /Users/doha/git/codecrew
nohup bash ./scripts/bug-analyzer.sh > .codecrew/bug-analyzer-output.log 2>&1 &

# PID 확인
echo $!

# 로그 실시간 확인
tail -f .codecrew/bug-analyzer-output.log
```

### 2. 포그라운드 실행 (테스트용)

```bash
# bash로 실행 (권장)
bash ./scripts/bug-analyzer.sh

# 또는 직접 실행 (shebang이 bash를 지정)
./scripts/bug-analyzer.sh
```

### 3. 중지

```bash
# 프로세스 찾기
ps aux | grep bug-analyzer.sh

# 종료
kill <PID>

# 또는 강제 종료
pkill -f bug-analyzer.sh
```

## 동작 방식

1. **모니터링**: 60초마다 `bug.md` 스캔
2. **버그 감지**: `상태: created` 패턴 찾기 (rejected 상태는 자동 분석 안 함)
3. **중복 체크**: 
   - `.codecrew/bug-analyzer.log`에서 이미 분석했는지 확인
   - `상태: analyzed` 또는 `분석:` 항목 있으면 스킵
4. **분석 요청**: codecrew_dev 에이전트 호출
   ```bash
   node dist/main.js execute "@codecrew_dev" \
     "bug-00000XXX 'Bug Title' 버그를 분석해줘..."
   ```
5. **문서화**: 에이전트가 bug.md에:
   - **'분석:' 항목 추가** (원인: 다음 줄에 위치)
   - **'상태: created' → '상태: analyzed' 변경**
6. **로그 기록**: 분석 완료 기록

## 설정

스크립트 상단에서 수정 가능:

```bash
# ============================================
# 설정 (Configuration)
# ============================================
ANALYZER_AGENT="codecrew_dev"  # 분석을 수행할 에이전트
CHECK_INTERVAL=60              # 체크 간격 (초)
```

### 에이전트 변경

다른 에이전트를 사용하려면:

```bash
# Claude 사용
ANALYZER_AGENT="claude"

# Gemini 사용
ANALYZER_AGENT="gemini"

# GitHub Copilot 사용
ANALYZER_AGENT="copilot"

# 커스텀 에이전트 사용 (agents.yaml에 정의된)
ANALYZER_AGENT="backend_specialist"
```

### 체크 간격 변경

더 자주 체크하려면:
```bash
CHECK_INTERVAL=30  # 30초마다
```

덜 자주 체크하려면:
```bash
CHECK_INTERVAL=300  # 5분마다
```

## 로그 파일

- **분석 기록**: `.codecrew/bug-analyzer.log`
  - 어떤 버그를 언제 분석했는지 기록
  - 중복 분석 방지용
  
- **실행 로그**: `.codecrew/bug-analyzer-output.log` (nohup 사용 시)
  - 스크립트 실행 상태
  - 에러 메시지
  - 분석 결과

## 예시 출력

```
🔍 Bug Analyzer started
📝 Monitoring: /Users/doha/git/codecrew/bug.md
⏱️  Check interval: 60s
📋 Analyzed log: /Users/doha/git/codecrew/.codecrew/bug-analyzer.log

[2025-10-04 21:00:00] Checking for created bugs...
🐛 Found created bugs:
bug-00000012

🔬 Analyzing bug-00000012...
📌 Title: Slack 메시지 응답 지연 문제
🤖 Requesting analysis from codecrew_dev...

📊 Analysis Result:
✅ bug-00000012: Analysis completed

💤 Sleeping for 60s...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 워크플로우

### 1. 버그 발생
```bash
# bug.md에 새 버그 추가
cat >> bug.md << 'EOF'
### 새로운 버그
ID: bug-00000012
상태: created    ← 초기 상태
...
EOF
```

### 2. 자동 분석 대기
- 스크립트가 60초마다 체크
- bug-00000012 감지

### 3. 자동 분석 실행
- codecrew_dev가 버그 분석
- **'분석:' 항목 자동 추가** (원인: 다음 줄)
- **상태를 'analyzed'로 변경**

### 4. 결과 확인
```bash
# bug.md에 변경사항 확인
grep -A 10 "bug-00000012" bug.md
# 상태: analyzed           ← 변경됨
# 원인: ...
# 분석:                    ← 추가됨 (상세 분석 내용)
#   1. 문제점 파악
#   2. 원인 상세 분석
#   3. 해결책 제안 (코드 예시)
#   4. 테스트 방법
```

## 팁

### 여러 개의 created 버그
- 모든 created 버그를 순차적으로 분석
- 각 분석 사이 5초 대기 (Rate limiting)

### 긴 분석 시간
- 복잡한 버그는 분석에 1-2분 소요 가능
- 백그라운드 실행으로 다른 작업 가능

### 분석 재시도
```bash
# 특정 버그를 다시 분석하려면
# .codecrew/bug-analyzer.log에서 해당 버그 기록 삭제
sed -i '' '/bug-00000012/d' .codecrew/bug-analyzer.log
```

### 시스템 부팅 시 자동 시작
```bash
# crontab 편집
crontab -e

# 추가
@reboot cd /Users/doha/git/codecrew && nohup ./scripts/bug-analyzer.sh > .codecrew/bug-analyzer-output.log 2>&1 &
```

## 문제 해결

### 스크립트가 버그를 찾지 못함
```bash
# bug.md 형식 확인
grep -A 3 "^ID:" bug.md | grep "상태: created"
```

### 에이전트 호출 실패
```bash
# 수동으로 테스트
node dist/main.js query "@codecrew_dev" "test"
```

### 중복 분석 방지 해제
```bash
# 로그 파일 삭제
rm .codecrew/bug-analyzer.log
```

## 주의사항

- ⚠️ **프로젝트 빌드 필수**: `npm run build` 실행 필요
- ⚠️ **백그라운드 실행**: 터미널 닫아도 계속 실행됨
- ⚠️ **리소스 사용**: codecrew_dev 에이전트가 주기적으로 호출됨
- ⚠️ **동시 실행 금지**: 중복 실행하면 분석이 꼬일 수 있음

## 고급 사용법

### 특정 버그만 분석
```bash
# 스크립트 수정 없이 한 번만 분석
node dist/main.js query "@codecrew_dev" \
  "bug-00000012 버그를 분석하고 bug.md에 해결책 상세를 추가해줘"
```

### 여러 버그 한번에 분석
```bash
# 병렬 처리
node dist/main.js execute "@codecrew_dev" \
  "bug.md의 모든 created 상태 버그를 분석하고 각각 해결책 상세를 추가해줘"
```

### Slack 알림 추가
```bash
# 스크립트 수정 (분석 완료 시 Slack 알림)
# bug-analyzer.sh의 "Analysis completed" 부분에 추가:
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🐛 Bug '$bug_id' analyzed!"}' \
  $SLACK_WEBHOOK_URL
```

## 참고

- bug.md 포맷: `/Users/doha/git/codecrew/bug.md`
- CodeCrew 에이전트: `@codecrew_dev`
- 실행 권한: `chmod +x scripts/bug-analyzer.sh`
