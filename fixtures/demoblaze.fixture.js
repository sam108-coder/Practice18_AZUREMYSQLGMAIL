import { test as base, expect } from "@playwright/test";
import { DemoblazeLoginPage } from "../pages/DemoblazeLoginPage.js";
import testData from "../test-data/testdata.json";

/**
 * Project-specific Playwright fixtures.
 * Import `test` from this file in Demoblaze tests instead of @playwright/test.
 */
export const test = base.extend({
    loginPage: async ({ page }, use) => {
        await use(new DemoblazeLoginPage(page));
    },

    validCredentials: async ({}, use) => {
        await use({
            username: process.env.DEMOBLAZE_USERNAME || testData.validCredentials.username,
            password: process.env.DEMOBLAZE_PASSWORD || testData.validCredentials.password
        });
    }
});

export { expect, testData };
