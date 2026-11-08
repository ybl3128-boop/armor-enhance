// Firebase 초기화
firebase.initializeApp({
  apiKey: 'AIzaSyBrANfqNFZfcuIFQxmOqAwfOatuPClCh4A',
  authDomain: 'armor-enhance.firebaseapp.com',
  projectId: 'armor-enhance',
  storageBucket: 'armor-enhance.appspot.com',
  messagingSenderId: '433425827481',
  appId: '1:433425827481:web:bfbed6c1bb0f523ddf9a08'
});

const db = firebase.firestore();
let analysisResult = null;

function showStatus(message, type = 'info') {
  const el = document.getElementById('status');
  el.textContent = message;
  el.className = `status visible ${type}`;
}

function clearStatus() {
  const el = document.getElementById('status');
  el.classList.remove('visible');
}

function showContent(text) {
  document.getElementById('output').textContent = text;
  document.getElementById('content').classList.add('visible');
  clearStatus();
}

async function analyzeGames() {
  showStatus('분석 중...', 'loading');

  try {
    // 2주 전
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    twoWeeksAgo.setHours(0, 0, 0, 0);

    // 세션 조회
    const sessionsSnap = await db
      .collection('sessions')
      .where('startedAt', '>=', twoWeeksAgo)
      .orderBy('startedAt', 'desc')
      .get();

    const sessions = sessionsSnap.docs.map(doc => doc.data());

    // 이벤트 조회
    const eventsSnap = await db
      .collection('events')
      .where('timestamp', '>=', twoWeeksAgo)
      .orderBy('timestamp', 'desc')
      .limit(5000)
      .get();

    const events = eventsSnap.docs.map(doc => doc.data());

    // 통계 계산
    let stats = {
      sessions: sessions.length,
      events: events.length,
      totalAttempts: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalDestructions: 0,
      bankruptcies: 0,
      levels: {}
    };

    let reinforceByLevel = {};
    let level10_12Attempts = 0;
    let level10_12Bankruptcies = 0;

    sessions.forEach(s => {
      stats.totalAttempts += s.sessionAttempts || 0;
      stats.totalSuccesses += s.sessionSuccesses || 0;
      stats.totalFailures += s.sessionFailures || 0;
      stats.totalDestructions += s.destructionCount || 0;
      if (s.isBankrupt) stats.bankruptcies++;

      const level = s.highestLevel || 0;
      if (!stats.levels[level]) stats.levels[level] = 0;
      stats.levels[level]++;
    });

    // 레벨별 강화 결과
    events.filter(e => e.eventType === 'reinforce_result').forEach(e => {
      const level = e.payload?.beforeLevel;
      if (level === undefined) return;

      if (level >= 10 && level <= 12) level10_12Attempts++;

      if (!reinforceByLevel[level]) {
        reinforceByLevel[level] = { success: 0, failure: 0, destruction: 0 };
      }
      const result = e.payload?.result;
      if (result === 'success') reinforceByLevel[level].success++;
      else if (result === 'failure_kept') reinforceByLevel[level].failure++;
      else if (result?.includes('destruction')) reinforceByLevel[level].destruction++;
    });

    // 10-12 레벨 파산
    events.filter(e => e.eventType === 'bankruptcy').forEach(e => {
      const level = e.payload?.level;
      if (level >= 10 && level <= 12) level10_12Bankruptcies++;
    });

    // 결과 생성
    let output = `📊 분석 기간: ${twoWeeksAgo.toLocaleDateString('ko-KR')} ~ 현재\n\n`;

    output += `=== 기본 통계 ===\n`;
    output += `총 세션: ${stats.sessions}개\n`;
    output += `총 강화 시도: ${stats.totalAttempts}회\n`;
    output += `성공: ${stats.totalSuccesses}회 (${(stats.totalSuccesses / stats.totalAttempts * 100).toFixed(1)}%)\n`;
    output += `실패: ${stats.totalFailures}회\n`;
    output += `파괴: ${stats.totalDestructions}회\n`;
    output += `파산: ${stats.bankruptcies}회 (${(stats.bankruptcies / stats.sessions * 100).toFixed(1)}%)\n\n`;

    output += `=== 도달 레벨 분포 ===\n`;
    Object.keys(stats.levels)
      .map(Number)
      .sort((a, b) => b - a)
      .forEach(level => {
        const count = stats.levels[level];
        const pct = (count / stats.sessions * 100).toFixed(1);
        output += `+${level}: ${count}회 (${pct}%)\n`;
      });

    output += `\n=== 레벨별 강화 성공률 (시도 5회 이상) ===\n`;
    output += `Lv. | 성공 | 실패 | 파괴 | 합계 | 성공률\n`;
    output += `---+------+------+------+-----+-------\n`;

    Object.keys(reinforceByLevel)
      .map(Number)
      .sort((a, b) => a - b)
      .filter(level => {
        const total = reinforceByLevel[level].success + reinforceByLevel[level].failure + reinforceByLevel[level].destruction;
        return total >= 5;
      })
      .forEach(level => {
        const data = reinforceByLevel[level];
        const total = data.success + data.failure + data.destruction;
        const successRate = (data.success / total * 100).toFixed(1);
        output += `+${String(level).padStart(2, ' ')} | ${data.success.toString().padStart(4, ' ')} | ${data.failure.toString().padStart(4, ' ')} | ${data.destruction.toString().padStart(4, ' ')} | ${total.toString().padStart(4, ' ')} | ${successRate.padStart(5, ' ')}%\n`;
      });

    output += `\n⚠️ 문제 구간 (Lv 10-12): ${level10_12Attempts}회 시도 중 ${level10_12Bankruptcies}회 파산`;

    analysisResult = { stats, reinforceByLevel, period: twoWeeksAgo.toLocaleDateString('ko-KR'), level10_12: { attempts: level10_12Attempts, bankruptcies: level10_12Bankruptcies } };
    showContent(output);
  } catch (err) {
    showStatus(`❌ 오류: ${err.message}`, 'error');
    console.error(err);
  }
}

function downloadResult() {
  if (!analysisResult) {
    showStatus('먼저 분석을 실행해주세요.', 'error');
    return;
  }

  const json = JSON.stringify(analysisResult, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `log-analysis-${new Date().toISOString().split('T')[0]}.json`;
  a.click();

  showStatus('✅ 파일 다운로드 완료', 'success');
}

// 이벤트 리스너
document.getElementById('btn-analyze').addEventListener('click', analyzeGames);
document.getElementById('btn-download').addEventListener('click', downloadResult);
