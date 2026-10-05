# Render 배포 가이드

## Render 배포

Render는 PostgreSQL을 포함한 무료 tier를 제공합니다.

### 준비

- [render.com](https://render.com) 가입
- GitHub 저장소 연결

### 배포 단계

#### 1. 새 Web Service 생성

- Render 대시보드에서 "New+" 클릭
- "Web Service" 선택
- GitHub 저장소 연택
- Branch: main 선택

#### 2. 서비스 설정

| 항목 | 값 |
|---|---|
| Name | armor-enhance-backend |
| Environment | Node |
| Region | Singapore (또는 가까운 지역) |
| Build Command | `npm install` |
| Start Command | `cd server && npm start` |
| Instance Type | Free |

#### 3. 환경 변수 추가

Environment 탭에서:
```
NODE_ENV=production
DB_HOST=<postgres-host>
DB_PORT=5432
DB_NAME=armor_enhance
DB_USER=postgres
DB_PASSWORD=<password>
CORS_ORIGIN=https://yourgame.com
```

#### 4. PostgreSQL 데이터베이스 추가

- "New+" → "PostgreSQL" 선택
- 생성 후 연결 정보를 위 환경 변수에 설정

#### 5. 배포 확인

- "Logs" 탭에서 배포 진행 확인
- 완료 후 URL 확인: `https://armor-enhance-backend.onrender.com`

### 프론트엔드 연결

Render Webservice를 프론트엔드로도 사용 가능:

1. "New+" → "Static Site" 선택
2. GitHub 연택
3. Build Command: `npm run build`
4. Publish Directory: `dist`
5. 환경 변수에 `VITE_API_URL` 추가

또는 Vercel 사용 (권장)

### 자동 배포

GitHub에 push하면 자동으로 배포됩니다.

```bash
git push origin main
```

### 성능 최적화

#### Free tier 제한사항
- 15분 이상 요청 없으면 자동 종료
- 월 750시간 제한

#### Pro tier 업그레이드 필요시
- 항상 실행 옵션
- 더 빠른 성능
- 개선된 지원
