import { test, expect } from '@playwright/test'

test.describe('Dataset Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first (mock)
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/datasets')
  })

  test('shows dataset list page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Datasets')
    await expect(page.locator('text=Upload Dataset')).toBeVisible()
  })

  test('navigates to upload page', async ({ page }) => {
    await page.click('text=Upload Dataset')
    await expect(page).toHaveURL('/datasets/new')
  })
})

test.describe('Chart Builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/datasets')
  })

  test('shows chart builder for dataset', async ({ page }) => {
    // This would require a dataset to exist
    // We'll test the URL structure
    await page.goto('/datasets/test-id/charts/new')
    await expect(page.locator('h1')).toContainText('Create Chart')
  })
})

test.describe('Dashboard Builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/datasets')
  })

  test('shows dashboard list', async ({ page }) => {
    await page.goto('/dashboards')
    await expect(page.locator('h1')).toContainText('Dashboards')
    await expect(page.locator('text=Create Dashboard')).toBeVisible()
  })

  test('navigates to create dashboard', async ({ page }) => {
    await page.goto('/dashboards/new')
    await expect(page.locator('h1')).toContainText('Create Dashboard')
    await expect(page.locator('text=Dashboard Canvas')).toBeVisible()
  })
})

test.describe('NL Query', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/datasets')
  })

  test('shows query page for dataset', async ({ page }) => {
    await page.goto('/datasets/test-id/query')
    await expect(page.locator('h1')).toContainText('Natural Language Query')
    await expect(page.locator('text=Ask a question')).toBeVisible()
  })
})