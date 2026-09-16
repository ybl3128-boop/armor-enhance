const path = require("path");
const { pathToFileURL } = require("url");
const { test, expect } = require("@playwright/test");

const gameUrl = pathToFileURL(path.resolve(__dirname, "index.html")).href;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const outcomes = [0, 0.999, 0, 0, 0, 0, 0, 0, 0, 0];
    Math.random = () => outcomes.shift() ?? 0;
  });
  await page.goto(gameUrl);
});

test("초기 화면과 기본 강화 흐름", async ({ page }) => {
  await expect(page.locator("#armor-name")).toHaveText("낡은 갑옷");
  await expect(page.locator("#success-chance-value")).toHaveText("100%");
  await expect(page.locator("#gold-value")).toHaveText("10,000");
  await expect(page.locator("#sell-button")).toBeDisabled();

  await page.getByRole("button", { name: "강화하기" }).click();

  await expect(page.locator("#stage-caption")).toHaveText("+1");
  await expect(page.locator("#gold-value")).toHaveText("9,975");
  await expect(page.locator("#result-title")).toHaveText("강화 성공!");
});

test("낮은 단계 판매로 골드가 복사되지 않음", async ({ page }) => {
  await page.getByRole("button", { name: "강화하기" }).click();
  await page.getByRole("button", { name: "판매하기" }).click();

  await expect(page.locator("#gold-value")).toHaveText("9,990");
  await expect(page.locator("#armor-name")).toHaveText("낡은 갑옷");
  await expect(page.locator("#sell-button")).toBeDisabled();
  await expect(page.locator("#result-title")).toHaveText("갑옷 판매 완료");
});

test("+5부터 판매 수익이 발생", async ({ page }) => {
  await page.addInitScript(() => {
    const state = JSON.parse(localStorage.getItem("armor-enhance-state-v1"));
    state.gold = 1000000;
    state.currentArmor = { level: 5 };
    state.pendingRecovery = null;
    localStorage.setItem("armor-enhance-state-v1", JSON.stringify(state));
  });
  await page.reload();

  await expect(page.locator("#sell-value")).toHaveText("491 G");
  await page.getByRole("button", { name: "판매하기" }).click();
  await expect(page.locator("#gold-value")).toHaveText("1,000,491");
});

test("일반 강화 실패는 비용만 소모하고 등급을 유지", async ({ page }) => {
  await page.getByRole("button", { name: "강화하기" }).click();
  await page.getByRole("button", { name: "강화하기" }).click();

  await expect(page.locator("#armor-name")).toHaveText("낡은 갑옷 +1");
  await expect(page.locator("#recovery-box")).toBeHidden();
  await expect(page.locator("#result-title")).toHaveText("강화 실패");
});

test("10강 이후 파괴와 파괴 보호권이 작동", async ({ page }) => {
  await page.addInitScript(() => {
    const state = JSON.parse(localStorage.getItem("armor-enhance-state-v1"));
    state.gold = 1000000;
    state.currentArmor = { level: 10 };
    state.protectionTickets = 1;
    state.scraps = 0;
    state.pendingRecovery = null;
    localStorage.setItem("armor-enhance-state-v1", JSON.stringify(state));
    Math.random = () => 0.505;
  });
  await page.reload();

  await page.getByLabel(/파괴 보호권 사용 예정/).check();
  await page.getByRole("button", { name: "강화하기" }).click();
  await expect(page.locator("#stage-caption")).toHaveText("+10");
  await expect(page.locator("#result-title")).toHaveText("파괴 방지 성공");
  await expect(page.locator("#ticket-value")).toHaveText("0");

  await page.getByRole("button", { name: "강화하기" }).click();
  await expect(page.locator("#armor-name")).toHaveText("갑옷 없음");
  await expect(page.locator("#recovery-box")).toBeVisible();
  await expect(page.locator("#scrap-value")).toHaveText("6");

  await page.getByRole("button", { name: "새 +0 갑옷 받기" }).click();
  await expect(page.locator("#armor-name")).toHaveText("낡은 갑옷");
  await expect(page.locator("#stage-caption")).toHaveText("+0");
});

test("조각으로 갑옷을 복구하고 새로고침 후 상태를 유지", async ({ page }) => {
  await page.getByRole("button", { name: "강화하기" }).click();
  await page.getByRole("button", { name: "강화하기" }).click();

  await page.addInitScript(() => {
    if (localStorage.getItem("playtest-restore-seeded")) return;
    const state = JSON.parse(localStorage.getItem("armor-enhance-state-v1"));
    state.scraps = 5;
    state.currentArmor = null;
    state.pendingRecovery = {
      brokenLevel: 7,
      scrapsGained: 1
    };
    localStorage.setItem("armor-enhance-state-v1", JSON.stringify(state));
    localStorage.setItem("playtest-restore-seeded", "true");
  });
  await page.reload();

  await page.getByRole("button", { name: /\+3 복구/ }).click();
  await expect(page.locator("#stage-caption")).toHaveText("+3");
  await expect(page.locator("#scrap-value")).toHaveText("0");

  await page.reload();
  await expect(page.locator("#stage-caption")).toHaveText("+3");
  await expect(page.locator("#armor-name")).toHaveText("보강된 갑옷");
});

