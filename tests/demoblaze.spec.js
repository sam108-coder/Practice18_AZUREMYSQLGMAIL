import { test, expect, testData } from "../fixtures/demoblaze.fixture.js";

test.describe("Demoblaze login", () => {
    test("logs in and logs out with valid credentials", async ({ loginPage, validCredentials }) => {
        await loginPage.open();
        await loginPage.openLoginDialog();
        await loginPage.login(validCredentials.username, validCredentials.password);
        await loginPage.expectSuccessfulLogin(validCredentials.username);
        await loginPage.logout();
    });

    for (const credentials of testData.invalidCredentials) {
        test(`does not log in with ${credentials.name}`, async ({ loginPage }) => {
            await loginPage.open();
            await loginPage.openLoginDialog();

            await expect(
                loginPage.loginAndGetError(credentials.username, credentials.password)
            ).resolves.toBe(credentials.expectedMessage);
        });
    }
});
