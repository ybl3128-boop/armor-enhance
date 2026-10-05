import XLSX from 'xlsx';
import { query } from '../db.js';

export async function generateExcelExport() {
  // 이벤트 데이터 수집
  const eventsResult = await query(`
    SELECT 
      e.event_id,
      e.user_id,
      e.session_id,
      e.event_type,
      e.timestamp,
      e.payload,
      s.started_at as session_started,
      s.ended_at as session_ended,
      s.duration_seconds,
      s.final_level,
      s.final_gold,
      s.destruction_count,
      s.max_gold_during_session,
      s.is_bankrupt
    FROM events e
    LEFT JOIN sessions s ON e.session_id = s.session_id
    ORDER BY e.timestamp DESC
  `);

  // 세션 통계
  const sessionsResult = await query(`
    SELECT 
      s.session_id,
      s.user_id,
      s.started_at,
      s.ended_at,
      s.duration_seconds,
      s.final_level,
      s.final_gold,
      s.destruction_count,
      s.max_gold_during_session,
      s.is_bankrupt,
      u.total_sessions,
      u.first_seen_at
    FROM sessions s
    JOIN users u ON s.user_id = u.user_id
    ORDER BY s.started_at DESC
  `);

  // 사용자 통계
  const usersResult = await query(`
    SELECT 
      u.user_id,
      u.first_seen_at,
      u.last_seen_at,
      u.total_sessions,
      COUNT(s.session_id) as confirmed_sessions,
      MAX(s.final_level) as max_level_achieved,
      AVG(s.final_level) as avg_level,
      SUM(s.destruction_count) as total_destructions,
      COUNT(CASE WHEN s.is_bankrupt THEN 1 END) as bankruptcy_count
    FROM users u
    LEFT JOIN sessions s ON u.user_id = s.user_id
    GROUP BY u.user_id, u.first_seen_at, u.last_seen_at, u.total_sessions
    ORDER BY u.first_seen_at DESC
  `);

  // 요약 통계
  const summaryResult = await query(`
    SELECT 
      COUNT(DISTINCT u.user_id) as total_users,
      COUNT(DISTINCT s.session_id) as total_sessions,
      COUNT(e.event_id) as total_events,
      COUNT(CASE WHEN s.final_level >= 20 THEN 1 END) as legendary_clears,
      AVG(s.final_level) as avg_final_level,
      MAX(s.final_level) as max_final_level,
      SUM(s.destruction_count) as total_destructions,
      COUNT(CASE WHEN s.is_bankrupt THEN 1 END) as total_bankruptcies
    FROM users u
    LEFT JOIN sessions s ON u.user_id = s.user_id
    LEFT JOIN events e ON s.session_id = e.session_id
  `);

  // 워크북 생성
  const workbook = XLSX.utils.book_new();

  // 1. 이벤트 시트
  const eventsData = eventsResult.rows.map(row => ({
    '이벤트ID': row.event_id,
    '사용자ID': row.user_id,
    '세션ID': row.session_id,
    '이벤트타입': row.event_type,
    '발생시간': row.timestamp,
    '세션시작': row.session_started,
    '세션종료': row.session_ended,
    '지속시간(초)': row.duration_seconds,
    '최종단계': row.final_level,
    '최종골드': row.final_gold,
    '파괴횟수': row.destruction_count,
    '세션최대골드': row.max_gold_during_session,
    '파산여부': row.is_bankrupt ? '예' : '아니오',
    '페이로드': JSON.stringify(row.payload)
  }));
  const eventsSheet = XLSX.utils.json_to_sheet(eventsData);
  XLSX.utils.book_append_sheet(workbook, eventsSheet, '이벤트');

  // 2. 세션 시트
  const sessionsData = sessionsResult.rows.map(row => ({
    '세션ID': row.session_id,
    '사용자ID': row.user_id,
    '세션시작': row.started_at,
    '세션종료': row.ended_at,
    '지속시간(초)': row.duration_seconds,
    '최종단계': row.final_level,
    '최종골드': row.final_gold,
    '파괴횟수': row.destruction_count,
    '세션최대골드': row.max_gold_during_session,
    '파산여부': row.is_bankrupt ? '예' : '아니오',
    '사용자총세션': row.total_sessions,
    '첫방문': row.first_seen_at
  }));
  const sessionsSheet = XLSX.utils.json_to_sheet(sessionsData);
  XLSX.utils.book_append_sheet(workbook, sessionsSheet, '세션');

  // 3. 사용자 시트
  const usersData = usersResult.rows.map(row => ({
    '사용자ID': row.user_id,
    '첫방문': row.first_seen_at,
    '마지막방문': row.last_seen_at,
    '총세션': row.total_sessions,
    '확인된세션': row.confirmed_sessions,
    '최대단계': row.max_level_achieved,
    '평균단계': row.avg_level ? row.avg_level.toFixed(2) : 0,
    '총파괴횟수': row.total_destructions || 0,
    '파산횟수': row.bankruptcy_count || 0
  }));
  const usersSheet = XLSX.utils.json_to_sheet(usersData);
  XLSX.utils.book_append_sheet(workbook, usersSheet, '사용자');

  // 4. 요약 시트
  const summaryData = [{
    '항목': '총 사용자 수',
    '값': summaryResult.rows[0].total_users
  }, {
    '항목': '총 세션 수',
    '값': summaryResult.rows[0].total_sessions
  }, {
    '항목': '총 이벤트 수',
    '값': summaryResult.rows[0].total_events
  }, {
    '항목': '+20 달성 횟수',
    '값': summaryResult.rows[0].legendary_clears || 0
  }, {
    '항목': '평균 최종 단계',
    '값': summaryResult.rows[0].avg_final_level ? summaryResult.rows[0].avg_final_level.toFixed(2) : 0
  }, {
    '항목': '최대 달성 단계',
    '값': summaryResult.rows[0].max_final_level || 0
  }, {
    '항목': '총 파괴 횟수',
    '값': summaryResult.rows[0].total_destructions || 0
  }, {
    '항목': '총 파산 횟수',
    '값': summaryResult.rows[0].total_bankruptcies || 0
  }];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, '요약');

  return workbook;
}

