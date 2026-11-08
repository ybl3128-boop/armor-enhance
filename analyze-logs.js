import * as admin from 'firebase-admin';
import * as fs from 'fs';

// Firebase Admin SDK 초기화 (서비스 계정 키 필요)
// 또는 기존 저장된 데이터가 있으면 그것을 사용할 수 있음

const firebaseConfig = {
  apiKey: 'AIzaSyBrANfqNFZfcuIFQxmOqAwfOatuPClCh4A',
  authDomain: 'armor-enhance.firebaseapp.com',
  projectId: 'armor-enhance',
  storageBucket: 'armor-enhance.appspot.com',
  messagingSenderId: '433425827481',
  appId: '1:433425827481:web:bfbed6c1bb0f523ddf9a08'
};

async function analyzeLogs() {
  console.log('🔍 Firebase 로그 분석 시작...\n');

  try {
    // initializeApp 사용 (Client SDK로는 제한적이므로 주의)
    const app = admin.initializeApp(firebaseConfig);
    const db = admin.firestore();

    // 2주 전부터의 세션 조회
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    console.log(`📅 기간: ${twoWeeksAgo.toLocaleDateString('ko-KR')} ~ 현재\n`);

    // 세션 데이터 조회
    const sessionsSnap = await db
      .collection('sessions')
      .where('startedAt', '>=', twoWeeksAgo)
      .orderBy('startedAt', 'desc')
      .get();

    const sessions = sessionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 이벤트 데이터 조회
    const eventsSnap = await db
      .collection('events')
      .where('timestamp', '>=', twoWeeksAgo)
      .orderBy('timestamp', 'desc')
      .get();

    const events = eventsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 총 세션: ${sessions.length}개`);
    console.log(`📊 총 이벤트: ${events.length}개\n`);

    // 세션별 통계
    let totalDestructions = 0;
    let totalAttempts = 0;
    let totalSuccesses = 0;
    let totalFailures = 0;
    let levelReachCount = {};
    let bankruptcyCount = 0;
    let maxLevelReached = {};
    let goldStats = {
      total: 0,
      min: Infinity,
      max: -Infinity,
      avgFinal: 0,
      avgMax: 0
    };

    sessions.forEach(session => {
      const startedAt = session.startedAt?.toDate?.() || new Date(session.startedAt);
      const attempts = session.sessionAttempts || 0;
      const successes = session.sessionSuccesses || 0;
      const destructions = session.destructionCount || 0;
      const finalGold = session.goldAfter || session.finalGold || 0;
      const maxGold = session.sessionMaxGold || 0;

      totalAttempts += attempts;
      totalSuccesses += successes;
      totalFailures += (session.sessionFailures || 0);
      totalDestructions += destructions;
      goldStats.total += finalGold;
      goldStats.min = Math.min(goldStats.min, finalGold);
      goldStats.max = Math.max(goldStats.max, finalGold);
      goldStats.avgFinal += finalGold;
      goldStats.avgMax += maxGold;

      const finalLevel = session.currentLevelAfter || session.finalLevel || 0;
      const highestLevel = session.highestLevelAfter || session.highestLevel || finalLevel;

      if (!levelReachCount[highestLevel]) levelReachCount[highestLevel] = 0;
      levelReachCount[highestLevel]++;

      if (!maxLevelReached[highestLevel]) maxLevelReached[highestLevel] = [];
      maxLevelReached[highestLevel].push({
        date: startedAt.toLocaleDateString('ko-KR'),
        attempts,
        destructions,
        finalGold,
        maxGold
      });

      if (session.isBankrupt || (attempts > 0 && finalGold < 0)) {
        bankruptcyCount++;
      }
    });

    goldStats.avgFinal /= sessions.length || 1;
    goldStats.avgMax /= sessions.length || 1;

    console.log('📈 세션 통계:');
    console.log(`  • 총 강화 시도: ${totalAttempts}회`);
    console.log(`  • 성공: ${totalSuccesses}회 (${(totalSuccesses / totalAttempts * 100).toFixed(1)}%)`);
    console.log(`  • 실패: ${totalFailures}회`);
    console.log(`  • 파괴: ${totalDestructions}회\n`);

    console.log('💰 골드 통계:');
    console.log(`  • 평균 최종 골드: ${Math.round(goldStats.avgFinal)}G`);
    console.log(`  • 평균 세션 최대 골드: ${Math.round(goldStats.avgMax)}G`);
    console.log(`  • 최소 최종 골드: ${goldStats.min}G`);
    console.log(`  • 최대 최종 골드: ${goldStats.max}G`);
    console.log(`  • 파산 세션: ${bankruptcyCount}회 (${(bankruptcyCount / sessions.length * 100).toFixed(1)}%)\n`);

    console.log('🎯 최고 도달 레벨별 세션 수:');
    const sortedLevels = Object.keys(levelReachCount)
      .map(Number)
      .sort((a, b) => b - a);

    sortedLevels.forEach(level => {
      const count = levelReachCount[level];
      const percent = (count / sessions.length * 100).toFixed(1);
      console.log(`  • +${level}: ${count}회 (${percent}%)`);
    });

    // 강화 확률 분석 - 레벨별 성공률
    console.log('\n📊 강화 결과 분석 (reinforce_result 이벤트):');
    const reinforceResults = events.filter(e => e.eventType === 'reinforce_result');
    const resultByLevel = {};

    reinforceResults.forEach(event => {
      const level = event.payload?.beforeLevel;
      if (level === undefined) return;

      if (!resultByLevel[level]) {
        resultByLevel[level] = { success: 0, failure: 0, destruction: 0, total: 0 };
      }

      const result = event.payload?.result;
      if (result === 'success') resultByLevel[level].success++;
      else if (result === 'failure_kept') resultByLevel[level].failure++;
      else if (result === 'destruction' || result === 'destruction_protected')
        resultByLevel[level].destruction++;

      resultByLevel[level].total++;
    });

    console.log('레벨 | 성공률 | 실패 유지 | 파괴율 | 시도 횟수');
    console.log('-----|--------|----------|--------|----------');

    Object.keys(resultByLevel)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach(level => {
        const stats = resultByLevel[level];
        const successRate = (stats.success / stats.total * 100).toFixed(1);
        const failureRate = (stats.failure / stats.total * 100).toFixed(1);
        const destructionRate = (stats.destruction / stats.total * 100).toFixed(1);
        console.log(
          `+${String(level).padStart(2, ' ')} | ${successRate.padStart(5, ' ')}% | ${failureRate.padStart(6, ' ')}% | ${destructionRate.padStart(5, ' ')}% | ${stats.total}`
        );
      });

    // 11-13 레벨 구간 분석 (사용자가 언급한 갭)
    console.log('\n🔍 11-13 레벨 구간 분석 (문제 구간):');
    const level11_13 = events.filter(
      e => e.eventType === 'reinforce_attempt' &&
      e.payload?.level >= 10 && e.payload?.level <= 12
    );
    const level11_13_results = events.filter(
      e => e.eventType === 'reinforce_result' &&
      e.payload?.beforeLevel >= 10 && e.payload?.beforeLevel <= 12
    );

    console.log(`  • 강화 시도: ${level11_13.length}회`);
    console.log(`  • 결과 기록: ${level11_13_results.length}회`);

    const bankruptcyAt11_13 = events.filter(
      e => e.eventType === 'bankruptcy' && e.payload?.level >= 10 && e.payload?.level <= 12
    );
    console.log(`  • 파산 발생: ${bankruptcyAt11_13.length}회`);

    // 보호권 사용 분석
    console.log('\n🛡️ 파괴 방지권 사용 분석:');
    const protectionUsed = events.filter(e => e.eventType === 'use_protection');
    const scrapConversion = events.filter(e => e.eventType === 'scrap_to_protection_ticket');
    console.log(`  • 보호권 사용: ${protectionUsed.length}회`);
    console.log(`  • 조각 → 보호권 변환: ${scrapConversion.length}회`);

    // 결과 저장
    const report = {
      period: `${twoWeeksAgo.toLocaleDateString('ko-KR')} ~ ${new Date().toLocaleDateString('ko-KR')}`,
      summary: {
        totalSessions: sessions.length,
        totalEvents: events.length,
        totalAttempts,
        totalSuccesses,
        totalFailures,
        totalDestructions,
        bankruptcyRate: `${(bankruptcyCount / sessions.length * 100).toFixed(1)}%`,
        avgFinalGold: Math.round(goldStats.avgFinal),
        avgMaxGold: Math.round(goldStats.avgMax)
      },
      levelReachCount,
      resultByLevel,
      criticalIssues: {
        level11_13_attempts: level11_13.length,
        level11_13_bankruptcies: bankruptcyAt11_13.length
      }
    };

    // JSON 파일로 저장
    fs.writeFileSync(
      'log-analysis.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n✅ 분석 완료! log-analysis.json 파일 생성됨\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
}

analyzeLogs();
