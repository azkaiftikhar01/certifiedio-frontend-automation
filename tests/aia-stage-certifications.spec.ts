import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AIA_STAGE_EXPECTED_CERTIFICATIONS = [
  {
    title: 'BSB50420 Diploma of Leadership Management',
    subtitle: 'Diploma of Leadership Management',
  },
  {
    title: 'BSB60420 Advanced Diploma of Leadership Management',
    subtitle: 'Advanced Diploma of Leadership Management',
  },
  {
    title: 'CHC33021 Certificate IV in Ageing Support',
    subtitle: 'Certificate IV in Ageing Support',
  },
  {
    title: 'CHC43015 Certificate III in Individual Support',
    subtitle: 'Certificate III in Individual Support',
  },
  {
    title: 'CHC52025 Diploma of Community Services',
    subtitle: 'Diploma of Community Services',
  },
  {
    title: 'CHC52025 Graduate Diploma of Management',
    subtitle: 'Graduate Diploma of Management',
  },
] as const;

const DROPDOWN_SELECTOR =
  'div[class*="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-light-grey rounded-2xl shadow-2xl z-10"]';

test.describe('AIA-STAGE Environment - Certification Dropdown Validation', () => {
  test('verify AIA-STAGE certification dropdown shows all expected values', async ({ page }) => {
    // Very flexible timeout - allow up to 5 minutes for slow environments
    test.setTimeout(300000);
    const summary = {
      environment: 'AIA-STAGE',
      status: 'pending',
      expectedCertifications: AIA_STAGE_EXPECTED_CERTIFICATIONS.map((cert) => cert.title),
      expectedSubtitles: AIA_STAGE_EXPECTED_CERTIFICATIONS.map((cert) => cert.subtitle),
      actualCertifications: [] as string[],
      actualSubtitles: [] as string[],
      missingCertifications: [] as string[],
      missingSubtitles: [] as string[],
      extraCertifications: [] as string[],
    };
    const summaryPath = path.resolve('report', 'aia-stage-summary.json');

    // Set very flexible timeouts for all operations
    page.setDefaultNavigationTimeout(180000); // 3 minutes for navigation
    page.setDefaultTimeout(60000); // 1 minute for other operations

    // Navigate - use domcontentloaded instead of networkidle (more reliable)
    console.log('AIA-STAGE: Navigating to registration page...');
    await page.goto('/new', { waitUntil: 'domcontentloaded', timeout: 180000 });

    // Wait for page to be interactive (don't wait for networkidle - it may never happen)
    await page.waitForLoadState('domcontentloaded');

    try {
      console.log('AIA-STAGE: Filling personal information...');
      // Fill personal info to get to step 2 with retries
      await page.fill('input[placeholder="First name"]', 'Test', { timeout: 60000 });
      await page.fill('input[placeholder="Last name"]', 'User', { timeout: 60000 });
      await page.fill('input[placeholder="Email address"]', 'test@example.com', { timeout: 60000 });
      await page.fill('input[placeholder="Phone number"]', '0412345678', { timeout: 60000 });
      await page.fill('input[type="password"]', 'TestPass123!', { timeout: 60000 });

      // Click continue and wait for navigation
      console.log('AIA-STAGE: Clicking Continue button...');
      await page.click('button:has-text("Continue")', { timeout: 60000 });

      // Wait for step 2 to load with very flexible timeout
      console.log('AIA-STAGE: Waiting for step 2 to load...');
      await page.waitForSelector('h1:has-text("Choose Your Path")', {
        state: 'visible',
        timeout: 180000
      });

      // Give a moment for the page to settle (don't wait for networkidle - unreliable)
      await page.waitForTimeout(2000);

      // Open certification dropdown
      console.log('AIA-STAGE: Opening certification dropdown...');
      await page.click('div[class*="cursor-pointer"]:has-text("Select your Qualification...")', {
        timeout: 60000
      });

      const dropdown = page.locator(DROPDOWN_SELECTOR);

      // Wait for dropdown to appear
      await dropdown.waitFor({ state: 'visible', timeout: 60000 });

      console.log('AIA-STAGE Environment - Verifying certification dropdown values...');

      // Wait for certifications to load using polling approach (more reliable than networkidle)
      console.log('AIA-STAGE: Waiting for certifications to load...');
      let certificationsLoaded = false;
      const maxWaitTime = 180000; // 3 minutes max
      const startTime = Date.now();
      const pollInterval = 2000; // Check every 2 seconds

      while (!certificationsLoaded && (Date.now() - startTime) < maxWaitTime) {
        const h3Elements = await dropdown.locator('h3').all();
        const IGNORE_TEXTS = new Set(['Cancel', 'Back', 'Continue']);
        const validTitles = [];

        for (const element of h3Elements) {
          const text = await element.textContent();
          if (text && text.trim() && !IGNORE_TEXTS.has(text.trim())) {
            validTitles.push(text.trim());
          }
        }

        if (validTitles.length > 0) {
          console.log(`AIA-STAGE: Found ${validTitles.length} certifications after ${Math.round((Date.now() - startTime) / 1000)}s`);
          certificationsLoaded = true;
        } else {
          await page.waitForTimeout(pollInterval);
        }
      }

      if (!certificationsLoaded) {
        throw new Error(
          'AIA-STAGE certifications did not load: no valid <h3> titles found in dropdown within 180s. ' +
          'Check backend/API or UI for errors (API may be taking too long to respond).'
        );
      }

      // Give a moment for all certifications to fully render
      await page.waitForTimeout(1000);

      // Capture actual certification titles (h3) with retry logic
      const collectCertifications = async (retries = 5) => {
        for (let i = 0; i < retries; i++) {
          const titleTexts = await dropdown.locator('h3').allTextContents();
          const IGNORE_TEXTS = new Set(['Cancel', 'Back', 'Continue']);
          const validTitles = titleTexts
            .map((text) => text.trim())
            .filter(Boolean)
            .filter((text) => !IGNORE_TEXTS.has(text));

          if (validTitles.length > 0) {
            summary.actualCertifications = validTitles;
            return;
          }

          if (i < retries - 1) {
            console.log(`AIA-STAGE: Retrying certification collection (attempt ${i + 1}/${retries})...`);
            await page.waitForTimeout(2000);
          }
        }
      };

      await collectCertifications();

      // Capture secondary/subtitle texts (commonly <p> tags)
      const subtitleCandidates = await dropdown.locator('p').allTextContents();
      summary.actualSubtitles = subtitleCandidates.map((text) => text.trim()).filter(Boolean);

      console.log(`📋 AIA-STAGE - Found ${summary.actualCertifications.length} certification titles in dropdown`);
      console.log(`📋 AIA-STAGE - Titles: ${summary.actualCertifications.join(', ')}`);
      console.log(`📋 AIA-STAGE - Subtitles: ${summary.actualSubtitles.join(', ')}`);

      summary.extraCertifications = summary.actualCertifications.filter(
        (actual) =>
          !summary.expectedCertifications.some(
            (expected) =>
              actual.includes(expected) ||
              expected.includes(actual) ||
              actual.toLowerCase() === expected.toLowerCase()
          )
      );

      // Verify each certification title/subtitle pair is visible in the dropdown with retries
      for (const cert of AIA_STAGE_EXPECTED_CERTIFICATIONS) {
        console.log(`AIA-STAGE: Checking for certification: ${cert.title}`);
        const titleLocator = dropdown.locator('h3', { hasText: cert.title }).first();

        // Wait for title with retries
        let titleCount = 0;
        for (let attempt = 0; attempt < 5; attempt++) {
          titleCount = await titleLocator.count();
          if (titleCount > 0) break;
          if (attempt < 4) {
            console.log(`AIA-STAGE: Retrying title check for ${cert.title} (attempt ${attempt + 1}/5)...`);
            await page.waitForTimeout(2000);
          }
        }

        if (titleCount === 0) {
          summary.missingCertifications.push(cert.title);
          await expect(
            titleLocator,
            `AIA-STAGE certification missing: ${cert.title}\nTitles found: ${
              summary.actualCertifications.length > 0 ? summary.actualCertifications.join(', ') : 'none'
            }`
          ).toHaveCount(1);
        } else {
          await expect(titleLocator).toBeVisible({ timeout: 30000 });
          console.log(`✅ AIA-STAGE Found: ${cert.title}`);
        }

        // Check subtitle with retries
        const subtitleLocator = dropdown.locator(`text=${cert.subtitle}`).first();
        let subtitleVisible = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          subtitleVisible = await subtitleLocator.isVisible({ timeout: 30000 }).catch(() => false);
          if (subtitleVisible) break;
          if (attempt < 4) {
            console.log(`AIA-STAGE: Retrying subtitle check for ${cert.subtitle} (attempt ${attempt + 1}/5)...`);
            await page.waitForTimeout(2000);
          }
        }

        if (!subtitleVisible) {
          summary.missingSubtitles.push(cert.subtitle);
          await expect(
            subtitleVisible,
            `AIA-STAGE subtitle missing: ${cert.subtitle}\nSubtitles found: ${
              summary.actualSubtitles.length > 0 ? summary.actualSubtitles.join(', ') : 'none'
            }`
          ).toBeTruthy();
        } else {
          console.log(`✅ AIA-STAGE Subtitle Found: ${cert.subtitle}`);
        }
      }

      // Test selecting ONE certification only
      console.log(`AIA-STAGE Testing selection of: ${summary.expectedCertifications[0]}`);
      await page.click(`text=${summary.expectedCertifications[0]}`, { timeout: 60000 });

      // Just verify the dropdown closed
      await dropdown.waitFor({ state: 'hidden', timeout: 30000 });
      console.log(`✅ AIA-STAGE Selected: ${summary.expectedCertifications[0]}`);

      // STOP HERE - NO MORE STEPS
      console.log('✅ AIA-STAGE Certification dropdown validation complete - STOPPING HERE');

      // Take screenshot
      await page.screenshot({ path: 'report/aia-stage-certification-dropdown-validated.png' });

      console.log('AIA-STAGE Test completed - no registration attempted');
      summary.status = 'passed';
    } catch (error) {
      summary.status = 'failed';
      console.error('AIA-STAGE Test failed:', error);
      throw error;
    } finally {
      fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    }
  });
});
