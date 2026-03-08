import { test, expect, type Page } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should allow a user to navigate to registration page', async ({ page }: { page: Page }) => {
        await page.goto('/');
        await page.click('text=Login');
        await expect(page).toHaveURL(/\/login/);

        await page.click('text=Register');
        await expect(page).toHaveURL(/\/register/);
    });

    test('should show error on invalid login', async ({ page }: { page: Page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'wrong@example.com');
        await page.fill('input[name="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');

        await expect(page.getByText(/invalid/i)).toBeVisible();
    });
});
