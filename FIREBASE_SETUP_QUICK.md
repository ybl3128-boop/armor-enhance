# Firebase 빠른 설정 가이드

## 1단계: Firebase 프로젝트 생성

1. https://console.firebase.google.com 접속
2. "프로젝트 추가" 클릭
3. 프로젝트명: `armor-enhance`
4. "프로젝트 만들기" 클릭

## 2단계: Firestore 데이터베이스 생성

1. 왼쪽 메뉴 → "Firestore Database"
2. "데이터베이스 만들기" 클릭
3. 위치: `asia-southeast1` (아시아 - 서울)
4. 보안 규칙: **테스트 모드** 선택
5. "만들기" 클릭

⚠️ **중요**: 테스트 모드는 30일 후 비활성화됩니다. 프로덕션 배포 전에 `FIREBASE_SETUP.md`의 보안 규칙으로 변경하세요.

## 3단계: 웹 앱 등록

1. 프로젝트 설정 (좌측 하단 ⚙️ 아이콘)
2. "앱 추가" → "웹" 선택
3. 앱 이름: `armor-enhance-web`
4. "앱 등록" 클릭
5. 아래 코드 복사

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## 4단계: 환경 변수 설정

프로젝트 루트에 `.env.local` 생성:

```env
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

## 5단계: 로컬 테스트

```bash
# 패키지 설치
npm install

# 개발 서버 실행
npm run dev
```

게임을 플레이하면 자동으로 로그가 Firebase에 저장됩니다.

## 6단계: 관리자 대시보드 확인

1. 브라우저에서 `admin-dashboard.html` 열기 (또는 웹서버 통해 `/admin-dashboard.html`)
2. "새로고침" 버튼 클릭
3. 데이터 표시 확인
4. "Excel 다운로드" 또는 "CSV 다운로드" 테스트

## 🔍 체크리스트

- [ ] Firestore 데이터베이스 생성됨
- [ ] 웹 앱 등록 완료
- [ ] `.env.local` 파일 생성 및 설정값 입력
- [ ] `npm install` 완료
- [ ] `npm run dev`로 게임 실행됨
- [ ] 게임 플레이 후 Firebase에 데이터 저장됨 (콘솔 확인)
- [ ] 관리자 대시보드에서 데이터 표시됨
- [ ] Excel/CSV 다운로드 작동함

## 🚀 배포

### Vercel/Netlify 배포
```bash
npm run build
```

프로젝트 설정에서 환경 변수 추가:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- 등등...

### Firebase Hosting 배포
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 📊 성능 모니터링

Firebase 콘솔에서:
- Firestore 대시보드로 데이터 확인
- 읽기/쓰기 횟수 모니터링
- 무료 tier 범위 내인지 확인

**월간 무료 한도:**
- 50,000 읽기
- 20,000 쓰기
- 20,000 삭제

일반적인 게임은 무료 범위 내에서 작동합니다.
