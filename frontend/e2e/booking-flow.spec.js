import { test, expect } from "@playwright/test";

const CUSTOMER = { email: "customer@parkease.demo", password: "Demo@1234" };

test("a customer can complete a real online booking end to end", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(String(err)));

    await page.goto("/login");
    await page.fill('input[type="email"]', CUSTOMER.email);
    await page.fill('input[type="password"]', CUSTOMER.password);
    await page.click('button[type="submit"]');
    await expect(page.getByRole("heading", { name: "Find parking" })).toBeVisible({ timeout: 10000 });

    await page.locator("button:has-text('available')").first().click();
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
    const box = await canvas.boundingBox();

    // The canvas is a hit-tested drawing surface, not real DOM elements, so
    // probe a small grid of points across it until an available (green) slot
    // is hit and the booking panel appears.
    const confirmButton = page.getByRole("button", { name: "Confirm booking" });
    let booked = false;
    outer: for (let fx = 0.1; fx <= 0.9; fx += 0.1) {
        for (let fy = 0.2; fy <= 0.8; fy += 0.2) {
            await canvas.click({ position: { x: box.width * fx, y: box.height * fy } });
            if (await confirmButton.isVisible({ timeout: 300 }).catch(() => false)) {
                booked = true;
                break outer;
            }
        }
    }
    expect(booked).toBe(true);

    const [bookingResponse] = await Promise.all([
        page.waitForResponse((res) => res.url().includes("/bookslot/") && res.request().method() === "POST"),
        confirmButton.click(),
    ]);
    expect(bookingResponse.status()).toBe(201);

    await expect(page).toHaveURL(/\/app\/bookings/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible();

    expect(errors).toEqual([]);
});
