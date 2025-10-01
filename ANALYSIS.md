# undefined 반환 문제 분석

## 문제 상황

로그 파일 `task_1759309995377_k519c7hvh.log`을 분석한 결과:
- claude CLI는 정상 실행됨 (exit code 0)
- STDOUT에 응답이 정상적으로 출력됨 (27-238번 줄)
- 하지만 최종 결과에서 `response: undefined` 반환

## 원인 분석

### 1. 코드 흐름 추적

**query.handler.ts (102번 줄):**
```typescript
console.log(result.response || result.error || '');
```
→ `result.response`가 `undefined`이기 때문에 빈 문자열 출력

**codecrew.tool.ts (475번 줄):**
```typescript
response: response.content,
```
→ `response.content`를 `response` 필드에 할당

**base-ai.provider.ts (219번 줄):**
```typescript
resolve({
  content: stdout.trim(),
  provider: this.name,
  command,
  success: true,
  taskId,
});
```
→ `stdout.trim()`을 `content` 필드에 할당

### 2. 핵심 문제점

**로그 확인 결과:**
- 27-238번 줄: STDOUT에 정상적으로 응답 출력됨
- 239번 줄: exit code 0으로 성공 종료
- **하지만** `stdout` 변수가 비어있는 상태로 처리됨

**의심되는 원인:**
```typescript
// base-ai.provider.ts 164-170번 줄
let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
  const output = data.toString();
  stdout += output;
  this.appendTaskLog(taskId, 'STDOUT', output);
});
```

로그에는 STDOUT이 기록되지만, `stdout` 변수에는 제대로 누적되지 않는 상황.

### 3. 근본 원인 추정

**가능성 1: 비동기 타이밍 이슈**
- `child.on('close')` 이벤트가 `child.stdout.on('data')` 전에 발생
- Node.js의 spawn은 비동기 이벤트이므로, stdout 버퍼링이 완료되기 전에 close 이벤트 발생 가능

**가능성 2: 스트림 버퍼링 문제**
- stdout이 큰 경우, 여러 'data' 이벤트로 분할 전송
- 마지막 chunk가 도착하기 전에 close 이벤트 처리

## 검증 방법

로그를 다시 확인하면:
```
[10/1/2025, 6:13:15 PM] INFO: Sending prompt via stdin
[10/1/2025, 6:13:52 PM] STDOUT: <응답 내용>
[10/1/2025, 6:13:52 PM] INFO: Process closed with exit code: 0
```

- stdin 전송: 6:13:15 PM
- STDOUT 수신: 6:13:52 PM (37초 후)
- Process close: 6:13:52 PM (같은 시각)

STDOUT 이벤트와 close 이벤트가 **거의 동시**에 발생했기 때문에, 타이밍 이슈 가능성이 높음.

## 수정 방안

### 방안 1: 'exit' 대신 'close' 이벤트 사용 + 버퍼 완료 보장

현재는 `close` 이벤트를 사용하지만, stdout 스트림이 완전히 닫힐 때까지 기다리지 않음.

```typescript
child.on('close', (code) => {
  clearTimeout(timeout);

  // stdout/stderr 스트림이 완전히 닫힐 때까지 잠시 대기
  setImmediate(() => {
    this.appendTaskLog(taskId, 'INFO', `Process closed with exit code: ${code}`);
    this.appendTaskLog(taskId, 'INFO', `STDOUT length: ${stdout.length}`);

    // ... 기존 로직
  });
});
```

### 방안 2: 'end' 이벤트 명시적 처리

stdout 스트림의 'end' 이벤트를 기다린 후 close 처리:

```typescript
let stdoutEnded = false;
let stderrEnded = false;

child.stdout.on('end', () => {
  stdoutEnded = true;
});

child.stderr.on('end', () => {
  stderrEnded = true;
});

child.on('close', (code) => {
  // 스트림이 완전히 종료될 때까지 대기
  const waitForStreams = () => {
    if (stdoutEnded && stderrEnded) {
      clearTimeout(timeout);
      // ... 기존 처리 로직
    } else {
      setImmediate(waitForStreams);
    }
  };
  waitForStreams();
});
```

### 방안 3: Promise.all로 모든 이벤트 동기화 (권장)

가장 안정적인 방법:

```typescript
return new Promise((resolve) => {
  const child = spawn(toolPath, args, { ... });

  let stdout = '';
  let stderr = '';
  let exitCode: number | null = null;

  // stdout 완료 Promise
  const stdoutPromise = new Promise<void>((resolveStdout) => {
    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      this.appendTaskLog(taskId, 'STDOUT', output);
    });
    child.stdout.on('end', () => resolveStdout());
  });

  // stderr 완료 Promise
  const stderrPromise = new Promise<void>((resolveStderr) => {
    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      this.appendTaskLog(taskId, 'STDERR', output);
    });
    child.stderr.on('end', () => resolveStderr());
  });

  // close 이벤트 Promise
  const closePromise = new Promise<number | null>((resolveClose) => {
    child.on('close', (code) => {
      exitCode = code;
      resolveClose(code);
    });
  });

  // 모든 이벤트가 완료될 때까지 대기
  Promise.all([stdoutPromise, stderrPromise, closePromise]).then(() => {
    clearTimeout(timeout);
    this.appendTaskLog(taskId, 'INFO', `Process closed with exit code: ${exitCode}`);
    this.appendTaskLog(taskId, 'INFO', `STDOUT length: ${stdout.length} bytes`);

    // ... 기존 처리 로직
    resolve({
      content: stdout.trim(),
      provider: this.name,
      command,
      success: exitCode === 0,
      taskId,
    });
  });
});
```

## 추천 수정 사항

**방안 3 (Promise.all)** 을 추천하는 이유:
1. ✅ 모든 스트림 완료를 명시적으로 보장
2. ✅ race condition 완전 방지
3. ✅ 코드 가독성 향상
4. ✅ 디버깅 용이 (STDOUT 길이 로깅 추가)

## 적용 위치

- `src/providers/base-ai.provider.ts`
- `query()` 메서드 (114-262번 줄)
- `execute()` 메서드 (264-421번 줄)

두 메서드 모두 동일한 패턴으로 spawn을 사용하므로, 같은 수정 필요.
