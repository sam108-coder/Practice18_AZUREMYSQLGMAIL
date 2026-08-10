import { expect } from "@playwright/test";

export class DemoblazeLoginPage {
    constructor(page) {
        this.page = page;
        this.loginLink = page.getByRole("link", { name: "Log in" });
        this.usernameInput = page.locator("#loginusername");
        this.passwordInput = page.locator("#loginpassword");
        this.loginButton = page.getByRole("button", { name: "Log in" });
        this.welcomeUser = page.locator("#nameofuser");
        this.logoutLink = page.getByRole("link", { name: "Log out" });
    }

    async open() {
        await this.page.goto("https://demoblaze.com/");
    }

    async openLoginDialog() {
        await this.loginLink.click();
        await expect(this.usernameInput).toBeVisible();
    }

    async fillCredentials(username, password) {
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
    }

    async submitLogin() {
        await this.loginButton.click();
    }

    async login(username, password) {
        await this.fillCredentials(username, password);
        await this.submitLogin();
    }

    async loginAndGetError(username, password) {
        await this.fillCredentials(username, password);

        const dialogPromise = this.page.waitForEvent("dialog");
        await this.submitLogin();
        const dialog = await dialogPromise;
        const message = dialog.message();
        await dialog.accept();

        return message;
    }

    async expectSuccessfulLogin(username) {
        await expect(this.welcomeUser).toHaveText(`Welcome ${username}`);
    }

    async logout() {
        await this.logoutLink.click();
        await expect(this.loginLink).toBeVisible();
    }
}
