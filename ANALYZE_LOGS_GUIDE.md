# 🔍 Firebase 로그 분석 가이드

## 방법 1: log-analyzer.html 사용 (추천)

1. **파일 열기**
   ```
   log-analyzer.html 브라우저에서 열기
   https://localhost:5173/log-analyzer.html (또는 Firebase Hosting에 배포)
   ```

2. **분석 시작**
   - "📊 분석 시작" 버튼 클릭
   - 지난 2주간의 게임 데이터 자동 분석

3. **결과 다운로드**
   - "📥 결과 다운로드" 버튼으로 JSON 파일 저장

---

## 방법 2: 브라우저 콘솔에서 직접 실행

### 단계 1: 게임 페이지 또는 admin-dashboard 열기
- https://armor-enhance.web.app 또는
- admin-dashboard.html 페이지 접속

### 단계 2: 브라우저 콘솔 열기
- **Chrome/Edge**: `F12` 또는 `Ctrl+Shift+I` → Console 탭
- **Firefox**: `F12` → Console 탭
- **Safari**: `Cmd+Option+I` → Console 탭

### 단계 3: 아래 스크립트 복사 후 콘솔에 붙여넣기

```javascript
async function analyzeLogsFrom2WeeksAgo() {
  console.log('🔍 Firebase 로그 분석 시작...\n');

  if (typeof firebase === 'undefined') {
    console.error('❌ Firebase가 로드되지 않았습니다.');
    return;
  }

  try {
    const db = firebase.firestore();
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    twoWeeksAgo.setHours(0, 0, 0, 0);

    console.log(`📅 기간: ${twoWeeksAgo.toLocaleDateString('ko-KR')} ~ 현재\n`);

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

    console.log(`📊 세션: ${sessions.length}개, 이벤트: ${events.length}개\n`);

    // 통계 계산
    let stats = {
      attempts: 0,
      successes: 0,
      failures: 0,
      destructions: 0,
      bankruptcies: 0,
      levelReach: {}
    };

    let reinforceByLevel = {};

    sessions.forEach(s => {
      stats.attempts += s.sessionAttempts || 0;
      stats.successes += s.sessionSuccesses || 0;
      stats.failures += s.sessionFailures || 0;
      stats.destructions += s.destructionCount || 0;
      if (s.isBankrupt) stats.bankruptcies++;

      const level = s.highestLevel || 0;
      if (!stats.levelReach[level]) stats.levelReach[level] = 0;
      stats.levelReach[level]++;
    });

    events.filter(e => e.eventType === 'reinforce_result').forEach(e => {
      const level = e.payload?.beforeLevel;
      if (level === undefined) return;

      if (!reinforceByLevel[level]) {
        reinforceByLevel[level] = { success: 0, failure: 0, destruction: 0 };
      }

      const result = e.payload?.result;
      if (result === 'success') reinforceByLevel[level].success++;
      else if (result === 'failure_kept') reinforceByLevel[level].failure++;
      else if (result?.includes('destruction')) reinforceByLevel[level].destruction++;
    });

    // 출력
    console.log('=== 📊 기본 통계 ===');
    console.log(`총 강화 시도: ${stats.attempts}회`);
    console.log(`성공: ${stats.successes}회 (${(stats.successes / stats.attempts * 100).toFixed(1)}%)`);
    console.log(`실패: ${stats.failures}회`);
    console.log(`파괴: ${stats.destructions}회`);
    console.log(`파산: ${stats.bankruptcies}회 (${(stats.bankruptcies / sessions.length * 100).toFixed(1)}%)\n`);

    console.log('=== 🎯 도달 레벨 분포 ===');
    Object.keys(stats.levelReach)
      .map(Number)
      .sort((a, b) => b - a)
      .forEach(level => {
        const count = stats.levelReach[level];
        console.log(`+${level}: ${count}회 (${(count / sessions.length * 100).toFixed(1)}%)`);
      });

    console.log('\n=== 📊 레벨별 강화 성공률 ===');
    console.table(
      Object.keys(reinforceByLevel)
        .map(Number)
        .sort((a, b) => a - b)
        .filter(level => {
          const total = reinforceByLevel[level].success + reinforceByLevel[level].failure + reinforceByLevel[level].destruction;
          return total >= 3;
        })
        .map(level => ({
          레벨: `+${level}`,
          성공: reinforceByLevel[level].success,
          실패: reinforceByLevel[level].failure,
          파괴: reinforceByLevel[level].destruction,
          합계: reinforceByLevel[level].success + reinforceByLevel[level].failure + reinforceByLevel[level].destruction,
          성공률: `${(reinforceByLevel[level].success / (reinforceByLevel[level].success + reinforceByLevel[level].failure + reinforceByLevel[level].destruction) * 100).toFixed(1)}%`
        }))
    );

    // Lv 10-12 분석
    const level10_12 = events.filter(e => e.eventType === 'bankruptcy' && e.payload?.level >= 10 && e.payload?.level <= 12);
    console.log(`\n⚠️ Lv 10-12 파산 발생: ${level10_12.length}회`);

    console.log('\n✅ 분석 완료!');

    return { stats, reinforceByLevel };
  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

// 실행
analyzeLogsFrom2WeeksAgo();
```

### 단계 4: Enter 키 누르기
- 분석 결과가 콘솔에 출력됨
- 표로 정리된 레벨별 통계 확인 가능

---

## 📊 분석 결과 해석

### 주요 지표

| 항목 | 의미 | 목표 |
|------|------|------|
| 성공률 | 강화 성공 비율 (%) | 낮은 단계는 높음, 높은 단계는 낮음 |
| 파괴율 | 강화 시 파괴 비율 (%) | 중요한 단계에서는 낮아야 함 |
| 파산율 | 골드 부족으로 진행 불가 비율 (%) | 낮을수록 좋음 |
| 도달 레벨 | 플레이어가 도달한 최고 레벨 분포 | 고르게 분포 권장 |

### 예상되는 문제점

1. **Lv 10-12 파산 집중**
   - 원인: 강화 비용 증가 vs 골드 수익 부족
   - 해결: 초기 골드 증가 또는 강화 비용 조정

2. **Lv 20+ 극저확률**
   - 원인: 파괴율이 높고 성공률이 낮음
   - 해결: 후반부 확률 상향 조정

3. **낮은 단계 반복 클릭**
   - 원인: 낮은 단계는 높은 확률이지만 클릭 피로
   - 해결: 자동 강화 또는 배치 강화 기능 추가

---

## 💾 로그 저장 방법

콘솔에서 결과를 JSON으로 저장하려면:

```javascript
// 위 분석 결과를 변수에 저장
const result = await analyzeLogsFrom2WeeksAgo();

// JSON으로 다운로드
const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `analysis-${new Date().toISOString().split('T')[0]}.json`;
a.click();
```
