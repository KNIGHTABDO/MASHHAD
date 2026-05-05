import { defineConfig, devices } from '@playwright/test'

const port = 3000
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: process.env.CI ? `npm run start -- -p ${port}` : `npm run dev -- -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_APP_URL: baseURL,
      MASHHAD_DISABLE_AUTH: '1',
      CLERK_WEBHOOK_SECRET: 'whsec_placeholder',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon_placeholder',
      SUPABASE_SERVICE_ROLE_KEY: 'service_role_placeholder',
      TMDB_API_KEY: 'tmdb_placeholder',
      REALDEBRID_API_TOKEN: 'rd_placeholder',
      OPENSUBTITLES_API_KEY: 'opensubtitles_placeholder',
      SUBDL_API_KEY: 'subdl_placeholder',
      STRIPE_SECRET_KEY: 'sk_test_placeholder',
      STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
    },
  },
})
