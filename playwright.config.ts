import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5174', browserName: 'chromium', headless: true, trace: 'retain-on-failure' },
  // tests/run_postgres_e2e.py가 두 서버를 직접 관리하고 finally에서 정리한다.
});
