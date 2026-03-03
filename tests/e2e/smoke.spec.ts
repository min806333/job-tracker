import { expect, test, type Page } from "@playwright/test";

async function dismissBlockingOverlays(page: Page) {
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
}

test.describe("Dashboard smoke", () => {
  test("1) 로그인 상태로 대시보드 진입 후 핵심 섹션 노출", async ({ page }) => {
    await page.goto("/dashboard");
    await dismissBlockingOverlays(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId("today-now-section")).toBeVisible();
  });

  test("2) 플랜 pill 클릭 시 /dashboard/plan 이동", async ({ page }) => {
    await page.goto("/dashboard");
    await dismissBlockingOverlays(page);
    await page.getByTestId("plan-pill-desktop").click();
    await expect(page).toHaveURL(/\/dashboard\/plan/);
    await expect(page.getByTestId("plan-page")).toBeVisible();
  });

  test.describe("mobile (iPhone 14)", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("3) 모바일 하단바 표시 및 컨텐츠 가림 기본 체크", async ({ page }) => {
      await page.goto("/dashboard");
      await dismissBlockingOverlays(page);
      await expect(page.getByTestId("mobile-bottom-bar")).toBeVisible();
      await expect(page.getByTestId("mobile-quick-add-button")).toBeVisible();

      await page.getByTestId("mobile-filter-sort-button").click();
      await expect(page.getByTestId("list-tab-section")).toBeVisible();

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const barBox = await page.getByTestId("mobile-bottom-bar").boundingBox();
      expect(barBox).not.toBeNull();

      const cards = page.locator('[data-testid="list-tab-section"] article[role="button"]');
      if ((await cards.count()) > 0) {
        const lastCard = cards.last();
        await lastCard.scrollIntoViewIfNeeded();
        const lastBox = await lastCard.boundingBox();
        expect(lastBox).not.toBeNull();
        if (barBox && lastBox) {
          expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(barBox.y + 2);
        }
      }
    });

    test("4) 필터/정렬 UI 열기 + 다크 메뉴 컨테이너 확인", async ({ page }) => {
      await page.goto("/dashboard");
      await dismissBlockingOverlays(page);
      await page.getByTestId("mobile-filter-sort-button").click();

      const filterButton = page.getByTestId("list-filter-button");
      await expect(filterButton).toBeVisible();
      await filterButton.focus();
      await page.keyboard.press("Enter");
      const filterMenu = page.getByTestId("list-filter-menu");
      await expect(filterMenu).toBeVisible();

      const bgColor = await filterMenu.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      expect(bgColor).not.toBe("rgb(255, 255, 255)");
    });
  });

  test("5) 업그레이드 버튼 클릭 시 checkout 시작(/api/stripe/checkout 호출)", async ({ page }) => {
    let checkoutCalled = false;

    await page.route("**/api/stripe/checkout", async (route) => {
      checkoutCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test_mock" }),
      });
    });

    await page.goto("/dashboard/plan");
    await dismissBlockingOverlays(page);
    const upgradeButton = page.getByTestId("plan-upgrade-button");
    if (!(await upgradeButton.isVisible())) {
      test.skip(true, "Current test user is already Pro/Grace; no upgrade CTA.");
    }
    await upgradeButton.click();

    await expect.poll(() => checkoutCalled).toBe(true);
  });
});
