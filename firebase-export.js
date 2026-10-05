import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import * as XLSX from 'xlsx';

/**
 * Firestore에서 모든 데이터를 조회
 */
export async function fetchAllData() {
  try {
    // 사용자 데이터
    const usersSnap = await getDocs(collection(db, 'users'));
    const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 세션 데이터
    const sessionsSnap = await getDocs(
      query(collection(db, 'sessions'), orderBy('startedAt', 'desc'))
    );
    const sessions = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 이벤트 데이터
    const eventsSnap = await getDocs(
      query(collection(db, 'events'), orderBy('timestamp', 'desc'))
    );
    const events = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return { users, sessions, events };
  } catch (err) {
    console.error('데이터 조회 오류:', err);
    throw err;
  }
}

/**
 * CSV 형식으로 내보내기
 */
export async function exportAsCSV() {
  try {
    const { users, sessions, events } = await fetchAllData();

    // CSV 헤더
    let csv = '항목,구분,개수,세부내용\n';

    csv += `총 사용자,users,${users.length},\n`;
    csv += `총 세션,sessions,${sessions.length},\n`;
    csv += `총 이벤트,events,${events.length},\n`;

    const legendaryClears = sessions.filter(s => s.finalLevel >= 20).length;
    csv += `+20 달성,legendary,${legendaryClears},\n`;

    // 상세 데이터 시트
    csv += '\n\n=== 사용자 ===\n';
    csv += '사용자ID,첫방문,마지막방문,총세션,최고단계,총파괴,파산횟수\n';
    users.forEach(user => {
      csv += `${user.id},${formatDate(user.firstSeenAt)},${formatDate(user.lastSeenAt)},${user.totalSessions},${user.highestLevel || 0},${user.totalDestructions || 0},${user.totalBankruptcies || 0}\n`;
    });

    csv += '\n\n=== 세션 ===\n';
    csv += '세션ID,사용자ID,시작시간,종료시간,지속시간(초),최종단계,최종골드,파괴,최대골드,파산\n';
    sessions.forEach(session => {
      csv += `${session.id},${session.userId},${formatDate(session.startedAt)},${formatDate(session.endedAt)},${session.durationSeconds || 0},${session.finalLevel},${session.finalGold},${session.destructionCount},${session.maxGoldDuringSession},${session.isBankrupt ? 'Y' : 'N'}\n`;
    });

    return csv;
  } catch (err) {
    console.error('CSV 내보내기 오류:', err);
    throw err;
  }
}

/**
 * Excel 형식으로 내보내기
 */
export async function exportAsExcel() {
  try {
    const { users, sessions, events } = await fetchAllData();

    const workbook = XLSX.utils.book_new();

    // 요약 시트
    const summaryData = [{
      항목: '총 사용자',
      값: users.length
    }, {
      항목: '총 세션',
      값: sessions.length
    }, {
      항목: '총 이벤트',
      값: events.length
    }, {
      항목: '+20 달성',
      값: sessions.filter(s => s.finalLevel >= 20).length
    }, {
      항목: '평균 세션 시간(초)',
      값: Math.round(sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) / sessions.length)
    }, {
      항목: '평균 최종 단계',
      값: (sessions.reduce((sum, s) => sum + (s.finalLevel || 0), 0) / sessions.length).toFixed(2)
    }, {
      항목: '총 파산',
      값: sessions.filter(s => s.isBankrupt).length
    }];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, '요약');

    // 사용자 시트
    const usersData = users.map(u => ({
      '사용자ID': u.id,
      '첫방문': formatDate(u.firstSeenAt),
      '마지막방문': formatDate(u.lastSeenAt),
      '총세션': u.totalSessions || 0,
      '최고단계': u.highestLevel || 0,
      '총파괴': u.totalDestructions || 0,
      '파산횟수': u.totalBankruptcies || 0,
      '+20달성': u.legendaryClearsCount || 0
    }));
    const usersSheet = XLSX.utils.json_to_sheet(usersData);
    XLSX.utils.book_append_sheet(workbook, usersSheet, '사용자');

    // 세션 시트
    const sessionsData = sessions.map(s => ({
      '세션ID': s.id,
      '사용자ID': s.userId,
      '시작': formatDate(s.startedAt),
      '종료': formatDate(s.endedAt),
      '지속(초)': s.durationSeconds || 0,
      '최종단계': s.finalLevel,
      '최종골드': s.finalGold,
      '파괴': s.destructionCount,
      '최대골드': s.maxGoldDuringSession,
      '파산': s.isBankrupt ? 'Y' : 'N'
    }));
    const sessionsSheet = XLSX.utils.json_to_sheet(sessionsData);
    XLSX.utils.book_append_sheet(workbook, sessionsSheet, '세션');

    // 이벤트 시트 (최근 1000개만)
    const recentEvents = events.slice(0, 1000);
    const eventsData = recentEvents.map(e => ({
      '이벤트ID': e.eventId,
      '사용자ID': e.userId,
      '세션ID': e.sessionId,
      '타입': e.eventType,
      '시간': formatDate(e.timestamp),
      '데이터': JSON.stringify(e.payload).substring(0, 100)
    }));
    const eventsSheet = XLSX.utils.json_to_sheet(eventsData);
    XLSX.utils.book_append_sheet(workbook, eventsSheet, '이벤트');

    return workbook;
  } catch (err) {
    console.error('Excel 내보내기 오류:', err);
    throw err;
  }
}

/**
 * 날짜 포맷팅
 */
function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('ko-KR');
}

/**
 * JSON으로 내보내기
 */
export async function exportAsJSON() {
  try {
    const data = await fetchAllData();
    return JSON.stringify(data, null, 2);
  } catch (err) {
    console.error('JSON 내보내기 오류:', err);
    throw err;
  }
}

/**
 * 파일로 다운로드
 */
export async function downloadExcel() {
  try {
    const workbook = await exportAsExcel();
    const filename = `armor-enhance-logs-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
    console.log('✅ Excel 파일 다운로드:', filename);
  } catch (err) {
    console.error('❌ 다운로드 오류:', err);
    alert('데이터 내보내기에 실패했습니다: ' + err.message);
  }
}

export async function downloadCSV() {
  try {
    const csv = await exportAsCSV();
    const filename = `armor-enhance-logs-${new Date().toISOString().split('T')[0]}.csv`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    console.log('✅ CSV 파일 다운로드:', filename);
  } catch (err) {
    console.error('❌ 다운로드 오류:', err);
    alert('데이터 내보내기에 실패했습니다: ' + err.message);
  }
}

export async function downloadJSON() {
  try {
    const json = await exportAsJSON();
    const filename = `armor-enhance-logs-${new Date().toISOString().split('T')[0]}.json`;
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    console.log('✅ JSON 파일 다운로드:', filename);
  } catch (err) {
    console.error('❌ 다운로드 오류:', err);
    alert('데이터 내보내기에 실패했습니다: ' + err.message);
  }
}
