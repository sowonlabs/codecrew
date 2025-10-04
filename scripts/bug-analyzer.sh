#!/bin/bash

# bug-analyzer.sh
# bug.md를 모니터링하면서 created 상태의 버그를 자동으로 분석

set -e

# ============================================
# 설정 (Configuration)
# ============================================
ANALYZER_AGENT="codecrew_dev"  # 분석을 수행할 에이전트 (codecrew_dev, claude, gemini, copilot 등)
CHECK_INTERVAL=60              # 체크 간격 (초)

# ============================================
# 내부 변수 (Do not modify)
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUG_FILE="$PROJECT_ROOT/bug.md"
ANALYZED_FILE="$PROJECT_ROOT/.codecrew/bug-analyzer.log"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 디렉토리 생성
mkdir -p "$(dirname "$ANALYZED_FILE")"
touch "$ANALYZED_FILE"

echo -e "${GREEN}🔍 Bug Analyzer started${NC}"
echo -e "${BLUE}🤖 Analyzer Agent: $ANALYZER_AGENT${NC}"
echo -e "${BLUE}📝 Monitoring: $BUG_FILE${NC}"
echo -e "${BLUE}⏱️  Check interval: ${CHECK_INTERVAL}s${NC}"
echo -e "${BLUE}📋 Analyzed log: $ANALYZED_FILE${NC}"
echo ""

# 무한 루프
while true; do
  echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} Checking for created bugs..."
  
  # bug.md에서 created 상태의 버그 ID 추출
  created_bugs=$(grep -A 5 "^### " "$BUG_FILE" | grep -B 3 "상태: created" | grep "^ID:" | awk '{print $2}' || true)
  
  if [ -z "$created_bugs" ]; then
    echo -e "${GREEN}✅ No created bugs found${NC}"
  else
    echo -e "${RED}🐛 Found created bugs:${NC}"
    echo "$created_bugs"
    echo ""
    
    # 각 버그를 분석
    for bug_id in $created_bugs; do
      # 이미 분석했는지 확인
      if grep -q "$bug_id" "$ANALYZED_FILE"; then
        echo -e "${BLUE}⏭️  $bug_id: Already analyzed, skipping${NC}"
        continue
      fi
      
      echo -e "${YELLOW}🔬 Analyzing $bug_id...${NC}"
      
      # bug.md에서 해당 버그의 설명 추출
      bug_section=$(awk "/^ID: $bug_id$/,/^---$/" "$BUG_FILE")
      
      # 버그 제목 추출 (ID 바로 위의 ### 라인)
      bug_title=$(grep -B 1 "^ID: $bug_id$" "$BUG_FILE" | head -1 | sed 's/^### //')
      
      echo -e "${GREEN}📌 Title: $bug_title${NC}"
      
      # 분석이 이미 있는지 확인
      if echo "$bug_section" | grep -q "^분석:"; then
        echo -e "${GREEN}✅ $bug_id: Analysis already documented${NC}"
        echo "$bug_id" >> "$ANALYZED_FILE"
        continue
      fi
      
      # 상태가 analyzed인지 확인
      if echo "$bug_section" | grep -q "^상태: analyzed"; then
        echo -e "${GREEN}✅ $bug_id: Already analyzed (status: analyzed)${NC}"
        echo "$bug_id" >> "$ANALYZED_FILE"
        continue
      fi
      
      # codecrew_dev 에이전트에게 분석 요청
      echo -e "${BLUE}🤖 Requesting analysis from $ANALYZER_AGENT...${NC}"
      
      cd "$PROJECT_ROOT"
      
      # 분석 요청 (query는 파일 수정 불가능하므로 execute 사용)
      analysis_result=$(node dist/main.js execute "@${ANALYZER_AGENT}" \
        "$bug_id '$bug_title' 버그를 분석하고 bug.md를 수정해줘.

bug.md 파일을 읽고 해당 버그($bug_id)의:
1. 현재 문제점 정확히 파악
2. 원인 상세 분석
3. 구체적인 해결책 제안 (코드 예시 포함)
4. 예상되는 문제점과 해결 방법
5. 테스트 방법

이 내용을 해당 버그 섹션의 '원인:' 다음 줄에 '분석:' 항목으로 추가하고,
**반드시 해당 버그의 '상태: created'를 '상태: analyzed'로 변경해줘.**" 2>&1 || true)
      
      echo ""
      echo -e "${GREEN}📊 Analysis Result:${NC}"
      echo "$analysis_result" | head -20
      echo ""
      
      # 분석 완료 기록
      echo "$(date '+%Y-%m-%d %H:%M:%S') - $bug_id - Analyzed" >> "$ANALYZED_FILE"
      echo -e "${GREEN}✅ $bug_id: Analysis completed${NC}"
      echo ""
      
      # Rate limiting (에이전트 과부하 방지)
      sleep 5
    done
  fi
  
  echo -e "${BLUE}💤 Sleeping for ${CHECK_INTERVAL}s...${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  sleep "$CHECK_INTERVAL"
done
