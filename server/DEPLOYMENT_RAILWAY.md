# Railway 배포 가이드

## Railway 배포 (권장)

Railway는 설정이 간단하고 무료 크레딧을 제공합니다.

### 준비

1. [railway.app](https://railway.app) 가입
2. GitHub 계정 연결

### 배포 단계

#### 1. Railway CLI 설치

```bash
npm install -g @railway/cli
railway login
railway init
```

#### 2. 환경 변수 설정

Railway 대시보드에서 Variables 탭 열기:

```
NODE_ENV=production
PORT=3001
DB_HOST=<railway-postgres-host>
DB_PORT=5432
DB_NAME=armor_enhance
DB_USER=postgres
DB_PASSWORD=<설정한 비밀번호>
CORS_ORIGIN=https://yourgame.com,https://www.yourgame.com
```

#### 3. PostgreSQL 데이터베이스 추가

- Railway 대시보드에서 "New" 클릭
- PostgreSQL 선택
- 자동으로 환경 변수 생성됨

#### 4. 배포

```bash
git push
```

또는 Railway 대시보드에서 "Deploy" 클릭

### 모니터링

- Railway 대시보드에서 로그 확인
- Health check: `https://your-app.railway.app/health`

### 프론트엔드 연결

프론트엔드 `.env`:
```
VITE_API_URL=https://your-app.railway.app
```

또는 Vercel에 배포:
- 환경 변수에 `VITE_API_URL` 추가
- Railway 앱 URL 설정
