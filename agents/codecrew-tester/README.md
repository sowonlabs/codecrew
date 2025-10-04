# 테스트

## 지침
/Users/doha/git/codecrew/README.md 제품 안내 파일을 참고하세요.
**비용 적게 나오도록 작은 모델을 사용**해서 테스트를 하세요.
제일 실수가 많이 나오는 부분이므로 주요 테스트할 부분은 **병렬에 대한 결과**가 제대로 나오는지 판단하는 것입니다.
명령어 관련 사용방법은 도움말 명령과 아래 예시를 참고하세요.
현재 클로드맥스를 사용중이니 주로 클로드를 사용하도록 하고, 10프로 비율로 제미나이, 5프로 확률로 코파일럿을 사용하세요.

### 리포트 작성
작업디렉토리에 테스트한 결과를 **report-[yyyyMMdd_hhmmss].md** 파일형식으로 작성해 주세요.
아래 포맷을 참고해서 작성해주세요.
```
# 테스트 결과
일시: 2025-10-03 17:55:17
결과: 성공(3) 실패(1)

## 테스트1
의도: 병렬 테스트 성공
테스트 방법:
node /Users/doha/git/codecrew/dist/main.js query "@claude:haiku @claude:haiku 1+1?"
테스트 결과: 성공! (병렬 테스트가 둘다 성공할 것으로 기대했지만 1개는 실패 하지만 2개의 결과가 출력되었기 때문에 성공)
총 수행시간: 5분
```

### 도움말 사용
```
node /Users/doha/git/codecrew/dist/main.js help
```

## 기본 병렬 테스트

- 1. 그룹 멘션 테스트
```
node /Users/doha/git/codecrew/dist/main.js query "@claude:haiku @claude:haiku 1+1?"
```
**기대결과**
  - 둘 다 성공시 메시지 2가지의 결과와 소요시간 출력
  - 둘중에 하나 실패해도 성공한 건 출력되고 하나는 실패메시지 나오는 것

- 2. 병렬 테스트
```
node /Users/doha/git/codecrew/dist/main.js execute \
"@claude:haiku gugudan1.js 파일에 javascript 구구단 프로그램을 만들어 주세요."
"@claude:haiku gugudan2.js 파일에 javascript 구구단 프로그램을 만들어 주세요."
```
**기대결과**
  - 둘 다 성공시 메시지 2가지의 결과와 소요시간 출력
  - 둘중에 하나 실패해도 성공한 건 출력되고 하나는 실패메시지 나오는 것

- 3. 1번과 2번의 스레드 옵션 테스트
```
node /Users/doha/git/codecrew/dist/main.js query "@claude:haiku @claude:haiku 1+1?" --thread "t-1234"
```
**기대결과**
  - 둘 다 성공시 메시지 2가지의 결과와 소요시간 출력
  - 둘중에 하나 실패해도 성공한 건 출력되고 하나는 실패메시지 나오는 것
  - .codecrew/conversations 디렉토리에 t-1234.json 에 대화내역이 저장되는 것