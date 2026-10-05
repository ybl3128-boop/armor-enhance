# 배포 전 체크리스트

배포 전에 다음 항목들을 확인하세요.

## 환경 설정

- [ ] NODE_ENV=production 설정
- [ ] PORT 올바르게 설정 (기본값: 3001)
- [ ] DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD 설정
- [ ] CORS_ORIGIN에 프론트엔드 도메인 포함
- [ ] 모든 환경 변수 암호화되어 저장됨

## 보안

- [ ] HTTPS 활성화
- [ ] CORS 정확하게 설정
- [ ] API 요청 검증 완료
- [ ] SQL 인젝션 방지
- [ ] 환경 변수 노출 안 함
- [ ] 방화벽 규칙 설정

## 데이터베이스

- [ ] PostgreSQL 설치 및 실행
- [ ] 데이터베이스 생성
- [ ] 마이그레이션 스크립트 실행
- [ ] 테스트 데이터 입력
- [ ] 백업 전략 수립
- [ ] 연결 풀 설정 확인

## 애플리케이션

- [ ] npm install 실행
- [ ] npm start로 정상 시작 확인
- [ ] 로그 수준 설정 (프로덕션: info/error만)
- [ ] 에러 핸들링 완료
- [ ] 타임아웃 설정
- [ ] 헬스 체크 작동 확인

## 배포 플랫폼 설정

### Railway
- [ ] 프로젝트 생성
- [ ] GitHub 연결
- [ ] 환경 변수 추가
- [ ] PostgreSQL 추가
- [ ] 배포 완료

### Render
- [ ] Web Service 생성
- [ ] GitHub 연결
- [ ] Build/Start 커맨드 설정
- [ ] 환경 변수 추가
- [ ] PostgreSQL 생성
- [ ] 배포 완료

### VPS
- [ ] 서버 준비 (Node.js, PostgreSQL)
- [ ] git clone 완료
- [ ] npm install 완료
- [ ] systemd 서비스 설정
- [ ] Nginx 리버스 프록시 설정
- [ ] SSL 인증서 설정

## 프론트엔드 연결

- [ ] API_URL 환경 변수 설정
- [ ] CORS 요청 테스트
- [ ] 로그인 및 로그아웃 테스트
- [ ] 데이터 저장/조회 테스트
- [ ] 오류 처리 확인

## 모니터링

- [ ] 로그 수집 설정
- [ ] 에러 알림 설정 (선택)
- [ ] 성능 모니터링 활성화
- [ ] 데이터베이스 모니터링 활성화
- [ ] 정기 백업 설정

## 문서

- [ ] README.md 업데이트
- [ ] API 문서 확인
- [ ] 배포 절차 문서화
- [ ] 롤백 절차 수립

## 테스트

- [ ] 건강 상태 체크: GET /health
- [ ] 사용자 등록: POST /api/users/register
- [ ] 세션 시작: POST /api/sessions/start
- [ ] 이벤트 로그: POST /api/events/batch
- [ ] 통계 조회: GET /api/analytics/summary
- [ ] CSV 내보내기: GET /api/analytics/export/csv
- [ ] Excel 내보내기: GET /api/analytics/export/xlsx

## 배포 후 확인

- [ ] 서비스 정상 작동 확인
- [ ] 데이터베이스 연결 확인
- [ ] 로그 저장 확인
- [ ] 내보내기 기능 테스트
- [ ] 프론트엔드 게임 플레이 테스트
- [ ] 배포 시간 기록

## 롤백 계획

- [ ] 이전 버전 백업 생성
- [ ] 데이터베이스 백업 생성
- [ ] 롤백 절차 문서화
- [ ] 롤백 테스트

## 배포 완료

배포 날짜: ________________
배포 버전: ________________
배포 담당자: ________________
주요 변경사항: 
- 
- 
- 

문제 발생 시 연락처: ________________
