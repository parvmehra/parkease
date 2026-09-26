import { test, expect } from "@playwright/test";

const VENDOR = { email: "vendor@parkease.demo", password: "Demo@1234" };

test.describe("Vendor flow", () => {
    test("can log in, see real overview stats, and inspect a lot's layout", async ({ page }) => {
        const errors = [];
        page.on("pageerror", (err) => errors.push(String(err)));

        await page.goto("/login");
        await page.fill('input[type="email"]', VENDOR.email);
        await page.fill('input[type="password"]', VENDOR.password);
        await page.click('button[type="submit"]');

        await expect(page.getByText("Vendor dashboard")).toBeVisible({ timeout: 10000 });
        await expect(page.getByText("Parking lots")).toBeVisible();
        await expect(page.getByText("Total slots")).toBeVisible();

        await page.locator("button:has-text('Manage')").first().click();
        await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });

        await page.locator("canvas").first().click({ position: { x: 50, y: 100 } });
        await expect(page.getByText("Slot details")).toBeVisible();

        expect(errors).toEqual([]);
    });

    test("can open the parking layout editor and add a slot", async ({ page }) => {
        await page.goto("/login");
        await page.fill('input[type="email"]', VENDOR.email);
        await page.fill('input[type="password"]', VENDOR.password);
        await page.click('button[type="submit"]');
        await expect(page.getByText("Vendor dashboard")).toBeVisible({ timeout: 10000 });

        await page.locator("button:has-text('Manage')").first().click();
        await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });

        await page.getByRole("button", { name: "Edit layout" }).click();
        await page.getByRole("button", { name: "Add slot" }).click();
        await page.locator("canvas").first().click({ position: { x: 200, y: 250 } });

        await expect(page.getByText("Slot number / name")).toBeVisible({ timeout: 10000 });
    });

    test("analytics page renders real charts without console errors", async ({ page }) => {
        const errors = [];
        page.on("pageerror", (err) => errors.push(String(err)));

        await page.goto("/login");
        await page.fill('input[type="email"]', VENDOR.email);
        await page.fill('input[type="password"]', VENDOR.password);
        await page.click('button[type="submit"]');
        await expect(page.getByText("Vendor dashboard")).toBeVisible({ timeout: 10000 });

        await page.getByRole("link", { name: "Analytics" }).click();
        await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
        await expect(page.getByText(/Bookings by day|Not enough data yet/)).toBeVisible({ timeout: 10000 });

        expect(errors).toEqual([]);
    });
});
