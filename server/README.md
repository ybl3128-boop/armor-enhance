# Armor Enhance - Backend Server

로그 저장 및 내보내기를 위한 백엔드 서버입니다.

## 설치

```bash
cd server
npm install
```

## 환경 설정

`.env` 파일을 생성하고 다음 정보를 입력하세요:

```env
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=armor_enhance
DB_USER=postgres
DB_PASSWORD=postgres

CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

## 데이터베이스 설정

### PostgreSQL 설치 (Mac)
```bash
brew install postgresql
brew services start postgresql
createdb armor_enhance
```

### PostgreSQL 설치 (Windows)
- [PostgreSQL 다운로드](https://www.postgresql.org/download/windows/)
- pgAdmin으로 데이터베이스 생성

### PostgreSQL 설치 (Linux)
```bash
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres createdb armor_enhance
```

## 실행

개발 모드:
```bash
npm run dev
```

프로덕션 모드:
```bash
npm start
```

## API 엔드포인트

### 사용자 관리
- `POST /api/users/register` - 사용자 등록 (IP 기반)
- `GET /api/users/:userId/stats` - 사용자 통계

### 세션 관리
- `POST /api/sessions/start` - 세션 시작
- `POST /api/sessions/end` - 세션 종료
- `GET /api/sessions/:userId/stats` - 세션 통계
- `GET /api/sessions/:userId/recent` - 최근 세션 목록

### 이벤트 로그
- `POST /api/events/batch` - 배치 이벤트 저장
- `GET /api/events/:sessionId` - 세션 이벤트 조회
- `GET /api/events/:userId/stats` - 사용자 이벤트 통계

### 분석 및 내보내기
- `GET /api/analytics/summary` - 통계 요약
- `GET /api/analytics/export/csv` - CSV로 모든 로그 내보내기
- `GET /api/analytics/export/json` - JSON으로 모든 로그 내보내기

### 상태 확인
- `GET /health` - 서버 상태 확인

## 로그 구조

### 사용자 (users 테이블)
```javascript
{
  userId,         // 고유 ID (IP 기반 생성)
  fingerprintId,  // 브라우저 지문
  ipHash,         // IP 해시값
  firstSeenAt,    // 첫 방문 시간
  lastSeenAt,     // 마지막 방문 시간
  totalSessions   // 총 세션 수
}
```

### 세션 (sessions 테이블)
```javascript
{
  sessionId,            // 세션 고유 ID
  userId,               // 사용자 ID
  startedAt,            // 시작 시간
  endedAt,              // 종료 시간
  finalLevel,           // 최종 강화 단계
  finalGold,            // 최종 골드
  destructionCount,     // 파괴 횟수
  maxGoldDuringSession, // 세션 중 최대 보유 골드
  isBankrupt            // 파산 여부
}
```

### 이벤트 (events 테이블)
```javascript
{
  eventId,    // 이벤트 고유 ID
  sessionId,  // 세션 ID
  userId,     // 사용자 ID
  eventType,  // 이벤트 타입 (session_start, reinforce_result, etc)
  timestamp,  // 발생 시간
  payload     // 이벤트 데이터 (JSON)
}
```

## 내보내기 형식

### CSV
모든 로그를 CSV로 내보낼 수 있습니다:
```
GET /api/analytics/export/csv
```

다운로드된 파일을 Excel에서 열어 분석할 수 있습니다.

### JSON
모든 로그를 JSON 형식으로 내보낼 수 있습니다:
```
GET /api/analytics/export/json
```

Python, R 등의 도구로 분석할 수 있습니다.

## 배포

### Heroku
```bash
heroku create armor-enhance-backend
git push heroku main
heroku config:set DB_HOST=...
heroku run npm run migrate
```

### Railway
```bash
railway init
railway link
railway up
```

## 트러블슈팅

### 데이터베이스 연결 오류
1. PostgreSQL이 실행 중인지 확인
2. `.env` 파일의 DB 설정 확인
3. 데이터베이스 생성 여부 확인

### CORS 오류
`.env`의 `CORS_ORIGIN`이 프론트엔드 URL을 포함하는지 확인

### 포트 충돌
다른 포트로 변경: `PORT=3002 npm run dev`
