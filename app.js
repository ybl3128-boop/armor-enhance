const TEST_MODE = new URLSearchParams(window.location.search).get("test") === "1";
const MAIN_STORAGE_KEY = "armor-enhance-state-v1";
const TEST_STORAGE_KEY = "armor-enhance-test-state-v1";
const STORAGE_KEY = TEST_MODE ? TEST_STORAGE_KEY : MAIN_STORAGE_KEY;
// ============================================
// FIREBASE 로깅 (CDN firebase-*-compat.js 전역 객체 사용, import 없음)
// ============================================
let fbDb = null;

function initFirebaseLogging() {
  if (TEST_MODE) {
    console.info("테스트 모드: Firebase 로그를 전송하지 않습니다.");
    return;
  }
  if (typeof firebase === "undefined") {
    console.warn("⚠️ Firebase SDK가 로드되지 않았습니다.");
    return;
  }
  try {
    firebase.initializeApp({
      apiKey: "AIzaSyBrANfqNFZfcuIFQxmOqAwfOatuPClCh4A",
      authDomain: "armor-enhance.firebaseapp.com",
      projectId: "armor-enhance",
      storageBucket: "armor-enhance.appspot.com",
      messagingSenderId: "433425827481",
      appId: "1:433425827481:web:bfbed6c1bb0f523ddf9a08"
    });
    fbDb = firebase.firestore();
    console.log("✅ Firebase 초기화 완료");
  } catch (err) {
    console.error("❌ Firebase 초기화 실패:", err);
    fbDb = null;
  }
}
initFirebaseLogging();

function fbSafeCall(promise) {
  if (!promise || typeof promise.catch !== "function") return;
  promise.catch((err) => console.warn("Firebase 저장 실패:", err));
}

