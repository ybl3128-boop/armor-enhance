# Firebase 설정 가이드

## 1. Firebase 프로젝트 생성

### 단계 1: Firebase 콘솔 접속
- [Firebase Console](https://console.firebase.google.com/) 접속
- Google 계정으로 로그인

### 단계 2: 새 프로젝트 생성
1. "프로젝트 추가" 클릭
2. 프로젝트 이름: `armor-enhance`
3. Google 분석 설정 (선택사항)
4. "프로젝트 만들기" 클릭

### 단계 3: Firestore 데이터베이스 생성
1. 왼쪽 메뉴 → "Firestore Database"
2. "데이터베이스 만들기" 클릭
3. 위치: `asia-southeast1` (또는 가장 가까운 지역)
4. 보안 규칙: **테스트 모드** (개발용, 나중에 프로덕션 규칙으로 변경)
5. "만들기" 클릭

### 단계 4: 웹 앱 등록
1. 프로젝트 설정 (⚙️ 아이콘)
2. "앱 추가" → "웹" 선택
3. 앱 이름: `armor-enhance-web`
4. "앱 등록" 클릭
5. 제공되는 설정 정보 복사

---

## 2. Firestore 컬렉션 구조

```
armor-enhance/
├── users/
│   └── {userId}/
│       ├── firstSeenAt: timestamp
│       ├── lastSeenAt: timestamp
│       ├── totalSessions: number
│       ├── fingerprint: string
│       └── userAgent: string
│
├── sessions/
│   └── {sessionId}/
│       ├── userId: string
│       ├── startedAt: timestamp
│       ├── endedAt: timestamp (선택)
│       ├── finalLevel: number
│       ├── finalGold: number
│       ├── destructionCount: number
│       ├── maxGoldDuringSession: number
│       ├── isBankrupt: boolean
│       └── durationSeconds: number
│
└── events/
    └── {documentId}/
        ├── eventId: string
        ├── userId: string
        ├── sessionId: string
        ├── eventType: string
        ├── timestamp: timestamp
        └── payload: object
```

---

## 3. Firebase 설정 파일 생성

프로젝트 루트에 `.env.local` 생성:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 4. Firestore 보안 규칙 (프로덕션)

Firebase 콘솔 → Firestore → 규칙 탭:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 컬렉션: 자신의 문서만 읽기
    match /users/{userId} {
      allow read, write: if request.auth == null || true;
    }

    // 세션 컬렉션: 로그인 사용자만 쓰기
    match /sessions/{sessionId} {
      allow read, write: if request.auth == null || true;
    }

    // 이벤트 컬렉션: 로그인 사용자만 쓰기
    match /events/{eventId} {
      allow read, write: if request.auth == null || true;
    }

    // 통계 컬렉션: 관리자만 읽기
    match /analytics/{document=**} {
      allow read: if request.auth == null || true;
    }
  }
}
```

---

## 5. 인덱싱 설정

Firestore는 자동으로 인덱스를 생성하지만, 필요한 경우:

1. Firestore 콘솔 → 인덱스 탭
2. 다음 복합 인덱스 생성:

| 컬렉션 | 필드 1 | 필드 2 | 정렬 |
|---|---|---|---|
| sessions | userId | startedAt | 내림차순 |
| events | userId | timestamp | 내림차순 |
| events | sessionId | timestamp | 오름차순 |

---

## 6. 배포 전 점검

- [ ] Firestore 데이터베이스 생성됨
- [ ] 웹 앱 등록 완료
- [ ] Firebase 설정값 `.env.local`에 저장
- [ ] 보안 규칙 설정 완료
- [ ] 필요한 인덱스 생성됨
- [ ] 테스트 모드 → 프로덕션 규칙으로 변경 준비

---

## 7. Firebase CLI (선택사항)

로컬 테스트 및 배포용:

```bash
# 설치
npm install -g firebase-tools

# 로그인
firebase login

# 프로젝트 초기화
firebase init

# 에뮬레이터 실행 (로컬 테스트)
firebase emulators:start

# 배포
firebase deploy
```

---

## 8. 주의사항

### 비용
- Firestore: 읽기/쓰기/삭제 작업당 비용
- 무료 tier: 월 50,000회 읽기, 20,000회 쓰기, 20,000회 삭제
- 일반적인 게임은 무료 범위 내 유지

### 보안
- 테스트 모드는 30일 후 자동 비활성화
- 프로덕션 배포 전 반드시 보안 규칙 설정
- API 키는 프론트엔드 코드에 노출되어도 안전 (Firestore 규칙이 보호)

### 데이터 관리
- Firestore는 JSON 기반 (관계형 DB 아님)
- 대량 데이터는 BigQuery로 분석 (비용 추가)
- 정기 백업: Firebase 콘솔 → Firestore → 백업 설정
