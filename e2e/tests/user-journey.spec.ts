/**
 * SkillForge AI - End-to-End User Journey Tests
 * Comprehensive E2E tests covering complete user workflows
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const testUser = {
  firstName: 'John',
  lastName: 'Doe',
  email: `test-${Date.now()}@skillforge.ai`,
  password: 'SecurePassword123!',
};

const testSkills = [
  'Python',
  'JavaScript',
  'React',
  'Machine Learning',
  'Data Science'
];

// Helper functions
async function registerUser(page: Page, user: typeof testUser) {
  await page.goto('/register');
  
  await page.fill('[data-testid="first-name-input"]', user.firstName);
  await page.fill('[data-testid="last-name-input"]', user.lastName);
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.fill('[data-testid="confirm-password-input"]', user.password);
  
  await page.click('[data-testid="register-button"]');
  
  // Wait for success message
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
}

async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  
  await page.click('[data-testid="login-button"]');
  
  // Wait for dashboard to load
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
}

async function addSkillToProfile(page: Page, skillName: string) {
  await page.goto('/profile/skills');
  
  await page.click('[data-testid="add-skill-button"]');
  await page.fill('[data-testid="skill-search-input"]', skillName);
  await page.click(`[data-testid="skill-option-${skillName.toLowerCase()}"]`);
  
  // Set proficiency level
  await page.selectOption('[data-testid="proficiency-select"]', 'intermediate');
  
  // Add evidence
  await page.fill('[data-testid="evidence-textarea"]', `I have experience with ${skillName} from various projects.`);
  
  await page.click('[data-testid="save-skill-button"]');
  
  // Wait for skill to appear in list
  await expect(page.locator(`[data-testid="skill-item-${skillName.toLowerCase()}"]`)).toBeVisible();
}

test.describe('Complete User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto('/');
  });

  test('User Registration and Profile Setup', async ({ page }) => {
    // Step 1: Register new user
    await registerUser(page, testUser);
    
    // Step 2: Verify email verification notice
    await expect(page.locator('[data-testid="email-verification-notice"]')).toBeVisible();
    
    // Step 3: Navigate to login (simulating email verification)
    await page.click('[data-testid="login-link"]');
    
    // Step 4: Login with new credentials
    await loginUser(page, testUser.email, testUser.password);
    
    // Step 5: Complete profile setup
    await page.goto('/profile/setup');
    
    // Fill in profile information
    await page.fill('[data-testid="bio-textarea"]', 'Passionate software developer with expertise in full-stack development.');
    await page.fill('[data-testid="location-input"]', 'San Francisco, CA');
    await page.fill('[data-testid="current-role-input"]', 'Senior Software Engineer');
    await page.fill('[data-testid="current-company-input"]', 'Tech Corp');
    await page.selectOption('[data-testid="experience-select"]', '5');
    
    await page.click('[data-testid="save-profile-button"]');
    
    // Verify profile was saved
    await expect(page.locator('[data-testid="profile-success-message"]')).toBeVisible();
  });

  test('Skill Assessment and Management', async ({ page }) => {
    // Login first
    await loginUser(page, testUser.email, testUser.password);
    
    // Step 1: Add skills to profile
    for (const skill of testSkills) {
      await addSkillToProfile(page, skill);
    }
    
    // Step 2: Take skill assessment
    await page.goto('/assessments');
    await page.click('[data-testid="start-assessment-button"]');
    
    // Select skill for assessment
    await page.click(`[data-testid="assess-skill-python"]`);
    
    // Answer assessment questions
    const questions = await page.locator('[data-testid^="question-"]').count();
    
    for (let i = 0; i < questions; i++) {
      const questionElement = page.locator(`[data-testid="question-${i}"]`);
      await expect(questionElement).toBeVisible();
      
      // Select an answer (assuming multiple choice)
      await page.click(`[data-testid="answer-${i}-2"]`); // Select option 2
      
      if (i < questions - 1) {
        await page.click('[data-testid="next-question-button"]');
      }
    }
    
    // Submit assessment
    await page.click('[data-testid="submit-assessment-button"]');
    
    // Wait for results
    await expect(page.locator('[data-testid="assessment-results"]')).toBeVisible();
    
    // Verify score is displayed
    await expect(page.locator('[data-testid="assessment-score"]')).toContainText(/\d+/);
    
    // Step 3: View skill recommendations
    await page.click('[data-testid="view-recommendations-button"]');
    await expect(page.locator('[data-testid="skill-recommendations"]')).toBeVisible();
  });

  test('Job Search and Application', async ({ page }) => {
    // Login first
    await loginUser(page, testUser.email, testUser.password);
    
    // Step 1: Search for jobs
    await page.goto('/jobs');
    
    // Use search filters
    await page.fill('[data-testid="job-search-input"]', 'Python Developer');
    await page.fill('[data-testid="location-input"]', 'San Francisco');
    await page.selectOption('[data-testid="salary-range-select"]', '100000-150000');
    
    await page.click('[data-testid="search-jobs-button"]');
    
    // Wait for search results
    await expect(page.locator('[data-testid="job-results"]')).toBeVisible();
    
    // Step 2: View job details
    const firstJob = page.locator('[data-testid^="job-card-"]').first();
    await firstJob.click();
    
    await expect(page.locator('[data-testid="job-details"]')).toBeVisible();
    
    // Step 3: Check job match score
    await expect(page.locator('[data-testid="match-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="match-reasons"]')).toBeVisible();
    
    // Step 4: Apply to job
    await page.click('[data-testid="apply-button"]');
    
    // Fill application form
    await page.fill('[data-testid="cover-letter-textarea"]', 
      'I am excited to apply for this position. My experience with Python and machine learning makes me a great fit for this role.');
    
    // Upload resume (mock file upload)
    const fileInput = page.locator('[data-testid="resume-upload"]');
    await fileInput.setInputFiles({
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock PDF content')
    });
    
    await page.click('[data-testid="submit-application-button"]');
    
    // Verify application submitted
    await expect(page.locator('[data-testid="application-success"]')).toBeVisible();
    
    // Step 5: View application status
    await page.goto('/applications');
    await expect(page.locator('[data-testid="application-list"]')).toBeVisible();
    await expect(page.locator('[data-testid^="application-item-"]')).toHaveCount(1);
  });

  test('AI-Powered Learning and Recommendations', async ({ page }) => {
    // Login first
    await loginUser(page, testUser.email, testUser.password);
    
    // Step 1: Get AI skill recommendations
    await page.goto('/learning');
    
    await page.click('[data-testid="get-recommendations-button"]');
    
    // Wait for AI analysis
    await expect(page.locator('[data-testid="ai-analysis-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-recommendations"]')).toBeVisible({ timeout: 10000 });
    
    // Step 2: View personalized learning path
    const firstRecommendation = page.locator('[data-testid^="recommendation-"]').first();
    await firstRecommendation.click();
    
    await expect(page.locator('[data-testid="learning-path"]')).toBeVisible();
    
    // Step 3: Start learning module
    await page.click('[data-testid="start-learning-button"]');
    
    await expect(page.locator('[data-testid="learning-content"]')).toBeVisible();
    
    // Step 4: Complete learning activity
    await page.click('[data-testid="complete-activity-button"]');
    
    // Step 5: Take progress quiz
    await page.click('[data-testid="take-quiz-button"]');
    
    // Answer quiz questions
    const quizQuestions = await page.locator('[data-testid^="quiz-question-"]').count();
    
    for (let i = 0; i < quizQuestions; i++) {
      await page.click(`[data-testid="quiz-answer-${i}-1"]`);
      
      if (i < quizQuestions - 1) {
        await page.click('[data-testid="next-quiz-question-button"]');
      }
    }
    
    await page.click('[data-testid="submit-quiz-button"]');
    
    // Verify quiz results
    await expect(page.locator('[data-testid="quiz-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="quiz-score"]')).toContainText(/\d+/);
  });

  test('Career Path Analysis', async ({ page }) => {
    // Login first
    await loginUser(page, testUser.email, testUser.password);
    
    // Step 1: Access career analysis
    await page.goto('/career');
    
    await page.click('[data-testid="analyze-career-button"]');
    
    // Wait for AI analysis
    await expect(page.locator('[data-testid="career-analysis-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="career-paths"]')).toBeVisible({ timeout: 15000 });
    
    // Step 2: Explore career paths
    const careerPaths = await page.locator('[data-testid^="career-path-"]').count();
    expect(careerPaths).toBeGreaterThan(0);
    
    // Click on first career path
    const firstPath = page.locator('[data-testid^="career-path-"]').first();
    await firstPath.click();
    
    // Step 3: View detailed career information
    await expect(page.locator('[data-testid="career-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="required-skills"]')).toBeVisible();
    await expect(page.locator('[data-testid="salary-range"]')).toBeVisible();
    await expect(page.locator('[data-testid="career-timeline"]')).toBeVisible();
    
    // Step 4: Create career plan
    await page.click('[data-testid="create-plan-button"]');
    
    await page.fill('[data-testid="plan-name-input"]', 'My Career Development Plan');
    await page.fill('[data-testid="target-timeline-input"]', '2 years');
    
    await page.click('[data-testid="save-plan-button"]');
    
    // Verify plan created
    await expect(page.locator('[data-testid="plan-success"]')).toBeVisible();
  });

  test('Profile and Settings Management', async ({ page }) => {
    // Login first
    await loginUser(page, testUser.email, testUser.password);
    
    // Step 1: Update profile information
    await page.goto('/profile');
    
    await page.click('[data-testid="edit-profile-button"]');
    
    // Update bio
    await page.fill('[data-testid="bio-textarea"]', 
      'Updated bio: Experienced full-stack developer with a passion for AI and machine learning.');
    
    // Update social links
    await page.fill('[data-testid="linkedin-input"]', 'https://linkedin.com/in/johndoe');
    await page.fill('[data-testid="github-input"]', 'https://github.com/johndoe');
    
    await page.click('[data-testid="save-profile-button"]');
    
    // Verify changes saved
    await expect(page.locator('[data-testid="profile-updated"]')).toBeVisible();
    
    // Step 2: Update privacy settings
    await page.goto('/settings/privacy');
    
    // Toggle privacy settings
    await page.click('[data-testid="profile-visibility-toggle"]');
    await page.click('[data-testid="skill-visibility-toggle"]');
    
    await page.click('[data-testid="save-privacy-button"]');
    
    // Step 3: Update notification preferences
    await page.goto('/settings/notifications');
    
    await page.click('[data-testid="email-notifications-toggle"]');
    await page.click('[data-testid="job-alerts-toggle"]');
    await page.click('[data-testid="learning-reminders-toggle"]');
    
    await page.click('[data-testid="save-notifications-button"]');
    
    // Step 4: Change password
    await page.goto('/settings/security');
    
    await page.fill('[data-testid="current-password-input"]', testUser.password);
    await page.fill('[data-testid="new-password-input"]', 'NewSecurePassword123!');
    await page.fill('[data-testid="confirm-new-password-input"]', 'NewSecurePassword123!');
    
    await page.click('[data-testid="change-password-button"]');
    
    // Verify password changed
    await expect(page.locator('[data-testid="password-changed"]')).toBeVisible();
  });

  test('Data Export and Account Deletion', async ({ page }) => {
    // Login first
    await loginUser(page, testUser.email, testUser.password);
    
    // Step 1: Export user data
    await page.goto('/settings/data');
    
    await page.click('[data-testid="export-data-button"]');
    
    // Wait for export to be prepared
    await expect(page.locator('[data-testid="export-preparing"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-ready"]')).toBeVisible({ timeout: 30000 });
    
    // Download export file
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-export-button"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('skillforge-data-export');
    
    // Step 2: Delete account
    await page.click('[data-testid="delete-account-button"]');
    
    // Confirm deletion
    await page.fill('[data-testid="delete-confirmation-input"]', 'DELETE');
    await page.fill('[data-testid="password-confirmation-input"]', 'NewSecurePassword123!');
    
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Verify account deleted and redirected to home
    await expect(page.locator('[data-testid="account-deleted"]')).toBeVisible();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Performance and Accessibility', () => {
  test('Page load performance', async ({ page }) => {
    // Test critical page load times
    const pages = [
      '/',
      '/login',
      '/register',
      '/dashboard',
      '/jobs',
      '/profile'
    ];
    
    for (const pagePath of pages) {
      const startTime = Date.now();
      await page.goto(pagePath);
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Assert page loads within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Check for performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        };
      });
      
      expect(performanceMetrics.domContentLoaded).toBeLessThan(2000);
    }
  });

  test('Accessibility compliance', async ({ page }) => {
    // Test key pages for accessibility
    const pages = [
      '/login',
      '/register',
      '/dashboard',
      '/profile'
    ];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Check for proper heading structure
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
      expect(headings).toBeGreaterThan(0);
      
      // Check for alt text on images
      const images = await page.locator('img').count();
      if (images > 0) {
        const imagesWithAlt = await page.locator('img[alt]').count();
        expect(imagesWithAlt).toBe(images);
      }
      
      // Check for form labels
      const inputs = await page.locator('input[type="text"], input[type="email"], input[type="password"], textarea').count();
      if (inputs > 0) {
        const labeledInputs = await page.locator('input[aria-label], input[aria-labelledby], textarea[aria-label], textarea[aria-labelledby]').count();
        expect(labeledInputs).toBe(inputs);
      }
      
      // Check for keyboard navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').count();
      expect(focusedElement).toBe(1);
    }
  });
});