function fbLogEvent(eventType, payload) {
  if (!fbDb || TEST_MODE) return;
  fbSafeCall(
    fbDb.collection("events").add({
      sessionId,
      playerId: state?.playerId ?? "unknown",
      eventType,
      payload,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
  );
}

function fbStartSession() {
  if (!fbDb || TEST_MODE) return;
  fbSafeCall(
    fbDb.collection("sessions").doc(sessionId).set({
      playerId: state?.playerId ?? "unknown",
      startedAt: firebase.firestore.FieldValue.serverTimestamp(),
      userAgent: navigator.userAgent
    })
  );
}

function fbEndSession(summary) {
  if (!fbDb || TEST_MODE) return;
  fbSafeCall(
    fbDb.collection("sessions").doc(sessionId).set(
      {
        endedAt: firebase.firestore.FieldValue.serverTimestamp(),
        ...summary
      },
      { merge: true }
    )
  );
}

const INITIAL_GOLD = 100000;
const INITIAL_PROTECTION_TICKETS = 1;
const SCRAPS_PER_PROTECTION_TICKET = 25;
const MAX_LEVEL = 30;

const PROBABILITIES = [
  0.9975, 0.945, 0.8925, 0.8925, 0.84, 0.7875, 0.735, 0.6825,
  0.63, 0.5775, 0.525, 0.4725, 0.42, 0.3675, 0.315, 0.315,
  0.315, 0.1575, 0.1575, 0.1575, 0.315, 0.1575, 0.1575, 0.105,
  0.105, 0.105, 0.0735, 0.0525, 0.0315, 0.0105
];

const DESTRUCTION_PROBABILITIES = [
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0.0206,
  0.0206, 0.0674, 0.0674, 0.0843, 0.1028, 0.1264, 0.1685, 0.179,
  0.179, 0.179, 0.1853, 0.1895, 0.1937, 0.1979
];

const LEVEL_NAMES = {
  0: "낡은 갑옷",
  3: "보강된 갑옷",
  5: "강철 갑옷",
  7: "기사 갑옷",
  10: "정예 기사 갑옷",
  15: "전설의 갑옷",
  20: "초월 전설의 갑옷",
  25: "신화 갑옷",
  30: "최고의 신화 갑옷"
};

const LEVEL_DESCRIPTIONS = {
  0: "아직 아무도 탐내지 않는 낡은 갑옷입니다.",
  3: "조금은 믿음직한 방어구가 되었습니다.",
  5: "평범한 병사의 장비로 손색이 없습니다.",
  7: "기사의 문장을 달아도 어울릴 만합니다.",
  10: "숙련된 장인이 만든 정예 갑옷입니다.",
  15: "대장장이의 이름을 전설로 남길 갑옷입니다.",
  20: "여러 전설을 초월한 신기로운 갑옷입니다.",
  25: "신화 속에만 나오는 갑옷에 가까워졌습니다.",
  30: "이 대장간의 궁극의 결작이 될 갑옷입니다."
};

const numberFormatter = new Intl.NumberFormat("ko-KR");
const sessionId = createId();
let state = loadState();
let hasLoggedSessionEnd = false;

const elements = {
  gold: document.querySelector("#gold-value"),
  scraps: document.querySelector("#scrap-value"),
  tickets: document.querySelector("#ticket-value"),
  highest: document.querySelector("#highest-level-value"),
  sessions: document.querySelector("#session-value"),
  armorStage: document.querySelector("#armor-stage"),
  armorShape: document.querySelector("#armor-shape"),
  stageGlow: document.querySelector(".stage-glow"),
  stageCaption: document.querySelector("#stage-caption"),
  armorName: document.querySelector("#armor-name"),
  armorDescription: document.querySelector("#armor-description"),
  armorStatus: document.querySelector("#armor-status"),
  nextLevel: document.querySelector("#next-level-value"),
  successChance: document.querySelector("#success-chance-value"),
  failureChance: document.querySelector("#failure-chance-value"),
  destructionChance: document.querySelector("#destruction-chance-value"),
  cost: document.querySelector("#cost-value"),
  sellValue: document.querySelector("#sell-value"),
  enhanceButton: document.querySelector("#enhance-button"),
  sellButton: document.querySelector("#sell-button"),
  protectionCheckbox: document.querySelector("#protection-checkbox"),
  protectionOption: document.querySelector("#protection-option"),
  saveState: document.querySelector("#save-state"),
  resultBox: document.querySelector("#result-box"),
  resultTitle: document.querySelector("#result-title"),
  resultMessage: document.querySelector("#result-message"),
  destructionBox: document.querySelector("#destruction-box"),
  destructionScrapMessage: document.querySelector("#destruction-scrap-message"),
  newArmorButton: document.querySelector("#new-armor-button"),
  finalSummary: document.querySelector("#final-summary"),
  finalSummaryTitle: document.querySelector("#final-summary-title"),
  finalSummaryGuidance: document.querySelector("#final-summary-guidance"),
  finalMaxLevel: document.querySelector("#final-max-level"),
  finalDestructionCount: document.querySelector("#final-destruction-count"),
  finalSessionMaxGold: document.querySelector("#final-session-max-gold"),
  finalSessionAttempts: document.querySelector("#final-session-attempts"),
  finalSessionSuccesses: document.querySelector("#final-session-successes"),
  finalSessionFailures: document.querySelector("#final-session-failures"),
  finalSummaryModal: document.querySelector("#final-summary-modal"),
  finalSummaryCloseButton: document.querySelector("#final-summary-close-button"),
  testPanel: document.querySelector("#test-panel"),
  testGoldInput: document.querySelector("#test-gold-input"),
  testLevelInput: document.querySelector("#test-level-input"),
  testScrapsInput: document.querySelector("#test-scraps-input"),
  testTicketsInput: document.querySelector("#test-tickets-input"),
  testHighestInput: document.querySelector("#test-highest-input"),
  testOutcomeSelect: document.querySelector("#test-outcome-select"),
  testApplyButton: document.querySelector("#test-apply-button"),
  testResetButton: document.querySelector("#test-reset-button"),
  resetButton: document.querySelector("#reset-button")
};

state.sessionCount += 1;
state.lastSessionId = sessionId;
state.sessionMaxGold = state.gold;
state.sessionAttempts = 0;
state.sessionSuccesses = 0;
state.sessionFailures = 0;
saveState();
fbStartSession();
logEvent("session_start", {
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight,
  sessionCount: state.sessionCount,
  playerId: state.playerId
});

bindEvents();
render();

function bindEvents() {
  elements.enhanceButton.addEventListener("click", enhanceArmor);
  elements.sellButton.addEventListener("click", sellArmor);
  elements.newArmorButton.addEventListener("click", () => startNewArmor("break"));
  elements.resetButton.addEventListener("click", resetData);
  elements.finalSummaryCloseButton.addEventListener("click", closeFinalSummary);
  if (TEST_MODE) {
    elements.testApplyButton.addEventListener("click", applyTestState);
    elements.testResetButton.addEventListener("click", resetTestState);
    document.querySelectorAll("[data-test-preset]").forEach((button) => {
      button.addEventListener("click", () => applyTestPreset(button.dataset.testPreset));
    });
  }
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createInitialState() {
  return {
    gold: INITIAL_GOLD,
    playerId: createId(),
    currentArmor: { level: 0 },
    protectionTickets: INITIAL_PROTECTION_TICKETS,
    scraps: 0,
    highestLevel: 0,
    destructionCount: 0,
    sessionCount: 0,
    sessionMaxGold: INITIAL_GOLD,
    sessionAttempts: 0,
    sessionSuccesses: 0,
    sessionFailures: 0,
    finalSummaryOpen: false,
    sessionResultType: null,
    bankruptcyAcknowledged: false,
    lastSessionId: null,
    lastSavedAt: null
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return createInitialState();
    return {
      ...createInitialState(),
      ...saved,
      playerId: saved.playerId ?? createId(),
      currentArmor: saved.currentArmor === undefined
        ? { level: 0 }
        : saved.currentArmor
    };
  } catch (error) {
    console.warn("저장 데이터를 읽지 못해 초기 상태로 시작합니다.", error);
    return createInitialState();
  }
}

function saveState() {
  state.sessionMaxGold = Math.max(state.sessionMaxGold ?? 0, state.gold);
  state.lastSavedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (elements.saveState) {
    elements.saveState.textContent = `자동 저장 ${formatTime(state.lastSavedAt)}`;
  }
}

function logEvent(type, payload = {}) {
  if (TEST_MODE) return;
  // Firebase에 비동기 전송 (실패해도 게임 진행에는 영향 없음)
  fbLogEvent(type, payload);
}

function getTestNumber(input, minimum, maximum) {
  const value = Number(input.value);
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function applyTestState() {
  if (!TEST_MODE) return;

  const level = getTestNumber(elements.testLevelInput, 0, MAX_LEVEL);
  const highestLevel = getTestNumber(elements.testHighestInput, 0, MAX_LEVEL);
  state.gold = getTestNumber(elements.testGoldInput, 0, 1_000_000_000);
  state.currentArmor = { level };
  state.scraps = getTestNumber(elements.testScrapsInput, 0, 1_000_000);
  state.protectionTickets = getTestNumber(
    elements.testTicketsInput,
    0,
    1_000_000
  );
  state.highestLevel = Math.max(highestLevel, level);
  state.finalSummaryOpen = false;
  state.sessionResultType = null;
  state.bankruptcyAcknowledged = false;
  persistAndRender();
  showResult("테스트 모드 적용", "테스트용 게임 수치를 적용했습니다.", "success");
}

function resetTestState() {
  if (!TEST_MODE) return;
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

function applyTestPreset(preset) {
  const presets = {
    fresh: { gold: 100000, level: 0, scraps: 0, tickets: 1, highest: 0 },
    dangerous: { gold: 1000000, level: 15, scraps: 0, tickets: 0, highest: 15 },
    max: { gold: 100000000, level: 29, scraps: 0, tickets: 0, highest: 29 },
    bankrupt: { gold: 0, level: 0, scraps: 0, tickets: 0, highest: 0 }
  };
  const presetState = presets[preset];
  if (!presetState) return;

  elements.testGoldInput.value = presetState.gold;
  elements.testLevelInput.value = presetState.level;
  elements.testScrapsInput.value = presetState.scraps;
  elements.testTicketsInput.value = presetState.tickets;
  elements.testHighestInput.value = presetState.highest;
  applyTestState();
}

function renderTestControls() {
  elements.testPanel.classList.toggle("hidden", !TEST_MODE);
  if (!TEST_MODE) return;

  elements.testGoldInput.value = state.gold;
  elements.testLevelInput.value = getCurrentLevel() ?? 0;
  elements.testScrapsInput.value = state.scraps;
  elements.testTicketsInput.value = state.protectionTickets;
  elements.testHighestInput.value = state.highestLevel;
}

function getCurrentLevel() {
  return state.currentArmor?.level ?? null;
}

function getTelemetrySnapshot() {
  return {
    goldAfter: state.gold,
    scrapsAfter: state.scraps,
    protectionTicketsAfter: state.protectionTickets,
    currentLevelAfter: getCurrentLevel(),
    highestLevelAfter: state.highestLevel,
    destructionCountAfter: state.destructionCount
  };
}

function getOutcomeRates(level) {
  const success = PROBABILITIES[level] ?? 0;
  const destruction = DESTRUCTION_PROBABILITIES[level] ?? 0;
  return {
    success,
    destruction,
    failure: Math.max(0, 1 - success - destruction)
  };
}

function getEnhanceCost(level) {
  return Math.ceil(25 * Math.pow(1.55, level));
}

function getTotalInvestment(level) {
  let total = 0;
  for (let currentLevel = 0; currentLevel < level; currentLevel += 1) {
    total += getEnhanceCost(currentLevel);
  }
  return total;
}

function getSellPrice(level) {
  if (level <= 0) return 0;
  const saleMultiplier = level === 1
    ? 0.6
    : level === 2
      ? 0.7
      : level === 3
        ? 0.8
        : level === 4
          ? 0.9
          : 1.35 + (level - 5) * 0.15;
  return Math.floor(getTotalInvestment(level) * saleMultiplier);
}

function getScrapsForBreak(level) {
  return Math.max(1, Math.ceil((level + 1) / 2));
}

function convertScrapsToProtectionTickets() {
  const protectionTicketsBefore = state.protectionTickets;
  const scrapsBefore = state.scraps;
  const ticketsGained = Math.floor(
    scrapsBefore / SCRAPS_PER_PROTECTION_TICKET
  );

  if (ticketsGained <= 0) {
    return { scrapsConverted: 0, ticketsGained: 0 };
  }

  const scrapsConverted = ticketsGained * SCRAPS_PER_PROTECTION_TICKET;
  state.scraps -= scrapsConverted;
  state.protectionTickets += ticketsGained;

  logEvent("scrap_to_protection_ticket", {
    scrapsBefore,
    scrapsConverted,
    scrapsAfter: state.scraps,
    protectionTicketsBefore,
    protectionTicketsAfter: state.protectionTickets,
    scrapsPerTicket: SCRAPS_PER_PROTECTION_TICKET
  });

  return { scrapsConverted, ticketsGained };
}

function canSellForNextEnhancement(level, cost) {
  return level > 0 && state.gold + getSellPrice(level) >= cost;
}

function getArmorTier(level) {
  return Object.keys(LEVEL_NAMES)
    .map(Number)
    .filter((milestone) => milestone <= level)
    .sort((a, b) => b - a)[0] ?? 0;
}

function getArmorName(level) {
  const tier = getArmorTier(level);
  const baseName = LEVEL_NAMES[tier];
  return tier === level ? baseName : `${baseName} +${level}`;
}

function getArmorDescription(level) {
  const tier = getArmorTier(level);
  return LEVEL_DESCRIPTIONS[tier];
}

function formatNumber(value) {
  return numberFormatter.format(Math.max(0, Math.floor(value)));
}

function formatLevel(level) {
  return `+${level}`;
}

function formatTime(isoDate) {
  if (!isoDate) return "방금";
  const date = new Date(isoDate);
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function render() {
  renderTestControls();
  const level = getCurrentLevel();
  const hasArmor = level !== null;
  const isMaxLevel = level === MAX_LEVEL;
  const rates = hasArmor && !isMaxLevel
    ? getOutcomeRates(level)
    : { success: 0, failure: 0, destruction: 0 };
  const cost = hasArmor && !isMaxLevel ? getEnhanceCost(level) : 0;
  const sellPrice = hasArmor ? getSellPrice(level) : 0;

  elements.gold.textContent = formatNumber(state.gold);
  elements.scraps.textContent = formatNumber(state.scraps);
  elements.tickets.textContent = formatNumber(state.protectionTickets);
  elements.highest.textContent = formatLevel(state.highestLevel);
  elements.sessions.textContent = formatNumber(state.sessionCount);

  elements.stageCaption.textContent = hasArmor ? formatLevel(level) : "파괴됨";
  elements.armorName.textContent = hasArmor ? getArmorName(level) : "갑옷 없음";
  elements.armorDescription.textContent = hasArmor
    ? getArmorDescription(level)
    : "새 갑옷을 받아 다시 도전하세요.";

  updateArmorVisual(level);
  updateMilestones(state.highestLevel);

  elements.nextLevel.textContent = hasArmor
    ? isMaxLevel ? "완료" : formatLevel(level + 1)
    : "대기";
  elements.successChance.textContent = hasArmor && !isMaxLevel
    ? `${Math.round(rates.success * 100)}%`
    : isMaxLevel ? "완료" : "-";
  elements.failureChance.textContent = hasArmor && !isMaxLevel
    ? `${Math.round(rates.failure * 100)}%`
    : isMaxLevel ? "0%" : "-";
  elements.destructionChance.textContent = hasArmor && !isMaxLevel
    ? `${Math.round(rates.destruction * 100)}%`
    : isMaxLevel ? "0%" : "-";
  elements.cost.textContent = hasArmor && !isMaxLevel
    ? `${formatNumber(cost)} G`
    : isMaxLevel ? "전설 달성" : "-";
  elements.sellValue.textContent = hasArmor && sellPrice > 0
    ? `${formatNumber(sellPrice)} G`
    : "판매 불가";

  elements.enhanceButton.disabled =
    !hasArmor || isMaxLevel;
  elements.enhanceButton.textContent = isMaxLevel ? "전설 달성" : "강화하기";
  elements.sellButton.disabled = !hasArmor || sellPrice <= 0;
  elements.protectionCheckbox.disabled =
    !hasArmor || state.protectionTickets <= 0 || isMaxLevel;
  elements.protectionOption.classList.toggle(
    "hidden",
    !hasArmor || isMaxLevel
  );
  elements.armorStatus.textContent = !hasArmor
    ? "새 갑옷 필요"
    : isMaxLevel
      ? "전설 달성"
      : "강화 가능";

  renderDestruction();
  renderFinalSummary();
}

function renderFinalSummary() {
  const showSummary = state.finalSummaryOpen;
  const isBankrupt = state.sessionResultType === "bankruptcy";
  elements.finalSummaryModal.classList.toggle("hidden", !showSummary);
  elements.finalSummaryCloseButton.textContent = isBankrupt
    ? "새로 시작하기"
    : "계속 플레이";
  if (!showSummary) return;

  elements.finalSummaryTitle.textContent = isBankrupt
    ? "대장간 운영이 종료되었습니다."
    : "전설의 대장장이가 되었습니다.";
  elements.finalSummaryGuidance.textContent = isBankrupt
    ? "강화 비용을 감당할 골드가 부족합니다. 이번 세션의 결과를 확인하세요."
    : "+30 갑옷 완성에 성공했습니다. 결과를 확인하고 계속 플레이할 수 있습니다.";
  document.querySelector(".final-summary-badge").textContent =
    isBankrupt ? "BANKRUPT" : "CLEAR";
  elements.finalMaxLevel.textContent = formatLevel(state.highestLevel);
  elements.finalDestructionCount.textContent =
    `${formatNumber(state.destructionCount)}회`;
  elements.finalSessionMaxGold.textContent =
    `${formatNumber(state.sessionMaxGold)} G`;
  elements.finalSessionAttempts.textContent =
    `${formatNumber(state.sessionAttempts)}회`;
  elements.finalSessionSuccesses.textContent =
    `${formatNumber(state.sessionSuccesses)}회`;
  elements.finalSessionFailures.textContent =
    `${formatNumber(state.sessionFailures)}회`;
}

function closeFinalSummary() {
  if (state.sessionResultType === "bankruptcy") {
    const confirmed = window.confirm(
      "현재 저장된 게임 데이터가 초기화됩니다. 처음부터 새로 시작할까요?"
    );
    if (!confirmed) return;
    resetSavedDataAndReload();
    return;
  }

  state.finalSummaryOpen = false;
  state.bankruptcyAcknowledged = true;
  persistAndRender();
}

function updateArmorVisual(level) {
  if (level === null) {
    elements.armorShape.style.opacity = "0.2";
    elements.armorShape.style.transform = "scale(0.72)";
    elements.stageGlow.style.opacity = "0.05";
    return;
  }

  const hue = Math.min(210 + level * 8, 350);
  const saturation = Math.min(24 + level * 4, 90);
  const lightness = Math.max(66 - level * 2.2, 33);
  elements.armorShape.style.opacity = "1";
  elements.armorShape.style.transform = `scale(${1 + level * 0.008})`;
  elements.armorShape.style.background =
    `linear-gradient(145deg, hsl(${hue} ${saturation}% ${Math.min(lightness + 15, 88)}%), hsl(${hue} ${saturation}% ${lightness}%))`;
  elements.armorShape.style.boxShadow =
    `inset 10px 10px 0 rgba(255,255,255,.08), inset -14px -18px 0 rgba(0,0,0,.18), 0 0 ${35 + level * 4}px hsla(${hue}, 80%, 65%, .22)`;
  elements.stageGlow.style.opacity = `${0.16 + level * 0.02}`;
  elements.stageGlow.style.background = `hsla(${hue}, 80%, 65%, .18)`;
}

function updateMilestones(highestLevel) {
  document.querySelectorAll(".milestone").forEach((milestone) => {
    const level = Number(milestone.dataset.level);
    milestone.classList.toggle("reached", highestLevel >= level);
  });
}

function enhanceArmor() {
  performEnhancement();
}

function performEnhancement() {
  const level = getCurrentLevel();
  if (level === null || level >= MAX_LEVEL) return;

  const cost = getEnhanceCost(level);
  if (state.gold < cost) {
    const canSell = canSellForNextEnhancement(level, cost);
    if (canSell) {
      showResult(
        "골드가 부족합니다.",
        "현재 갑옷을 판매하면 다음 강화를 진행할 수 있습니다.",
        "failure"
      );
      persistAndRender();
      return;
    }

    state.sessionResultType = "bankruptcy";
    state.finalSummaryOpen = true;
    state.bankruptcyAcknowledged = false;
    logEvent("bankruptcy", {
      reason: "insufficient_gold",
      level,
      cost,
      goldBefore: state.gold,
      ...getTelemetrySnapshot()
    });
    persistAndRender();
    showResult("골드가 부족합니다.", `${formatNumber(cost)} G가 필요합니다.`, "failure");
    return;
  }

  const rates = getOutcomeRates(level);
  const willUseProtection =
    elements.protectionCheckbox.checked && state.protectionTickets > 0;
  const goldBefore = state.gold;
  const scrapsBefore = state.scraps;
  const protectionTicketsBefore = state.protectionTickets;

  logEvent("reinforce_attempt", {
    level,
    cost,
    successProbability: rates.success,
    failureProbability: rates.failure,
    destructionProbability: rates.destruction,
    protectionPlanned: willUseProtection,
    goldBefore,
    scrapsBefore,
    protectionTicketsBefore
  });

  state.gold -= cost;
  state.sessionAttempts += 1;
  const forcedOutcome = TEST_MODE
    ? elements.testOutcomeSelect.value
    : "random";
  const roll = Math.random();
  const success =
    forcedOutcome === "success" ||
    (forcedOutcome === "random" && roll < rates.success);
  const destruction =
    forcedOutcome === "destruction" ||
    (forcedOutcome === "random" &&
      !success &&
      roll < rates.success + rates.destruction);
  if (success) {
    state.sessionSuccesses += 1;
  } else {
    state.sessionFailures += 1;
  }

  if (success) {
    const nextLevel = level + 1;
    state.currentArmor.level = nextLevel;
    state.highestLevel = Math.max(state.highestLevel, nextLevel);
    if (nextLevel === MAX_LEVEL) {
      state.finalSummaryOpen = true;
      state.sessionResultType = "legendary";
      logEvent("legendary_clear", {
        level: nextLevel,
        totalSessions: state.sessionCount,
        sessionAttempts: state.sessionAttempts,
        sessionSuccesses: state.sessionSuccesses,
        sessionFailures: state.sessionFailures,
        ...getTelemetrySnapshot()
      });
      showResult(
        "전설의 갑옷 완성!",
        "+30 갑옷을 만들었습니다. 전설의 대장장이가 되었습니다.",
        "success"
      );
    } else {
      showResult(
        "강화 성공!",
        `${formatLevel(nextLevel)} ${getArmorName(nextLevel)}이 되었습니다.`,
        "success"
      );
    }
    logEvent("reinforce_result", {
      result: "success",
      beforeLevel: level,
      afterLevel: nextLevel,
      successProbability: rates.success,
      failureProbability: rates.failure,
      destructionProbability: rates.destruction,
      ...getTelemetrySnapshot()
    });
  } else if (!destruction) {
    showResult(
      "강화 실패",
      `${formatLevel(level)} 갑옷은 유지됩니다. 강화 비용만 소모되었습니다.`,
      "failure"
    );
    logEvent("reinforce_result", {
      result: "failure_kept",
      beforeLevel: level,
      afterLevel: level,
      successProbability: rates.success,
      failureProbability: rates.failure,
      destructionProbability: rates.destruction,
      ...getTelemetrySnapshot()
    });
  } else if (willUseProtection) {
    state.protectionTickets -= 1;
    elements.protectionCheckbox.checked = false;
    showResult(
      "파괴 방지 성공",
      `파괴 보호권을 사용해 ${formatLevel(level)} 갑옷을 지켰습니다.`,
      "protected"
    );
    logEvent("use_protection", {
      level,
      item: "destruction_protection_ticket",
      ...getTelemetrySnapshot()
    });
    logEvent("reinforce_result", {
      result: "destruction_protected",
      beforeLevel: level,
      afterLevel: level,
      successProbability: rates.success,
      failureProbability: rates.failure,
      destructionProbability: rates.destruction,
      ...getTelemetrySnapshot()
    });
  } else {
    const scrapsGained = getScrapsForBreak(level);
    state.destructionCount += 1;
    state.scraps += scrapsGained;
    const scrapConversion = convertScrapsToProtectionTickets();
    state.currentArmor = null;
    showResult(
      "강화 실패",
      `${formatLevel(level)} 갑옷이 파괴되었습니다. 조각 ${scrapsGained}개를 얻었습니다.${
        scrapConversion.ticketsGained > 0
          ? ` 조각 ${scrapConversion.scrapsConverted}개가 파괴 방지권 ${scrapConversion.ticketsGained}장으로 자동 변환되었습니다.`
          : ""
      }`,
      "destruction"
    );
    logEvent("armor_break", {
      level,
      scrapsGained,
      protectionTickets: state.protectionTickets,
      ...getTelemetrySnapshot()
    });
    logEvent("reinforce_result", {
      result: "destruction",
      beforeLevel: level,
      afterLevel: null,
      successProbability: rates.success,
      failureProbability: rates.failure,
      destructionProbability: rates.destruction,
      ...getTelemetrySnapshot()
    });
  }

  persistAndRender();
}

function sellArmor() {
  const level = getCurrentLevel();
  if (level === null || level <= 0) return;

  const price = getSellPrice(level);
  const goldBefore = state.gold;
  state.gold += price;
  state.currentArmor = { level: 0 };
  elements.protectionCheckbox.checked = false;
  logEvent("sell_armor", {
    level,
    price,
    goldBefore,
    newArmorLevel: 0,
    ...getTelemetrySnapshot()
  });
  showResult(
    "갑옷 판매 완료",
    `${formatLevel(level)} 갑옷을 ${formatNumber(price)} G에 판매했습니다. 새 +0 갑옷을 받았습니다.`,
    "success"
  );
  persistAndRender();
}

function startNewArmor(reason) {
  state.currentArmor = { level: 0 };
  elements.protectionCheckbox.checked = false;
  logEvent("new_armor_start", {
    reason,
    level: 0,
    ...getTelemetrySnapshot()
  });
  showResult(
    "새 갑옷 준비 완료",
    "새로운 +0 낡은 갑옷을 받았습니다. 다시 도전하세요.",
    "success"
  );
  persistAndRender();
}

function renderDestruction() {
  const showDestruction = !state.currentArmor;
  elements.destructionBox.classList.toggle("hidden", !showDestruction);
  if (showDestruction) {
    elements.destructionScrapMessage.textContent =
      `보유 조각 ${formatNumber(state.scraps)}개`;
  }
}

function showResult(title, message, type = "neutral") {
  elements.resultTitle.textContent = title;
  elements.resultMessage.textContent = message;
  elements.resultBox.dataset.type = type;
  elements.armorStage.dataset.effect = type;

  const effectTypes = ["success", "failure", "protected", "destruction"];
  elements.armorStage.classList.remove(
    "flash-success",
    "flash-failure",
    "flash-protected",
    "flash-destruction"
  );
  void elements.armorStage.offsetWidth;
  if (effectTypes.includes(type)) {
    elements.armorStage.classList.add(`flash-${type}`);
  }
}

function persistAndRender() {
  saveState();
  render();
}

function resetData() {
  const confirmed = window.confirm(
    "저장된 게임 데이터를 모두 삭제하고 처음부터 시작할까요?"
  );
  if (!confirmed) return;
  resetSavedDataAndReload();
}

function resetSavedDataAndReload() {
  hasLoggedSessionEnd = true;
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

window.addEventListener("beforeunload", () => {
  if (hasLoggedSessionEnd) return;
  hasLoggedSessionEnd = true;
  const summary = {
    highestLevel: state.highestLevel,
    gold: state.gold,
    currentLevel: getCurrentLevel(),
    playerId: state.playerId,
    sessionMaxGold: state.sessionMaxGold,
    destructionCount: state.destructionCount,
    sessionAttempts: state.sessionAttempts,
    sessionSuccesses: state.sessionSuccesses,
    sessionFailures: state.sessionFailures,
    ...getTelemetrySnapshot()
  };
  fbEndSession(summary);
  logEvent("session_end", summary);
  saveState();
});
