import { db } from './firebase-config.js';
import { 
  collection, 
  addDoc, 
  setDoc, 
  doc, 
  Timestamp,
  writeBatch,
  increment,
  updateDoc
} from 'firebase/firestore';

/**
 * IP 기반 사용자 ID 생성 (클라이언트에서는 브라우저 지문 사용)
 */
export function generateUserFingerprint() {
  const navigator_data = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.width + 'x' + screen.height,
    screen.colorDepth
  ].join('|');

  let hash = 0;
  for (let i = 0; i < navigator_data.length; i++) {
    const char = navigator_data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return 'user_' + Math.abs(hash).toString(16);
}

/**
 * 사용자 등록 또는 업데이트
 */
export async function registerOrUpdateUser(userId, fingerprint) {
  try {
    const userRef = doc(db, 'users', userId);
    const now = Timestamp.now();

    await setDoc(userRef, {
      firstSeenAt: now,
      lastSeenAt: now,
      totalSessions: 0,
      fingerprint: fingerprint,
      userAgent: navigator.userAgent,
      highestLevel: 0,
      totalDestructions: 0,
      totalBankruptcies: 0,
      legendaryClearsCount: 0
    }, { merge: true });

    return userId;
  } catch (err) {
    console.error('❌ Error registering user:', err);
    throw err;
  }
}

/**
 * 세션 시작 기록
 */
export async function startSession(userId, sessionId) {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);

    await setDoc(sessionRef, {
      userId: userId,
      startedAt: Timestamp.now(),
      finalLevel: 0,
      finalGold: 0,
      destructionCount: 0,
      maxGoldDuringSession: 0,
      isBankrupt: false,
      isCompleted: false
    });

    console.log('✅ Session started:', sessionId);
    return sessionId;
  } catch (err) {
    console.error('❌ Error starting session:', err);
    throw err;
  }
}

/**
 * 이벤트 로그 저장
 */
export async function logEvent(userId, sessionId, eventType, payload = {}) {
  try {
    const eventRef = collection(db, 'events');

    await addDoc(eventRef, {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId,
      sessionId: sessionId,
      eventType: eventType,
      timestamp: Timestamp.now(),
      payload: payload
    });

    // 콘솔에 로그 (개발용)
    if (import.meta.env.DEV) {
      console.log(`📝 Event logged: ${eventType}`, payload);
    }
  } catch (err) {
    console.error('❌ Error logging event:', err);
    // 로그 실패는 게임을 중단하지 않음
  }
}

/**
 * 배치 이벤트 저장 (여러 이벤트를 한 번에)
 */
export async function batchLogEvents(userId, sessionId, events = []) {
  try {
    const batch = writeBatch(db);
    const eventsRef = collection(db, 'events');

    events.forEach((event) => {
      const docRef = doc(eventsRef);
      batch.set(docRef, {
        eventId: event.eventId || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: userId,
        sessionId: sessionId,
        eventType: event.type,
        timestamp: Timestamp.fromDate(new Date(event.timestamp)),
        payload: event.payload || {}
      });
    });

    await batch.commit();
    console.log(`✅ Batch logged ${events.length} events`);
  } catch (err) {
    console.error('❌ Error batch logging events:', err);
  }
}

/**
 * 세션 종료 기록 및 통계 업데이트
 */
export async function endSession(userId, sessionId, sessionData = {}) {
  try {
    const batch = writeBatch(db);
    const now = Timestamp.now();

    // 1. 세션 종료 정보 저장
    const sessionRef = doc(db, 'sessions', sessionId);
    batch.update(sessionRef, {
      endedAt: now,
      finalLevel: sessionData.finalLevel || 0,
      finalGold: sessionData.finalGold || 0,
      destructionCount: sessionData.destructionCount || 0,
      maxGoldDuringSession: sessionData.maxGoldDuringSession || 0,
      isBankrupt: sessionData.isBankrupt || false,
      isCompleted: true,
      durationSeconds: Math.floor((now.toDate() - sessionData.startTime) / 1000)
    });

    // 2. 사용자 통계 업데이트
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {
      lastSeenAt: now,
      totalSessions: increment(1),
      highestLevel: Math.max(sessionData.finalLevel || 0, 0), // 실제로는 기존값과 비교 필요
      totalDestructions: increment(sessionData.destructionCount || 0),
      totalBankruptcies: increment(sessionData.isBankrupt ? 1 : 0),
      legendaryClearsCount: increment(sessionData.finalLevel >= 20 ? 1 : 0)
    });

    await batch.commit();
    console.log('✅ Session ended:', sessionId);
  } catch (err) {
    console.error('❌ Error ending session:', err);
  }
}

/**
 * 세션 데이터 부분 업데이트 (게임 진행 중 실시간 업데이트)
 */
export async function updateSessionStats(sessionId, stats = {}) {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    
    const updates = {};
    if (stats.finalLevel !== undefined) updates.finalLevel = stats.finalLevel;
    if (stats.finalGold !== undefined) updates.finalGold = stats.finalGold;
    if (stats.maxGoldDuringSession !== undefined) updates.maxGoldDuringSession = stats.maxGoldDuringSession;
    if (stats.destructionCount !== undefined) updates.destructionCount = stats.destructionCount;

    if (Object.keys(updates).length > 0) {
      await updateDoc(sessionRef, updates);
    }
  } catch (err) {
    console.error('❌ Error updating session stats:', err);
  }
}
