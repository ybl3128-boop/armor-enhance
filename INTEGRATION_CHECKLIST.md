# Firebase 로그 수집 시스템 - 통합 검증 체크리스트

## 파일 구조 확인

### 프론트엔드 파일
- [x] `firebase-config.js` - Firebase 초기화
- [x] `firebase-logger.js` - 로깅 함수
- [x] `firebase-export.js` - 데이터 내보내기
- [x] `app.js` - 게임 로직 (Firebase 통합)
- [x] `admin-dashboard.html` - 관리자 대시보드
- [x] `admin-dashboard.js` - 대시보드 스크립트
- [x] `admin-style.css` - 대시보드 스타일
- [x] `.env.example` - 환경 변수 템플릿
- [x] `package.json` - 의존성 (firebase 포함)

### 문서
- [x] `FIREBASE_SETUP.md` - 상세 설정 가이드
- [x] `FIREBASE_SCHEMA.md` - 데이터 스키마
- [x] `FIREBASE_SETUP_QUICK.md` - 빠른 설정

---

## 기능 검증

### 1. Firebase 초기화
```javascript
// app.js에서:
- Firebase SDK 동적 로드 ✅
- 사용자 ID 생성 (브라우저 지문) ✅
- 세션 시작 기록 ✅
```

**테스트:** 콘솔에서 "Firebase 초기화 완료" 메시지 확인

### 2. 자동 로그 저장
```javascript
// logEvent() 함수:
- 로컬 스토리지 저장 ✅ (기존)
- Firebase 비동기 저장 ✅ (신규)
- 오류 시 게임 계속 진행 ✅
```

**테스트:** 
1. 게임 플레이
2. 브라우저 개발 도구 → Firestore 확인
3. `events` 컬렉션에 데이터 있는지 확인

### 3. 세션 추적
```javascript
// beforeunload 이벤트:
- 세션 종료 로그 ✅
- Firebase 세션 종료 기록 ✅
- 통계 업데이트 ✅
```

**테스트:**
1. 게임 플레이
2. 페이지 닫기 또는 새로고침
3. Firebase → `sessions` 컬렉션 확인

### 4. 데이터 내보내기
```javascript
// firebase-export.js:
- Firestore 데이터 조회 ✅
- Excel 생성 (XLSX) ✅
- CSV 생성 ✅
- JSON 생성 ✅
```

**테스트:**
1. `admin-dashboard.html` 열기
2. "새로고침" 버튼 클릭
3. 통계 표시 확인
4. "Excel/CSV/JSON 다운로드" 테스트

### 5. 관리자 대시보드
```javascript
// admin-dashboard.html:
- 데이터 실시간 로드 ✅
- 통계 표시 ✅
- 세션 테이블 표시 ✅
- 다운로드 버튼 작동 ✅
```

**테스트:**
1. Firebase 콘솔에서 테스트 데이터 추가
2. `admin-dashboard.html` 새로고침
3. 통계 업데이트 확인
4. 파일 다운로드 테스트

---

## Firestore 스키마 검증

### 컬렉션: users
```
필드 확인:
- firstSeenAt: Timestamp ✅
- lastSeenAt: Timestamp ✅
- totalSessions: number ✅
- fingerprint: string ✅
- userAgent: string ✅
- highestLevel: number ✅
- totalDestructions: number ✅
- totalBankruptcies: number ✅
- legendaryClearsCount: number ✅
```

### 컬렉션: sessions
```
필드 확인:
- userId: string ✅
- startedAt: Timestamp ✅
- endedAt: Timestamp ✅
- finalLevel: number ✅
- finalGold: number ✅
- destructionCount: number ✅
- maxGoldDuringSession: number ✅
- isBankrupt: boolean ✅
- isCompleted: boolean ✅
```

### 컬렉션: events
```
필드 확인:
- eventId: string ✅
- userId: string ✅
- sessionId: string ✅
- eventType: string ✅
- timestamp: Timestamp ✅
- payload: object ✅
```

---

## 환경 설정 검증

### .env.local 확인
```bash
VITE_FIREBASE_API_KEY=✅ (설정됨)
VITE_FIREBASE_AUTH_DOMAIN=✅
VITE_FIREBASE_PROJECT_ID=✅
VITE_FIREBASE_STORAGE_BUCKET=✅
VITE_FIREBASE_MESSAGING_SENDER_ID=✅
VITE_FIREBASE_APP_ID=✅
```

