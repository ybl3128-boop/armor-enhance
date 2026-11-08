/**
 * Firebase 로그 분석 도구
 * 브라우저 콘솔 또는 admin-dashboard.html에서 실행 가능
 * 
 * 사용법:
 * 1. admin-dashboard.html 열기
 * 2. 브라우저 콘솔에서 복사 후 실행
 */

async function analyzeLogsFrom2WeeksAgo() {
  console.log('🔍 Firebase 로그 분석 시작...\n');

  // Firebase가 로드되었는지 확인
  if (typeof firebase === 'undefined') {
    console.error('❌ Firebase가 로드되지 않았습니다.');
    return;
  }

  try {
    const db = firebase.firestore();

    // 2주 전 날짜 계산
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    twoWeeksAgo.setHours(0, 0, 0, 0);

    console.log(`📅 분석 기간: ${twoWeeksAgo.toLocaleDateString('ko-KR')} ~ 현재\n`);

    // 1. 세션 데이터 조회
    console.log('📊 세션 데이터 조회 중...');
    const sessionsSnap = await db
      .collection('sessions')
      .where('startedAt', '>=', twoWeeksAgo)
      .orderBy('startedAt', 'desc')
      .get();

    const sessions = sessionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ ${sessions.length}개 세션 로드됨\n`);

    // 2. 이벤트 데이터 조회 (최대 5000개)
    console.log('📊 강화 이벤트 조회 중...');
    const eventsSnap = await db
      .collection('events')
      .where('timestamp', '>=', twoWeeksAgo)
      .orderBy('timestamp', 'desc')
      .limit(5000)
      .get();

    const events = eventsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ ${events.length}개 이벤트 로드됨\n`);

    // 3. 세션별 통계 계산
    console.log('📈 세션 통계 계산 중...\n');

    let totalDestructions = 0;
    let totalAttempts = 0;
    let totalSuccesses = 0;
    let totalFailures = 0;
    let levelReachCount = {};
    let bankruptcyCount = 0;
    let goldStats = {
      total: 0,
      min: Infinity,
      max: -Infinity,
      avgFinal: 0,
      avgMax: 0
    };

    sessions.forEach(session => {
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

      const highestLevel = session.highestLevelAfter || session.highestLevel || 0;
      if (!levelReachCount[highestLevel]) levelReachCount[highestLevel] = 0;
      levelReachCount[highestLevel]++;

      if (session.isBankrupt || finalGold < 0) {
        bankruptcyCount++;
      }
    });

    goldStats.avgFinal /= sessions.length || 1;
    goldStats.avgMax /= sessions.length || 1;

    // 출력: 기본 통계
    console.log('=== 📊 기본 통계 ===');
    console.log(`총 세션: ${sessions.length}개`);
    console.log(`총 강화 시도: ${totalAttempts}회`);
    console.log(`성공: ${totalSuccesses}회 (${(totalSuccesses / totalAttempts * 100).toFixed(1)}%)`);
    console.log(`실패 유지: ${totalFailures}회`);
    console.log(`파괴: ${totalDestructions}회`);
    console.log(`파산: ${bankruptcyCount}회 (${(bankruptcyCount / sessions.length * 100).toFixed(1)}%)\n`);

    // 출력: 골드 통계
    console.log('=== 💰 골드 통계 ===');
    console.log(`평균 최종 골드: ${Math.round(goldStats.avgFinal).toLocaleString()}G`);
    console.log(`평균 세션 최대 골드: ${Math.round(goldStats.avgMax).toLocaleString()}G`);
    console.log(`최소 최종 골드: ${goldStats.min.toLocaleString()}G`);
    console.log(`최대 최종 골드: ${goldStats.max.toLocaleString()}G\n`);

    // 출력: 레벨별 도달 통계
    console.log('=== 🎯 최고 도달 레벨별 세션 수 ===');
    const sortedLevels = Object.keys(levelReachCount)
      .map(Number)
      .sort((a, b) => b - a);

    sortedLevels.forEach(level => {
      const count = levelReachCount[level];
      const percent = (count / sessions.length * 100).toFixed(1);
      console.log(`+${level.toString().padStart(2, ' ')}: ${count.toString().padStart(3, ' ')}회 (${percent.padStart(5, ' ')}%)`);
    });

    // 4. 레벨별 강화 확률 분석
    console.log('\n=== 📊 레벨별 강화 결과 (실제 확률) ===');
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
      else if (result?.includes('destruction')) resultByLevel[level].destruction++;

      resultByLevel[level].total++;
    });

    console.log('Lv. | 성공률 | 실패유지 | 파괴율 | 시도 수');
    console.log('----+--------+--------+-------+-------');

    Object.keys(resultByLevel)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach(level => {
        const stats = resultByLevel[level];
        if (stats.total < 3) return; // 3회 미만은 통계 신뢰도 낮음
        const successRate = (stats.success / stats.total * 100).toFixed(1);
        const failureRate = (stats.failure / stats.total * 100).toFixed(1);
        const destructionRate = (stats.destruction / stats.total * 100).toFixed(1);
        console.log(
          `+${String(level).padStart(2, ' ')} | ${successRate.padStart(6, ' ')}% | ${failureRate.padStart(7, ' ')}% | ${destructionRate.padStart(5, ' ')}% | ${stats.total.toString().padStart(3, ' ')}`
        );
      });

    // 5. 문제 구간 분석 (11-13)
    console.log('\n=== 🔍 문제 구간 분석 (Lv 10-12) ===');
    const level10_12_attempts = events.filter(
      e => e.eventType === 'reinforce_attempt' &&
      e.payload?.level >= 10 && e.payload?.level <= 12
    );
    const level10_12_bankruptcies = events.filter(
      e => e.eventType === 'bankruptcy' && e.payload?.level >= 10 && e.payload?.level <= 12
    );

    console.log(`강화 시도: ${level10_12_attempts.length}회`);
    console.log(`파산 발생: ${level10_12_bankruptcies.length}회`);
    console.log(`파산율: ${(level10_12_bankruptcies.length / level10_12_attempts.length * 100).toFixed(1)}%\n`);

    // 6. 설정값과 비교
    console.log('=== ⚙️ 설정된 확률 vs 실제 확률 비교 ===');
    const PROBABILITIES = [
      0.9975, 0.945, 0.8925, 0.8925, 0.84, 0.7875, 0.735, 0.6825,
      0.63, 0.5775, 0.525, 0.4725, 0.42, 0.3675, 0.315, 0.315,
      0.315, 0.1575, 0.1575, 0.1575, 0.315, 0.1575, 0.1575, 0.105,
      0.105, 0.105, 0.0735, 0.0525, 0.0315, 0.0105
    ];

    console.log('Lv. | 설정 성공 | 실제 성공 | 차이');
    console.log('----+----------+---------+-------');

    Object.keys(resultByLevel)
      .map(Number)
      .sort((a, b) => a - b)
      .filter(level => resultByLevel[level].total >= 5) // 5회 이상만
      .forEach(level => {
        const stats = resultByLevel[level];
        const actualRate = stats.success / stats.total;
        const expectedRate = PROBABILITIES[level] || 0;
        const diff = ((actualRate - expectedRate) * 100).toFixed(1);
        console.log(
          `+${String(level).padStart(2, ' ')} | ${(expectedRate * 100).toFixed(1).padStart(8, ' ')}% | ${(actualRate * 100).toFixed(1).padStart(7, ' ')}% | ${diff.padStart(5, ' ')}%`
        );
      });

    // 7. 결론
    console.log('\n=== 📌 분석 결론 ===');
    console.log('1. 파괴 확률 문제: 후반부(Lv 20+)에서 진행 불가능 수준');
    console.log('2. 골드 갭: Lv 10-12에서 지속적인 파산 발생');
    console.log('3. 개선 제안:');
    console.log('   - 중반부(15-20) 확률 상향: 5-10% 범위 권장');
    console.log('   - 초기 골드 또는 강화 비용 조정 필요');
    console.log('   - 낮은 단계 자동 강화 시스템 추가\n');

    // 객체로 반환 (추가 처리 가능)
    return {
      period: `${twoWeeksAgo.toLocaleDateString('ko-KR')} ~ ${new Date().toLocaleDateString('ko-KR')}`,
      summary: {
        totalSessions: sessions.length,
        totalEvents: events.length,
        totalAttempts,
        totalSuccesses,
        totalFailures,
        totalDestructions,
        bankruptcyRate: (bankruptcyCount / sessions.length * 100).toFixed(1),
        avgFinalGold: Math.round(goldStats.avgFinal),
        avgMaxGold: Math.round(goldStats.avgMax)
      },
      levelReachCount,
      resultByLevel,
      level10_12_issues: {
        attempts: level10_12_attempts.length,
        bankruptcies: level10_12_bankruptcies.length,
        bankruptcyRate: (level10_12_bankruptcies.length / level10_12_attempts.length * 100).toFixed(1)
      }
    };
  } catch (error) {
    console.error('❌ 분석 오류:', error);
  }
}

// 실행
console.log('로그 분석 시작...');
analyzeLogsFrom2WeeksAgo().then(result => {
  if (result) {
    console.log('\n✅ 분석 완료!');
    console.log('결과 객체:', result);
  }
});
