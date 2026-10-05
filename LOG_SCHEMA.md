# 로그 이벤트 스키마 (v2)

이 문서는 게임이 실제로 수집하는 이벤트를 정의합니다. app.js의 `logEvent()` 호출은
이 문서와 1:1로 일치해야 합니다. 새 이벤트를 추가하거나 필드를 바꿀 때는
이 문서를 먼저 수정하세요.

## 데이터 수집 목적

이 게임이 로그를 수집하는 이유는 크게 두 가지입니다.

1. **게임 서비스 운영 지원**
   사용자가 언제 들어오고 나가는지, 어디서 이탈하는지, 세션이 몇 번
   이어지는지를 파악해 DAU/WAU/MAU, 리텐션, 파산·이탈 지점 같은
   운영 지표를 계산하는 데 쓰입니다. (→ `session_start`, `session_end`,
   `bankruptcy`, Firestore의 `users`/`sessions` 컬렉션)

2. **플레이어 행동 예측을 위한 행동 데이터 확보**
   "다음에 플레이어가 강화를 또 시도할지, 판매할지, 포기할지"를
   예측하려면 실제 상호작용(강화 시도, 성공/실패/파괴, 보호권 사용,
   판매, 복구 등) 하나하나가 게임 로그로 남아 있어야 합니다.
   행동 데이터는 "무엇을 보고 → 무엇을 선택했고 → 결과가 어땠는지"가
   한 이벤트 안에서 추적 가능해야 분석과 예측에 쓸 수 있습니다.
   (→ `enhance_attempt`, `enhance_result`, `armor_sold`, `armor_restored`,
   `new_armor_started`, `legendary_achieved`)

이 목적에 맞지 않는 이벤트(단순 중복, 운영에도 예측에도 안 쓰이는 필드)는
아래 v2 설계에서 제거했습니다.

## 이전 버전(v1)의 문제점

1. **중복 이벤트**: 한 번의 사용자 행동에 이벤트가 2~3개씩 찍힘
   - `probability_view` → `reinforce_attempt` (같은 정보 중복)
   - `use_protection` + `reinforce_result`(destruction_protected) (같은 사건을 두 번 기록)
   - `armor_break` + `reinforce_result`(destruction) (같은 사건을 두 번 기록)
   - `sell_armor` + `new_armor_start` (판매는 항상 새 갑옷 시작을 동반 — 하나로 통합 가능)
   - `bankruptcy_blocked` + `session_bankruptcy` (파산은 한 가지 사건)
2. **네이밍 불일치**: `reinforce_*`(한자어 "강화") vs `armor_*`, `sell_*`, `new_armor_*`(동작 중심) 혼용
3. **필드 모호성**: `level`이 이벤트마다 "현재 단계"인지 "강화 후 단계"인지 다름
4. **스키마 버전 없음**: 나중에 필드를 바꾸면 과거 로그와 구분이 안 됨

## v2 설계 원칙

- **사용자의 행동(또는 사건) 1개 = 이벤트 1개.** 결과 안에 보호권 사용 여부, 파괴 여부를 필드로 포함.
- **모든 이벤트 공통 필드**는 `logEvent()`가 자동으로 붙임 (payload 밖):
  - `eventId`, `type`, `timestamp`, `playerId`, `sessionId`, `schemaVersion`
- **payload 필드 네이밍 규칙**:
  - 자원 스냅샷은 항상 `xxxBefore` / `xxxAfter` 쌍으로 표기
  - 레벨은 `levelBefore` (강화 시도 전 단계), `levelAfter` (결과 후 단계, 실패/파괴 시 의미 없으면 `null`)
  - 금액 관련은 `gold`, 조각은 `scraps`, 보호권은 `protectionTickets`

---

## 이벤트 목록 (총 10종)

### 1. `session_start`
세션(브라우저 탭 하나의 플레이) 시작 시 1회.

```jsonc
{
  "screenWidth": 1920,
  "screenHeight": 1080,
  "sessionCount": 3,          // 이 플레이어의 누적 세션 수
  "goldAfter": 10000,
  "scrapsAfter": 0,
  "protectionTicketsAfter": 1,
  "currentLevelAfter": 0,
  "highestLevelAfter": 0
}
```

### 2. `session_end`
탭을 닫거나 새로고침할 때 1회 (beforeunload).

```jsonc
{
  "sessionDurationMs": 185320,
  "sessionAttempts": 12,
  "sessionSuccesses": 7,
  "sessionFailures": 5,
  "sessionMaxGold": 15200,
  "destructionCountTotal": 2,
  "goldAfter": 9800,
  "scrapsAfter": 3,
  "protectionTicketsAfter": 0,
  "currentLevelAfter": 8,
  "highestLevelAfter": 8,
  "endReason": "unload"       // "unload" | "manual_reset"
}
```

### 3. `enhance_attempt`
강화 버튼 클릭 시 1회. (구 `probability_view` + `reinforce_attempt` 통합)

```jsonc
{
  "levelBefore": 9,
  "cost": 410,
  "successProbability": 0.55,
  "failureProbability": 0.44,
  "destructionProbability": 0.01,
  "protectionPlanned": true,
  "goldBefore": 12000,
  "scrapsBefore": 2,
  "protectionTicketsBefore": 1
}
```