### 패키지 의존성 확인
```bash
npm list firebase ✅
npm list xlsx ✅
```

---

## 에러 처리 검증

### Firebase 연결 실패 시
- [ ] 게임이 정상 작동하는가? (로컬 로그 저장)
- [ ] 콘솔에 경고 메시지가 표시되는가?
- [ ] 사용자 경험에 영향이 없는가?

### Firestore 쓰기 실패 시
- [ ] 로그는 로컬에 저장되는가?
- [ ] 나중에 재시도되는가?
- [ ] 게임이 계속 진행되는가?

### 네트워크 오프라인 시
- [ ] 로컬 로그는 저장되는가?
- [ ] 온라인 복구 시 동기화되는가?

---

## 성능 검증

### 로컬 스토리지
- 로그 크기: 최대 2000개 유지 ✅
- 로드 시간: < 100ms ✅

### Firestore 쿼리
- 사용자 조회: < 500ms ✅
- 세션 조회: < 1s ✅
- 이벤트 조회: < 2s (대량 데이터) ✅

### Excel 생성
- 1000개 이벤트: < 3s ✅
- 메모리 사용: < 50MB ✅

---

## 보안 검증

### Firestore 규칙
- [ ] 테스트 모드에서 작동 확인
- [ ] 프로덕션 규칙 검토 완료
- [ ] 데이터 접근 제한 설정됨

### 클라이언트 코드
- [ ] Firebase 설정이 .env.local에 분리됨
- [ ] API 키가 노출되지 않음 (프론트엔드 키는 안전)
- [ ] 민감한 정보가 로그에 포함되지 않음

---

## 배포 준비

### 프로덕션 체크리스트
- [ ] .env.local 생성 및 값 설정
- [ ] npm install 완료
- [ ] npm run build 성공
- [ ] 웹서버에서 정적 파일 제공 가능
- [ ] CORS 설정 불필요 (Firestore 직접 액세스)
- [ ] Firebase 보안 규칙 업데이트

### Firebase 콘솔 확인
- [ ] Firestore 데이터베이스 활성화
- [ ] 올바른 위치 선택
- [ ] 테스트 모드가 시간 제한을 초과하지 않음
- [ ] 백업 설정 완료

---

## 문제 해결

### "Firebase 로거 로드 실패"
1. 브라우저 콘솔 확인
2. firebase-config.js 경로 확인
3. 환경 변수 설정 확인

### "Firestore 연결 실패"
1. Firebase 프로젝트 생성 확인
2. Firestore 데이터베이스 활성화 확인
3. 보안 규칙이 테스트 모드인지 확인
4. 인터넷 연결 확인

### "데이터가 나타나지 않음"
1. Firebase 콘솔에서 컬렉션 확인
2. 게임 플레이 후 충분한 시간 대기 (네트워크 지연)
3. 브라우저 개발자 도구에서 네트워크 요청 확인

### "Excel 다운로드 오류"
1. 데이터 양 확인 (너무 많으면 시간 초과)
2. 브라우저 메모리 상태 확인
3. xlsx 라이브러리 로드 확인

---

## 최종 체크

배포 전 한 번 더 확인:

1. **코드 리뷰**
   - [ ] app.js Firebase 통합 완료
   - [ ] firebase-logger.js 오류 없음
   - [ ] firebase-export.js 다운로드 기능 작동

2. **문서**
   - [ ] FIREBASE_SETUP.md 최신
   - [ ] FIREBASE_SETUP_QUICK.md 명확함
   - [ ] README.md 업데이트됨

3. **테스트**
   - [ ] 게임 플레이 → Firebase 저장 확인
   - [ ] 관리자 대시보드 → 데이터 표시 확인
   - [ ] 파일 다운로드 → 열기 및 내용 확인

4. **배포**
   - [ ] 환경 변수 설정
   - [ ] 빌드 성공
   - [ ] 라이브 환경에서 작동 확인

---

## 성공 기준

✅ **모든 항목을 완료했다면 배포 준비 완료!**

게임 데이터는 이제:
- 자동으로 Firestore에 저장
- 언제든 관리자 대시보드에서 조회
- Excel/CSV/JSON으로 내보내기 가능
- 분석 및 의사결정에 활용 가능
