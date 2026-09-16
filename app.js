const STORAGE_KEY = "armor-enhance-state-v1";
const LOG_STORAGE_KEY = "armor-enhance-logs-v1";
const INITIAL_GOLD = 10000;
const INITIAL_PROTECTION_TICKETS = 1;
const MAX_LEVEL = 20;

const PROBABILITIES = [
  1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65,
  0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.3,
  0.3, 0.3, 0.3, 0.3
];

const DESTRUCTION_PROBABILITIES = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0.01, 0.01, 0.02, 0.02, 0.03, 0.03,
  0.04, 0.05, 0.06, 0.08
];

const RESTORE_OPTIONS = [
  { level: 3, scraps: 5 },
  { level: 5, scraps: 12 },
  { level: 7, scraps: 25 }
];

const LEVEL_NAMES = {
  0: "낡은 갑옷",
  3: "보강된 갑옷",
  5: "강철 갑옷",
  7: "기사 갑옷",
  10: "정예 기사 갑옷",
  15: "전설의 갑옷",
  20: "최종 전설의 갑옷"
};

const LEVEL_DESCRIPTIONS = {
  0: "아직 아무도 탐내지 않는 낡은 갑옷입니다.",
  3: "조금은 믿음직한 방어구가 되었습니다.",
  5: "평범한 병사의 장비로 손색이 없습니다.",
  7: "기사의 문장을 달아도 어울릴 만합니다.",
  10: "숙련된 장인이 만든 정예 갑옷입니다.",
  15: "대장장이의 이름을 전설로 남길 갑옷입니다.",
  20: "이 대장간의 최종 기록이 될 갑옷입니다."
};

const numberFormatter = new Intl.NumberFormat("ko-KR");
const sessionId = createId();
let state = loadState();
let hasLoggedSessionEnd = false;
let cinematicOpen = false;

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
  skipCinematicCheckbox: document.querySelector("#skip-cinematic-checkbox"),
  cinematicModal: document.querySelector("#enhancement-cinematic"),
  cinematicTitle: document.querySelector("#cinematic-title"),
  cinematicMessage: document.querySelector("#cinematic-message"),
  cinematicConfirmButton: document.querySelector("#cinematic-confirm-button"),
  saveState: document.querySelector("#save-state"),
  resultBox: document.querySelector("#result-box"),
  resultTitle: document.querySelector("#result-title"),
  resultMessage: document.querySelector("#result-message"),
  recoveryBox: document.querySelector("#recovery-box"),
  recoveryScrapMessage: document.querySelector("#recovery-scrap-message"),
  recoveryOptions: document.querySelector("#recovery-options"),
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
  legendaryBanner: document.querySelector("#legendary-banner"),
  legendaryState: document.querySelector("#legendary-state"),
  exportLogsButton: document.querySelector("#export-logs-button"),
  resetButton: document.querySelector("#reset-button")
};

state.sessionCount += 1;
state.lastSessionId = sessionId;
state.sessionMaxGold = state.gold;
state.sessionAttempts = 0;
state.sessionSuccesses = 0;
state.sessionFailures = 0;
saveState();
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
  elements.exportLogsButton.addEventListener("click", exportLogs);
  elements.resetButton.addEventListener("click", resetData);
  elements.skipCinematicCheckbox.addEventListener("change", () => {
    state.skipEnhancementCinematic = elements.skipCinematicCheckbox.checked;
    persistAndRender();
  });
  elements.cinematicConfirmButton.addEventListener("click", () => {
    closeEnhancementCinematic();
    performEnhancement();
  });
  elements.finalSummaryCloseButton.addEventListener("click", closeFinalSummary);
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
    legendaryClear: false,
    destructionCount: 0,
    sessionCount: 0,
    sessionMaxGold: INITIAL_GOLD,
    sessionAttempts: 0,
    sessionSuccesses: 0,
    sessionFailures: 0,
    skipEnhancementCinematic: false,
    finalSummaryOpen: false,
    sessionResultType: null,
    bankruptcyAcknowledged: false,
    lastSessionId: null,
    pendingRecovery: null,
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
  const logs = loadLogs();
  logs.push({
    eventId: createId(),
    type,
    timestamp: new Date().toISOString(),
    playerId: state.playerId,
    sessionId,
    payload
  });
  localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs.slice(-2000)));
}

