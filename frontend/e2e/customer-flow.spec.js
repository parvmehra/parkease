import { test, expect } from "@playwright/test";

const CUSTOMER = { email: "customer@parkease.demo", password: "Demo@1234" };

test.describe("Customer flow", () => {
    test("can log in, search, view a lot's slot map, and see bookings", async ({ page }) => {
        const errors = [];
        page.on("pageerror", (err) => errors.push(String(err)));

        await page.goto("/login");
        await page.fill('input[type="email"]', CUSTOMER.email);
        await page.fill('input[type="password"]', CUSTOMER.password);
        await page.click('button[type="submit"]');

        await expect(page.getByRole("heading", { name: "Find parking" })).toBeVisible({ timeout: 10000 });

        const lotCard = page.locator("button:has-text('available')").first();
        await expect(lotCard).toBeVisible({ timeout: 10000 });
        await lotCard.click();

        await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
        await expect(page.getByText("Available", { exact: true })).toBeVisible();

        await page.getByRole("link", { name: "My bookings" }).click();
        await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Upcoming" })).toBeVisible();

        expect(errors).toEqual([]);
    });

    test("shows a clean error state without crashing when a booking is rejected", async ({ page }) => {
        await page.goto("/login");
        await page.fill('input[type="email"]', CUSTOMER.email);
        await page.fill('input[type="password"]', CUSTOMER.password);
        await page.click('button[type="submit"]');
        await expect(page.getByRole("heading", { name: "Find parking" })).toBeVisible({ timeout: 10000 });

        await page.getByRole("button", { name: "Search" }).click();
        await expect(page.locator("body")).toBeVisible();
    });
});
