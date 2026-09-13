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
  await expect(page.locator("#chance-value")).toHaveText("100%");
  await expect(page.locator("#gold-value")).toHaveText("5,000");
  await expect(page.locator("#sell-button")).toBeDisabled();

  await page.getByRole("button", { name: "강화하기" }).click();

  await expect(page.locator("#stage-caption")).toHaveText("+1");
  await expect(page.locator("#gold-value")).toHaveText("4,975");
  await expect(page.locator("#result-title")).toHaveText("강화 성공!");
});

test("낮은 단계 판매로 골드가 복사되지 않음", async ({ page }) => {
  await page.getByRole("button", { name: "강화하기" }).click();
  await page.getByRole("button", { name: "판매하기" }).click();

  await expect(page.locator("#gold-value")).toHaveText("4,990");
  await expect(page.locator("#armor-name")).toHaveText("낡은 갑옷");
  await expect(page.locator("#sell-button")).toBeDisabled();
  await expect(page.locator("#result-title")).toHaveText("갑옷 판매 완료");
});

test("강화 실패 후 조각을 얻고 새 갑옷으로 복구 가능", async ({ page }) => {
  await page.getByRole("button", { name: "강화하기" }).click();
  await page.getByRole("button", { name: "강화하기" }).click();

  await expect(page.locator("#armor-name")).toHaveText("갑옷 없음");
  await expect(page.locator("#recovery-box")).toBeVisible();
  await expect(page.locator("#scrap-value")).toHaveText("1");

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

test("+15 달성 결과를 표시하고 기록을 유지", async ({ page }) => {
  await page.addInitScript(() => {
    const state = JSON.parse(localStorage.getItem("armor-enhance-state-v1"));
    state.gold = 1000000;
    state.currentArmor = { level: 14 };
    state.pendingRecovery = null;
    localStorage.setItem("armor-enhance-state-v1", JSON.stringify(state));
  });
  await page.reload();

  await page.getByRole("button", { name: "강화하기" }).click();

  await expect(page.locator("#result-title")).toHaveText("전설의 갑옷 완성!");
  await expect(page.locator("#legendary-state")).toHaveText("달성 완료");
  await expect(page.locator("#stage-caption")).toHaveText("+15");
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
  await expect(page.locator("#gold-value")).toHaveText("5,000");
  await expect(page.locator("#scrap-value")).toHaveText("0");
  await expect(page.locator("#highest-level-value")).toHaveText("+0");
});
