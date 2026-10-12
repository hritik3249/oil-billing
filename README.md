# Oil Billing System — End-to-End API Testing Portfolio

A Next.js 14 + Playwright portfolio project demonstrating full-stack E2E testing for an oil billing system.

## What’s Included
- **App:** Oil billing dashboard (Next.js, React, Tailwind, Supabase)
- **E2E Tests:** `e2e/billing.spec.ts` — full customer creation → bill → dues flow + mobile viewport
- **Test Framework:** Playwright (`npm run test:e2e`)
- **CI:** `.github/workflows/test.yml` (GitHub Actions)
- **Setup:** `.env.test.local`, Playwright config

## Skills Demonstrated
- **Playwright E2E:** Login, navigation, form filling, assertions, cookies, mobile (`iPhone 12`)
- **Next.js:** App router, middleware (`middleware.ts`), auth server (`lib/auth-server.ts`)
- **Git / Version Control:** Clean commits with attribution
- **CI / DevOps:** GitHub Actions workflow for automated test runs
- **Documentation:** README, setup instructions, test reports

## How to Run Tests
```bash
npm install
npx playwright test        # headless
npx playwright test --ui   # interactive
```

## Portfolio Context
Created for job application — shows complete testing lifecycle from spec writing to CI integration.
