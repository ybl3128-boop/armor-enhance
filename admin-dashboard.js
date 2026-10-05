import { downloadExcel, downloadCSV, downloadJSON, fetchAllData } from './firebase-export.js';

// 상태 메시지 표시
function showStatus(elementId, message, type = 'info') {
  const el = document.getElementById(elementId);
  el.textContent = message;
  el.className = `status visible ${type}`;
  if (type !== 'loading') {
    setTimeout(() => el.classList.remove('visible'), 5000);
  }
}

// 데이터 새로고침
async function refreshData() {
  try {
    showStatus('refresh-status', '데이터 로드 중...', 'loading');
    const data = await fetchAllData();
    
    // 통계 업데이트
    const stats = document.querySelectorAll('.stat-value');
    const legendaryClears = data.sessions.filter(s => s.finalLevel >= 20).length;
    
    stats[0].textContent = data.users.length.toLocaleString();
    stats[1].textContent = data.sessions.length.toLocaleString();
    stats[2].textContent = data.events.length.toLocaleString();
    stats[3].textContent = legendaryClears.toLocaleString();

    // 테이블 업데이트 (최근 20개)
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    
    const recentSessions = data.sessions.slice(0, 20);
    recentSessions.forEach(session => {
      const row = tbody.insertRow();
      const startDate = session.startedAt.toDate ? session.startedAt.toDate() : new Date(session.startedAt);
      const status = session.isBankrupt ? '파산' : session.finalLevel >= 20 ? '전설' : '진행중';
      
      row.innerHTML = `
        <td>${session.id.substring(0, 12)}...</td>
        <td>${session.userId.substring(0, 12)}...</td>
        <td>${startDate.toLocaleString('ko-KR').substring(0, 16)}</td>
        <td>+${session.finalLevel}</td>
        <td>${session.finalGold?.toLocaleString() || '0'}</td>
        <td>${session.destructionCount || 0}</td>
        <td>${status}</td>
      `;
    });

    showStatus('refresh-status', '✅ 데이터 업데이트 완료', 'success');
  } catch (err) {
    console.error('데이터 로드 오류:', err);
    showStatus('refresh-status', '❌ 데이터 로드 실패: ' + err.message, 'error');
  }
}

// 버튼 이벤트 리스너
document.getElementById('btn-export-excel').addEventListener('click', async () => {
  showStatus('export-status', 'Excel 파일 준비 중...', 'loading');
  await downloadExcel();
  showStatus('export-status', '✅ Excel 다운로드 완료', 'success');
});

document.getElementById('btn-export-csv').addEventListener('click', async () => {
  showStatus('export-status', 'CSV 파일 준비 중...', 'loading');
  await downloadCSV();
  showStatus('export-status', '✅ CSV 다운로드 완료', 'success');
});

document.getElementById('btn-export-json').addEventListener('click', async () => {
  showStatus('export-status', 'JSON 파일 준비 중...', 'loading');
  await downloadJSON();
  showStatus('export-status', '✅ JSON 다운로드 완료', 'success');
});

document.getElementById('btn-refresh').addEventListener('click', refreshData);

// 초기 데이터 로드
refreshData();
