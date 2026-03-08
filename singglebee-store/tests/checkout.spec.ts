import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
    test('should allow a user to add a product to cart and proceed to checkout', async ({ page }) => {
        // 1. Go to products page
        await page.goto('/products');

        // 2. Click on the first product
        const firstProduct = page.locator('a[href^="/products/"]').first();
        await expect(firstProduct).toBeVisible();
        await firstProduct.click();

        // 3. Add to cart
        const addToCartButton = page.getByRole('button', { name: /add to cart/i });
        await expect(addToCartButton).toBeVisible();
        await addToCartButton.click();

        // 4. Go to cart
        await page.goto('/cart');
        await expect(page.getByText(/your cart/i)).toBeVisible();

        // 5. Proceed to checkout
        const checkoutButton = page.getByRole('link', { name: /checkout/i });
        await expect(checkoutButton).toBeVisible();
        await checkoutButton.click();

        // 6. Verify checkout page (simplified, usually redirects to Stripe or internal checkout)
        await expect(page).toHaveURL(/\/checkout/);
    });
});