export async function generateUserExcel(userId) {
  // 특정 사용자의 세션 및 이벤트 데이터만 수집
  const sessionsResult = await query(`
    SELECT 
      session_id,
      started_at,
      ended_at,
      duration_seconds,
      final_level,
      final_gold,
      destruction_count,
      max_gold_during_session,
      is_bankrupt
    FROM sessions 
    WHERE user_id = $1
    ORDER BY started_at DESC
  `, [userId]);

  const eventsResult = await query(`
    SELECT 
      event_id,
      session_id,
      event_type,
      timestamp,
      payload
    FROM events 
    WHERE user_id = $1
    ORDER BY timestamp ASC
  `, [userId]);

  const workbook = XLSX.utils.book_new();

  // 세션 시트
  const sessionsData = sessionsResult.rows.map(row => ({
    '세션ID': row.session_id,
    '시작': row.started_at,
    '종료': row.ended_at,
    '지속시간(초)': row.duration_seconds,
    '최종단계': row.final_level,
    '최종골드': row.final_gold,
    '파괴횟수': row.destruction_count,
    '세션최대골드': row.max_gold_during_session,
    '파산': row.is_bankrupt ? '예' : '아니오'
  }));
  const sessionsSheet = XLSX.utils.json_to_sheet(sessionsData);
  XLSX.utils.book_append_sheet(workbook, sessionsSheet, '세션');

  // 이벤트 시트
  const eventsData = eventsResult.rows.map(row => ({
    '이벤트ID': row.event_id,
    '세션ID': row.session_id,
    '이벤트타입': row.event_type,
    '발생시간': row.timestamp,
    '데이터': JSON.stringify(row.payload)
  }));
  const eventsSheet = XLSX.utils.json_to_sheet(eventsData);
  XLSX.utils.book_append_sheet(workbook, eventsSheet, '이벤트');

  return workbook;
}
