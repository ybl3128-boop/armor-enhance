# Firestore 데이터 스키마

## 컬렉션: users

사용자 정보 및 통계

### 문서 구조
```javascript
{
  // 문서 ID: {userId} (예: "user_a1b2c3d4")
  
  // 사용자 기본 정보
  firstSeenAt: Timestamp,        // 첫 방문 시간
  lastSeenAt: Timestamp,         // 마지막 방문 시간
  totalSessions: number,         // 총 세션 수 (업데이트됨)
  fingerprint: string,           // 브라우저 지문
  userAgent: string,             // User Agent
  
  // 통계 (실시간 업데이트)
  highestLevel: number,          // 달성한 최고 강화 단계
  totalDestructions: number,     // 총 파괴 횟수
  totalBankruptcies: number,     // 총 파산 횟수
  legendaryClearsCount: number   // +20 달성 횟수
}
```

### 예제
```javascript
{
  firstSeenAt: Timestamp.fromDate(new Date()),
  lastSeenAt: Timestamp.fromDate(new Date()),
  totalSessions: 5,
  fingerprint: "abc123def456",
  userAgent: "Mozilla/5.0...",
  highestLevel: 18,
  totalDestructions: 12,
  totalBankruptcies: 2,
  legendaryClearsCount: 1
}
```

---

## 컬렉션: sessions

게임 세션 정보

### 문서 구조
```javascript
{
  // 문서 ID: {sessionId}
  
  // 세션 기본 정보
  userId: string,                // 사용자 ID (참조)
  startedAt: Timestamp,          // 세션 시작 시간
  endedAt: Timestamp,            // 세션 종료 시간 (선택)
  durationSeconds: number,       // 지속 시간 (초)
  
  // 게임 결과
  finalLevel: number,            // 최종 강화 단계
  finalGold: number,             // 최종 골드
  destructionCount: number,      // 파괴 횟수
  maxGoldDuringSession: number,  // 세션 중 최대 골드
  
  // 상태
  isBankrupt: boolean,           // 파산 여부
  isCompleted: boolean           // 세션 완료 여부
}
```

### 예제
```javascript
{
  userId: "user_a1b2c3d4",
  startedAt: Timestamp.fromDate(new Date()),
  endedAt: Timestamp.fromDate(new Date()),
  durationSeconds: 1800,
  finalLevel: 15,
  finalGold: 250000,
  destructionCount: 3,
  maxGoldDuringSession: 280000,
  isBankrupt: false,
  isCompleted: true
}
```

---

## 컬렉션: events

게임 이벤트 로그

### 문서 구조
```javascript
{
  // 문서 ID: 자동 생성 (또는 {eventId})
  
  // 기본 정보
  eventId: string,               // 이벤트 고유 ID
  userId: string,                // 사용자 ID (참조)
  sessionId: string,             // 세션 ID (참조)
  eventType: string,             // 이벤트 타입
  timestamp: Timestamp,          // 발생 시간
  
  // 이벤트 데이터
  payload: {
    // 이벤트 타입에 따라 다름
    // 예: reinforce_result의 경우
    // {
    //   currentLevel: 10,
    //   result: "success|failure|destruction|protection",
    //   goldSpent: 5000,
    //   goldAfter: 45000
    // }
  }
}
```

### 이벤트 타입

| 타입 | 발생 시점 | Payload |
|---|---|---|
| `session_start` | 세션 시작 | `{ initialGold: number }` |
| `session_end` | 세션 종료 | `{ finalLevel: number, finalGold: number }` |
| `reinforce_attempt` | 강화 시도 | `{ level: number, cost: number, successChance: number }` |
| `reinforce_result` | 강화 결과 | `{ level: number, result: string, goldAfter: number }` |
| `armor_break` | 갑옷 파괴 | `{ level: number, scrapsGained: number }` |
| `armor_restore` | 갑옷 복구 | `{ targetLevel: number, scrapsUsed: number }` |
| `use_protection` | 보호권 사용 | `{ protectionUsed: number, remaining: number }` |
| `sell_armor` | 갑옷 판매 | `{ level: number, priceReceived: number }` |
| `new_armor_start` | 새 갑옷 시작 | `{ reason: string }` |
| `legendary_clear` | +20 달성 | `{ totalDuration: number, totalAttempts: number }` |

### 예제
```javascript
{
  eventId: "evt_xyz789",
  userId: "user_a1b2c3d4",
  sessionId: "session_key123",
  eventType: "reinforce_result",
  timestamp: Timestamp.fromDate(new Date()),
  payload: {
    level: 10,
    result: "success",
    goldAfter: 45000,
    nextLevel: 11
  }
}
```

---

## 컬렉션: analytics (생성용)

통계 및 분석 데이터 (선택사항, 계산 기반)

### 문서 구조
```javascript
// 일일 통계
daily/{YYYY-MM-DD}: {
  date: string,
  dau: number,              // Daily Active Users
  newUsers: number,
  totalSessions: number,
  avgSessionDuration: number,
  totalEvents: number
}

// 주간 통계
weekly/{YYYY-Www}: {
  weekStart: string,
  wau: number,              // Weekly Active Users
  totalSessions: number,
  avgLevel: number
}

// 월간 통계
monthly/{YYYY-MM}: {
  month: string,
  mau: number,              // Monthly Active Users
  totalUsers: number,
  totalSessions: number,
  legendaryClearsCount: number
}
```

---

## Firestore 인덱싱 권장사항

### 복합 인덱스
```
sessions 컬렉션:
- (userId, startedAt DESC)

events 컬렉션:
- (userId, timestamp DESC)
- (sessionId, timestamp ASC)
- (eventType, timestamp DESC)
```

### 단일 필드 인덱싱 (자동)
- sessions.isCompleted
- events.eventType
- users.highestLevel

---

## 데이터 일관성 보장

### 트랜잭션 사용
세션 종료 시 원자성 보장:
```javascript
// 1. sessions/{sessionId} 업데이트
// 2. users/{userId} 통계 갱신
// 위 두 작업이 함께 성공하거나 함께 실패
```

### 배치 쓰기
여러 이벤트 저장:
```javascript
// events 여러 개를 한 번에 저장
// 네트워크 효율성 증대
```

---

## 데이터 마이그레이션 (PostgreSQL → Firestore)

기존 PostgreSQL 데이터를 Firestore로 옮기는 스크립트는 별도로 제공됩니다.