function loadLogs() {
  try {
    return JSON.parse(localStorage.getItem(LOG_STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
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

  elements.stageCaption.textContent = hasArmor ? formatLevel(level) : "복구";
  elements.armorName.textContent = hasArmor ? getArmorName(level) : "갑옷 없음";
  elements.armorDescription.textContent = hasArmor
    ? getArmorDescription(level)
    : "새 갑옷을 받거나 조각으로 갑옷을 복구하세요.";

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
  elements.skipCinematicCheckbox.checked = state.skipEnhancementCinematic;
  elements.protectionOption.classList.toggle(
    "hidden",
    !hasArmor || isMaxLevel
  );
  elements.armorStatus.textContent = !hasArmor
    ? "새 갑옷 필요"
    : isMaxLevel
      ? "전설 달성"
      : "강화 가능";

  renderRecovery();
  renderFinalSummary();
  elements.legendaryState.textContent = state.legendaryClear
    ? "달성 완료"
    : `최고 기록 ${formatLevel(state.highestLevel)}`;
  elements.legendaryState.classList.toggle("completed", state.legendaryClear);
}

function renderFinalSummary() {
  const showSummary = state.finalSummaryOpen;
  elements.finalSummaryModal.classList.toggle("hidden", !showSummary);
  if (!showSummary) return;

  const isBankrupt = state.sessionResultType === "bankruptcy";
  elements.finalSummaryTitle.textContent = isBankrupt
    ? "대장간 운영이 종료되었습니다."
    : "전설의 대장장이가 되었습니다.";
  elements.finalSummaryGuidance.textContent = isBankrupt
    ? "강화 비용을 감당할 골드가 부족합니다. 이번 세션의 결과를 확인하세요."
    : "+20 갑옷 완성에 성공했습니다. 결과를 확인하고 계속 플레이할 수 있습니다.";
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
  const level = getCurrentLevel();
  if (
    level !== null &&
    level >= 17 &&
    !state.skipEnhancementCinematic &&
    !cinematicOpen
  ) {
    openEnhancementCinematic(level);
    return;
  }
  performEnhancement();
}

function openEnhancementCinematic(level) {
  cinematicOpen = true;
  elements.cinematicTitle.textContent =
    `${formatLevel(level)} 강화에 도전하고 있습니다!`;
  elements.cinematicMessage.innerHTML =
    "이제부터는 엄청난 강화 구간입니다.<br />대장장이의 집중력을 보여주세요.";
  elements.cinematicModal.classList.remove("hidden");
  elements.cinematicConfirmButton.focus();
}

function closeEnhancementCinematic() {
  cinematicOpen = false;
  elements.cinematicModal.classList.add("hidden");
}

function performEnhancement() {
  const level = getCurrentLevel();
  if (level === null || level >= MAX_LEVEL) return;

  const cost = getEnhanceCost(level);
  if (state.gold < cost) {
    state.sessionResultType = "bankruptcy";
    state.finalSummaryOpen = true;
    state.bankruptcyAcknowledged = false;
    logEvent("bankruptcy_blocked", {
      level,
      cost,
      goldBefore: state.gold,
      scrapsBefore: state.scraps
    });
    logEvent("session_bankruptcy", {
      level,
      cost,
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

  logEvent("probability_view", {
    level,
    successProbability: rates.success,
    failureProbability: rates.failure,
    destructionProbability: rates.destruction,
    cost,
    goldBefore,
    scrapsBefore,
    protectionTicketsBefore
  });
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
  const roll = Math.random();
  const success = roll < rates.success;
  const destruction =
    !success && roll < rates.success + rates.destruction;
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
      state.legendaryClear = true;
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
        "+20 갑옷을 만들었습니다. 전설의 대장장이가 되었습니다.",
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
    elements.protectionCheckbox.checked = false;
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
      "failure"
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
    state.currentArmor = null;
    state.pendingRecovery = {
      brokenLevel: level,
      scrapsGained
    };
    showResult(
      "강화 실패",
      `${formatLevel(level)} 갑옷이 파괴되었습니다. 조각 ${scrapsGained}개를 얻었습니다.`,
      "failure"
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
  state.pendingRecovery = null;
  elements.protectionCheckbox.checked = false;
  logEvent("sell_armor", {
    level,
    price,
    goldBefore,
    ...getTelemetrySnapshot()
  });
  logEvent("new_armor_start", {
    reason: "sell",
    level: 0,
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
  state.pendingRecovery = null;
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

function restoreArmor(level, scrapsRequired) {
  if (!state.pendingRecovery || state.scraps < scrapsRequired) return;
  state.scraps -= scrapsRequired;
  state.currentArmor = { level };
  state.pendingRecovery = null;
  logEvent("armor_restore", {
    level,
    scraps: scrapsRequired,
    ...getTelemetrySnapshot()
  });
  showResult(
    "갑옷 복구 완료",
    `${formatLevel(level)} 단계의 갑옷으로 복구했습니다.`,
    "success"
  );
  persistAndRender();
}

function renderRecovery() {
  const pending = state.pendingRecovery;
  const showRecovery = Boolean(pending && !state.currentArmor);
  elements.recoveryBox.classList.toggle("hidden", !showRecovery);
  if (!showRecovery) return;

  elements.recoveryScrapMessage.textContent =
    `보유 조각 ${formatNumber(state.scraps)}개`;
  elements.recoveryOptions.innerHTML = "";

  RESTORE_OPTIONS
    .filter((option) => option.level <= pending.brokenLevel)
    .forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "recovery-button";
      button.disabled = state.scraps < option.scraps;
      button.textContent = `${formatLevel(option.level)} 복구 · ${option.scraps}조각`;
      button.addEventListener("click", () =>
        restoreArmor(option.level, option.scraps)
      );
      elements.recoveryOptions.append(button);
    });
}

function showResult(title, message, type = "neutral") {
  elements.resultTitle.textContent = title;
  elements.resultMessage.textContent = message;
  elements.resultBox.dataset.type = type;

  elements.armorStage.classList.remove("flash-success", "flash-failure");
  void elements.armorStage.offsetWidth;
  if (type === "success" || type === "failure") {
    elements.armorStage.classList.add(`flash-${type}`);
  }
}

function persistAndRender() {
  saveState();
  render();
}

function exportLogs() {
  const logs = loadLogs();
  const blob = new Blob([JSON.stringify(logs, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const exportTimestamp = new Date()
    .toISOString()
    .replace("T", "_")
    .replace(/[:.]/g, "-");
  link.download = `armor-enhance-logs-${exportTimestamp}-${sessionId}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function resetData() {
  const confirmed = window.confirm(
    "저장된 게임 데이터와 로그를 모두 삭제하고 처음부터 시작할까요?"
  );
  if (!confirmed) return;
  hasLoggedSessionEnd = true;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LOG_STORAGE_KEY);
  window.location.reload();
}

window.addEventListener("beforeunload", () => {
  if (hasLoggedSessionEnd) return;
  hasLoggedSessionEnd = true;
  logEvent("session_end", {
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
  });
  saveState();
});