test("+20 달성 결과를 표시하고 기록을 유지", async ({ page }) => {
  await page.addInitScript(() => {
    const state = JSON.parse(localStorage.getItem("armor-enhance-state-v1"));
    state.gold = 1000000;
    state.currentArmor = { level: 19 };
    state.pendingRecovery = null;
    localStorage.setItem("armor-enhance-state-v1", JSON.stringify(state));
  });
  await page.reload();

  await page.getByRole("button", { name: "강화하기" }).click();
  await expect(page.locator("#enhancement-cinematic")).toBeVisible();
  await page.getByRole("button", { name: "강화 결과 확인" }).click();

  await expect(page.locator("#result-title")).toHaveText("전설의 갑옷 완성!");
  await expect(page.locator("#legendary-state")).toHaveText("달성 완료");
  await expect(page.locator("#stage-caption")).toHaveText("+20");
  await expect(page.locator("#final-summary-modal")).toBeVisible();
  await expect(page.locator("#final-summary")).toBeVisible();
  await expect(page.locator("#final-max-level")).toHaveText("+20");
  await expect(page.locator("#final-session-attempts")).toHaveText("1회");
  await expect(page.locator("#final-session-successes")).toHaveText("1회");
  await expect(page.locator("#final-session-failures")).toHaveText("0회");
  await page.getByRole("button", { name: "계속 플레이" }).click();
  await expect(page.locator("#final-summary-modal")).toBeHidden();
});

test("+17 강화 연출 스킵 설정", async ({ page }) => {
  await page.addInitScript(() => {
    const state = JSON.parse(localStorage.getItem("armor-enhance-state-v1"));
    state.gold = 1000000;
    state.currentArmor = { level: 17 };
    state.pendingRecovery = null;
    localStorage.setItem("armor-enhance-state-v1", JSON.stringify(state));
  });
  await page.reload();

  await page.getByLabel(/\+17 강화 연출 건너뛰기/).check();
  await page.getByRole("button", { name: "강화하기" }).click();

  await expect(page.locator("#enhancement-cinematic")).toBeHidden();
  await expect(page.locator("#stage-caption")).toHaveText("+18");
});

test("골드 부족 시 세션 결과 팝업 표시", async ({ page }) => {
  await page.addInitScript(() => {
    const state = JSON.parse(localStorage.getItem("armor-enhance-state-v1"));
    state.gold = 0;
    state.currentArmor = { level: 0 };
    state.pendingRecovery = null;
    localStorage.setItem("armor-enhance-state-v1", JSON.stringify(state));
  });
  await page.reload();

  await page.getByRole("button", { name: "강화하기" }).click();
  await expect(page.locator("#final-summary-modal")).toBeVisible();
  await expect(page.locator("#final-summary-title")).toHaveText("대장간 운영이 종료되었습니다.");
  await expect(page.locator(".final-summary-badge")).toHaveText("BANKRUPT");
  await expect(page.locator("#final-max-level")).toHaveText("+0");
  await page.getByRole("button", { name: "계속 플레이" }).click();
  await expect(page.locator("#final-summary-modal")).toBeHidden();
});

test("현재 갑옷을 팔아 진행할 수 있으면 파산하지 않음", async ({ page }) => {
  await page.addInitScript(() => {
    const state = JSON.parse(localStorage.getItem("armor-enhance-state-v1"));
    state.gold = 0;
    state.currentArmor = { level: 5 };
    state.pendingRecovery = null;
    localStorage.setItem("armor-enhance-state-v1", JSON.stringify(state));
  });
  await page.reload();

  await page.getByRole("button", { name: "강화하기" }).click();
  await expect(page.locator("#final-summary-modal")).toBeHidden();
  await expect(page.locator("#result-title")).toHaveText("골드가 부족합니다.");
  await expect(page.locator("#result-message")).toContainText("판매하면");

  await page.getByRole("button", { name: "판매하기" }).click();
  await expect(page.locator("#stage-caption")).toHaveText("+0");
  await expect(page.locator("#gold-value")).toHaveText("491");
});

test("데이터 초기화 후 처음 상태로 돌아감", async ({ page }) => {
  await page.getByRole("button", { name: "강화하기" }).click();
  await expect(page.locator("#stage-caption")).toHaveText("+1");

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: "데이터 초기화" }).click();
  await page.waitForLoadState("domcontentloaded");

  await expect(page.locator("#stage-caption")).toHaveText("+0");
  await expect(page.locator("#gold-value")).toHaveText("10,000");
  await expect(page.locator("#scrap-value")).toHaveText("0");
  await expect(page.locator("#highest-level-value")).toHaveText("+0");
});

test("로그에 익명 플레이어 ID와 전후 상태가 기록됨", async ({ page }) => {
  await page.getByRole("button", { name: "강화하기" }).click();

  const logData = await page.evaluate(() => {
    const logs = JSON.parse(localStorage.getItem("armor-enhance-logs-v1"));
    return {
      session: logs.find((event) => event.type === "session_start"),
      attempt: logs.find((event) => event.type === "reinforce_attempt"),
      result: logs.find((event) => event.type === "reinforce_result")
    };
  });

  expect(logData.session.playerId).toBeTruthy();
  expect(logData.attempt.playerId).toBe(logData.session.playerId);
  expect(logData.attempt.payload.goldBefore).toBe(10000);
  expect(logData.result.payload.goldAfter).toBe(9975);
  expect(logData.result.payload.currentLevelAfter).toBe(1);
});
