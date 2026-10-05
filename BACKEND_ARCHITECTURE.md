# 자동 로그 수집 시스템 아키텍처

## 1. 현재 상태

### 클라이언트 로그 구조
```javascript
{
  eventId: "unique-id",
  type: "session_start|reinforce_attempt|reinforce_result|...",
  timestamp: "ISO8601",
  playerId: "device-based-id",
  sessionId: "session-id",
  payload: { /* 이벤트별 데이터 */ }
}
```

### 현재 저장 방식
- 브라우저 localStorage에만 저장 (최대 2000개)
- 수동 내보내기 필요 (exportLogs 버튼)

## 2. 목표

### 자동 로그 수집
- IP 기반 사용자 ID 생성 (또는 브라우저 지문)
- 게임 시작 시 자동 전송
- 게임 중 주기적 또는 이벤트 기반 전송
- 게임 종료 시 자동 전송

### 수집할 메트릭
- **DAU (Daily Active Users)**: 날짜별 고유 사용자 수
- **WAU (Weekly Active Users)**: 주간 고유 사용자 수
- **MAU (Monthly Active Users)**: 월간 고유 사용자 수
- **Stickiness**: DAU/MAU (사용자 충성도)
- **세션 추적**: 시작/종료 시간, 지속 시간
- **진행 상황**: 중단 지점, 최종 도달 레벨

## 3. 데이터베이스 스키마

### users 테이블
```sql
CREATE TABLE users (
  userId VARCHAR(64) PRIMARY KEY,          -- IP 기반 생성
  fingerprintId VARCHAR(64),               -- 브라우저 지문 (보조)
  firstSeenAt TIMESTAMP,
  lastSeenAt TIMESTAMP,
  totalSessions INT,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### sessions 테이블
```sql
CREATE TABLE sessions (
  sessionId VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) FOREIGN KEY,
  startedAt TIMESTAMP,
  endedAt TIMESTAMP,
  duration INT,                            -- 초 단위
  finalLevel INT,
  finalGold BIGINT,
  destructionCount INT,
  maxGoldDuringSession BIGINT,
  isBankrupt BOOLEAN,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### events 테이블
```sql
CREATE TABLE events (
  eventId VARCHAR(64) PRIMARY KEY,
  sessionId VARCHAR(64) FOREIGN KEY,
  userId VARCHAR(64) FOREIGN KEY,
  eventType VARCHAR(50),
  timestamp TIMESTAMP,
  payload JSON,
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_userId ON events(userId);
CREATE INDEX idx_events_sessionId ON events(sessionId);
CREATE INDEX idx_events_timestamp ON events(timestamp);
```

## 4. 백엔드 API 엔드포인트

### POST /api/users/register
요청: `{ fingerprint, userAgent }`
응답: `{ userId }`
- IP 기반 userId 생성
- 기존 사용자는 업데이트 (lastSeenAt)

### POST /api/sessions/start
요청: `{ userId, sessionId }`
응답: `{ acknowledged: true }`
- 세션 시작 기록

### POST /api/sessions/end
요청: `{ userId, sessionId, finalLevel, finalGold, ... }`
응답: `{ acknowledged: true }`
- 세션 종료 기록

### POST /api/events/batch
요청: `{ userId, events: [{type, timestamp, payload}, ...] }`
응답: `{ acknowledged: true, count: number }`
- 배치 이벤트 전송

### GET /api/analytics/dau
쿼리: `{ date: "YYYY-MM-DD" }`
응답: `{ dau: number, date: string }`

### GET /api/analytics/wau
쿼리: `{ date: "YYYY-MM-DD" }`
응답: `{ wau: number, weekStart: string }`

### GET /api/analytics/mau
쿼리: `{ date: "YYYY-MM-DD" }`
응답: `{ mau: number, month: string }`

### GET /api/analytics/stickiness
응답: `{ dau: number, mau: number, stickiness: number }`

## 5. 프론트엔드 통합

### 클라이언트 초기화
1. 사용자 등록 (IP 기반 ID 생성)
2. 로컬스토리지에 userId 저장
3. 게임 시작 시 세션 시작 API 호출

### 로그 전송 전략
- **실시간**: 중요 이벤트 (강화 결과)
- **배치**: 5분마다 또는 50개 이벤트마다
- **종료**: 게임 종료 시 남은 로그 모두 전송

### 오프라인 처리
- 네트워크 오류 시 로컬 로그 유지
- 재연결 시 자동 재전송

## 6. 보안 고려사항

- IP 기반 ID는 해시 처리 (md5/sha256)
- CORS 설정
- Rate limiting
- 로그 데이터는 개인정보 미포함 (금액, 강화 단계만 기록)
- HTTPS 필수

## 7. 배포 환경

- 백엔드: Node.js + Express
- 데이터베이스: PostgreSQL (또는 MySQL)
- 호스팅: Heroku, Railway, Vercel (선택)
