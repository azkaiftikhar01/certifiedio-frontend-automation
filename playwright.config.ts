import { defineConfig, devices } from '@playwright/test';
// Load .env if present without making it a hard dependency
try { require('dotenv').config(); } catch {}

const DEMO_URL = process.env.DEMO_URL || 'https://demo.certified.io';
const ETRAINING_URL = process.env.ETRAINING_URL || 'https://etraining.certified.io';
const ETRAINING_STAGE_URL = process.env.ETRAINING_STAGE_URL || 'https://etraining-stage.certified.io';
const AIA_URL = process.env.AIA_URL || 'https://aia45775.certified.io';
const AIA_STAGE_URL = process.env.AIA_STAGE_URL || 'https://aia-stage.certified.io';
const AIFT_URL = process.env.AIFT_URL || 'https://aift45665.certified.io';
const AIFT_STAGE_URL = process.env.AIFT_STAGE_URL || 'https://aift-stage.certified.io';

export default defineConfig({
  testDir: './tests',
  outputDir: 'report/artifacts',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'report/html', open: 'never' }],
    ['json', { outputFile: 'report/results.json' }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    baseURL: DEMO_URL,
    testIdAttribute: 'data-testid',
  },
  projects: [
    {
      name: 'demo',
      testMatch: /demo-certifications\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: DEMO_URL },
      timeout: 300000, // 5 minutes default timeout
    },
    {
      name: 'etraining',
      testMatch: /etraining-certifications\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: ETRAINING_URL },
      timeout: 300000, // 5 minutes default timeout
    },
    {
      name: 'etraining-stage',
      testMatch: /etraining-stage-certifications\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: ETRAINING_STAGE_URL },
      timeout: 300000, // 5 minutes default timeout
    },
    {
      name: 'aia',
      testMatch: /aia-certifications\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: AIA_URL },
      timeout: 300000, // 5 minutes default timeout
    },
    {
      name: 'aia-stage',
      testMatch: /aia-stage-certifications\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: AIA_STAGE_URL },
      timeout: 300000, // 5 minutes default timeout
    },
    {
      name: 'aift',
      testMatch: /aift-certifications\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: AIFT_URL },
      timeout: 300000, // 5 minutes default timeout
    },
    {
      name: 'aift-stage',
      testMatch: /aift-stage-certifications\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: AIFT_STAGE_URL },
      timeout: 300000, // 5 minutes default timeout
    },
  ],
});




