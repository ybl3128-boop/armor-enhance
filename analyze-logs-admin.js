// Firebase Admin SDK 기반 로그 분석 스크립트
// 실행: node analyze-logs-admin.js

const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');
const { getFirestore } = require('firebase-admin/firestore');

const app = admin.initializeApp({ credential: admin.cert(serviceAccount) });
const db = getFirestore(app);

// 수요일 기준 주차 경계
const WEEK_BOUNDARIES = {
  twoWeeksAgoStart: new Date('2026-10-14T00:00:00+09:00'),
  lastWeekStart: new Date('2026-10-21T00:00:00+09:00'),
  thisWeekStart: new Date('2026-10-28T00:00:00+09:00'),
  now: new Date()
};

async function fetchAll(collectionName, startDate) {
  const snap = await db
    .collection(collectionName)
    .where(collectionName === 'sessions' ? 'startedAt' : 'timestamp', '>=', startDate)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function main() {
  console.log('📥 데이터 로딩 중... (지지난주부터 전체)');
  const sessions = await fetchAll('sessions', WEEK_BOUNDARIES.twoWeeksAgoStart);
  const events = await fetchAll('events', WEEK_BOUNDARIES.twoWeeksAgoStart);
  console.log(`✅ 세션 ${sessions.length}개, 이벤트 ${events.length}개 로드 완료\n`);

  require('fs').writeFileSync(
    'raw-sessions.json',
    JSON.stringify(sessions, (k, v) => (v && v.toDate ? v.toDate().toISOString() : v), 2)
  );
  require('fs').writeFileSync(
    'raw-events.json',
    JSON.stringify(events, (k, v) => (v && v.toDate ? v.toDate().toISOString() : v), 2)
  );
  console.log('💾 raw-sessions.json, raw-events.json 저장 완료\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ 오류:', err);
    process.exit(1);
  });
