import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('shows login form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Welcome back')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 5000 })
  })

  test('navigates to register page', async ({ page }) => {
    await page.click('text=Sign up')
    await expect(page).toHaveURL('/register')
    await expect(page.locator('h1')).toContainText('Create your account')
  })
})

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('shows registration form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Create your account')
    await expect(page.locator('input[type="text"]')).toBeVisible() // name
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('validates password match', async ({ page }) => {
    await page.fill('input[type="text"]', 'Test User')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.fill('input[id="confirmPassword"]', 'different123')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Passwords don\'t match')).toBeVisible()
  })

  test('navigates to login page', async ({ page }) => {
    await page.click('text=Sign in')
    await expect(page).toHaveURL('/login')
  })
})

test.describe('Protected Routes', () => {
  test('redirects to login when accessing dashboard without auth', async ({ page }) => {
    await page.goto('/datasets')
    await expect(page).toHaveURL('/login')
    await expect(page.locator('text=Welcome back')).toBeVisible()
  })

  test('redirects to login when accessing dashboards without auth', async ({ page }) => {
    await page.goto('/dashboards')
    await expect(page).toHaveURL('/login')
  })
})