### 4. `enhance_result`
강화 결과가 확정된 직후 1회. (구 `reinforce_result` + `use_protection` + `armor_break` 통합)

```jsonc
{
  "result": "success",        // "success" | "failure_kept" | "destroyed" | "destroy_protected"
  "levelBefore": 9,
  "levelAfter": 10,            // destroyed/destroy_protected면 null
  "protectionUsed": false,
  "scrapsGained": 0,           // destroyed일 때만 0 이상
  "cost": 410,
  "successProbability": 0.55,
  "failureProbability": 0.44,
  "destructionProbability": 0.01,
  "goldAfter": 11590,
  "scrapsAfter": 2,
  "protectionTicketsAfter": 1,
  "highestLevelAfter": 10
}
```

### 5. `armor_sold`
판매 버튼 클릭 시 1회. (구 `sell_armor` + 뒤따르는 `new_armor_start` 통합, reason은 "sell"로 고정)

```jsonc
{
  "level": 12,
  "price": 3200,
  "goldBefore": 8000,
  "goldAfter": 11200
}
```

### 6. `armor_restored`
조각으로 갑옷 복구 시 1회. (구 `armor_restore`)

```jsonc
{
  "level": 5,
  "scrapsUsed": 12,
  "scrapsBefore": 15,
  "scrapsAfter": 3
}
```

### 7. `new_armor_started`
파괴 이후(복구 포기) 새 +0 갑옷을 받을 때 1회. (구 `new_armor_start`, reason: "break"만 남음.
판매 후 새 갑옷은 `armor_sold`에 통합되어 더 이상 별도로 안 남음)

```jsonc
{
  "reason": "break_abandoned"
}
```

### 8. `legendary_achieved`
+20 달성 시 1회. (구 `legendary_clear`)

```jsonc
{
  "totalSessions": 4,
  "sessionAttempts": 55,
  "sessionSuccesses": 30,
  "sessionFailures": 25,
  "goldAfter": 500,
  "destructionCountTotal": 6
}
```

### 9. `bankruptcy`
강화 비용을 지불할 골드가 없어 더 진행이 불가능할 때 1회.
(구 `bankruptcy_blocked` + `session_bankruptcy` 통합)

```jsonc
{
  "levelAttempted": 14,
  "costRequired": 2800,
  "goldBefore": 150,
  "scrapsBefore": 0
}
```

### 10. `data_reset`
"데이터 초기화" 버튼 클릭 시 1회. 신규 이벤트(v1에 없었음).
이탈과는 다른 신호(포기하고 처음부터 다시 하려는 의도)라서 별도로 구분.

```jsonc
{
  "levelAtReset": 11,
  "goldAtReset": 4200,
  "sessionCountAtReset": 2,
  "destructionCountAtReset": 3
}
```

리셋 직후에는 `session_end`(endReason: "manual_reset")가 뒤따르고,
브라우저가 새로고침되며 새로운 `session_start`가 기록됩니다.

---

## 삭제된 이벤트 (v1 → v2)

| v1 이벤트 | 처리 |
|---|---|
| `probability_view` | `enhance_attempt`에 통합 |
| `reinforce_attempt` | `enhance_attempt`로 이름 변경 |
| `reinforce_result` | `enhance_result`로 이름 변경 |
| `use_protection` | `enhance_result.protectionUsed` 필드로 통합 |
| `armor_break` | `enhance_result.result="destroyed"` 로 통합 |
| `sell_armor` | `armor_sold`로 이름 변경 |
| `new_armor_start` (reason="sell") | 삭제 — `armor_sold` 자체가 새 갑옷 시작을 의미 |
| `new_armor_start` (reason="break") | `new_armor_started`로 이름 변경 |
| `legendary_clear` | `legendary_achieved`로 이름 변경 |
| `bankruptcy_blocked` | `bankruptcy`로 통합 |
| `session_bankruptcy` | `bankruptcy`로 통합 (중복 제거) |
| `armor_restore` | `armor_restored`로 이름 변경 |

**결과: 이벤트 종류 12종 → 9종(통합/정리) + `data_reset` 1종(신규) = 총 10종.
1회 행동당 로그 1~2개 → 정확히 1개로 축소.**

---

## 분석 시 활용 예시

- **DAU/WAU/MAU**: `sessions` 컬렉션의 `startedAt` 기준 (Firestore users/sessions 컬렉션, 이 문서와는 별도)
- **강화 성공률 실측**: `enhance_result` 중 `result="success"` 비율
- **파산 이탈률**: `bankruptcy` 이벤트 발생 세션 수 / 전체 세션 수
- **평균 파괴 전 시도 횟수**: `enhance_attempt` 카운트 ÷ `enhance_result.result="destroyed"` 카운트
- **보호권 사용 효율**: `enhance_result.protectionUsed=true` 중 결과가 `destroy_protected`인 비율
- **포기성 재시작 비율**: `data_reset` 발생 횟수 / 전체 세션 수 (이탈과 구분되는 "리셋 후 재도전" 성향)
