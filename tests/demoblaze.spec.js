import { test, expect } from "@playwright/test";
import { DemoblazeLoginPage } from "../pages/DemoblazeLoginPage.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "test-data", "testdata.json"), "utf8")
);

const validCredentials = {
    username: process.env.DEMOBLAZE_USERNAME || testData.validCredentials.username,
    password: process.env.DEMOBLAZE_PASSWORD || testData.validCredentials.password
};

test.describe("Demoblaze login", () => {
    test("logs in and logs out with valid credentials", async ({ page }) => {
        const loginPage = new DemoblazeLoginPage(page);

        await loginPage.open();
        await loginPage.openLoginDialog();
        await loginPage.login(validCredentials.username, validCredentials.password);
        await loginPage.expectSuccessfulLogin(validCredentials.username);
        await loginPage.logout();
    });

    for (const credentials of testData.invalidCredentials) {
        test(`does not log in with ${credentials.name}`, async ({ page }) => {
            const loginPage = new DemoblazeLoginPage(page);

            await loginPage.open();
            await loginPage.openLoginDialog();

            await expect(
                loginPage.loginAndGetError(credentials.username, credentials.password)
            ).resolves.toBe(credentials.expectedMessage);
        });
    }
});
