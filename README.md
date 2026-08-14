# Playwright, MySQL, Gmail, and Azure DevOps

This project runs Playwright tests, creates HTML/JUnit/JSON reports, stores the execution summary in MySQL, creates a ZIP of the HTML report, emails that ZIP through Gmail SMTP, and publishes the reports as Azure Pipeline artifacts.

## What the project produces

| Output | Location | Purpose |
| --- | --- | --- |
| HTML report | `playwright-report/` | Interactive Playwright report |
| JUnit report | `PlaywrightJunitReport.xml` | Azure DevOps test-results view |
| JSON report | `test-results/results.json` | Input for the MySQL summary |
| ZIP report | `playwright-report.zip` | Email attachment and pipeline artifact |

## Prerequisites

- Node.js 24 or later
- npm
- A supported Playwright browser installed
- MySQL server and a database for execution records (optional if database saving is not needed)
- A Gmail account with two-step verification and a Google App Password (optional if email sending is not needed)

Install the dependencies from the project root:

```powershell
npm ci
npx playwright install
```

On a Linux build agent, use this instead to install browser system dependencies too:

```bash
npx playwright install --with-deps
```

> Do not use `--with-deps` on a Windows self-hosted agent. Use `npx playwright install` there.

## Local configuration

Create a `.env` file in the project root. It is already excluded by `.gitignore`; never commit credentials.

```env
# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=playwright_reporting_gmail

# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-sender@gmail.com
SMTP_PASSWORD=your-16-character-google-app-password
EMAIL_FROM=your-sender@gmail.com
CLIENT_EMAIL=recipient@example.com

# Optional labels shown in the database record and email
BUILD_BUILDID=LOCAL
BUILD_BUILDNUMBER=LOCAL
BUILD_SOURCEBRANCHNAME=main
TEST_ENV=QA
```

### Gmail App Password

1. Enable two-step verification on the sender Gmail account.
2. Create a Google **App Password** for Mail.
3. Put that 16-character value in `SMTP_PASSWORD`.

`SMTP_PASSWORD` must not be the normal Gmail sign-in password. `SMTP_USER` and `EMAIL_FROM` should be the Gmail account that created the App Password.

### MySQL table

The database script inserts into `test_execution_gmail`. Create the database and table before running the database step:

```sql
CREATE DATABASE IF NOT EXISTS playwright_reporting_gmail;
USE playwright_reporting_gmail;

CREATE TABLE IF NOT EXISTS test_execution_gmail (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  build_id VARCHAR(100) NOT NULL,
  build_number VARCHAR(100) NOT NULL,
  branch_name VARCHAR(255) NOT NULL,
  environment VARCHAR(50) NOT NULL,
  total_tests INT NOT NULL,
  passed_tests INT NOT NULL,
  failed_tests INT NOT NULL,
  skipped_tests INT NOT NULL,
  duration_seconds INT NOT NULL,
  execution_status VARCHAR(20) NOT NULL,
  report_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Run locally

Run a project in `playwright.config.js` (for example, Chromium):

```powershell
npx playwright test --project=chromium
```

After the tests finish, run the remaining steps in this order:

```powershell
node scripts/test-db.js
node scripts/save-report-to-db.js
node scripts/zip-report.js
node scripts/send-report-email.js
```

The ZIP must be created before the email command, because the email attaches `playwright-report.zip`.

## Page Object Model and login test data

The Demoblaze login flow is organized as a Page Object Model (POM):

```text
pages/DemoblazeLoginPage.js    → locators and login/logout actions
test-data/testdata.json        → valid and invalid credentials/data sets
tests/demoblaze.spec.js        → data-driven Playwright tests
```

`test-data/testdata.json` provides these data sets:

- `validCredentials` is used by the successful login and logout test.
- `invalidCredentials` is an array. Each object creates one failed-login test and verifies the expected alert message.

Update `validCredentials` with a dedicated Demoblaze test account. Do not place production credentials in the JSON file. Invalid data remains in source control because it is not sensitive.

For a local override without editing JSON, set these values in `.env`:

```env
DEMOBLAZE_USERNAME=your_demoblaze_test_user
DEMOBLAZE_PASSWORD=your_demoblaze_test_password
```

The valid-login test uses `DEMOBLAZE_USERNAME` and `DEMOBLAZE_PASSWORD` when they are present; otherwise, it uses `test-data/testdata.json`. This permits the same tests to run locally and in Azure DevOps without committing a real password.

## Azure DevOps configuration

The pipeline is defined in `azure-pipelines-git-gmail.yml` and uses the `LocalAgents` self-hosted agent pool.

### Create and run the `LocalAgents` self-hosted pool (Windows)

Use a dedicated Windows machine or VM that stays online while builds run. Do not install the agent in this repository; Azure DevOps updates and work folders belong in a separate, administrator-protected directory such as `C:\agents`.

#### Option A: Configure an extracted agent

From the agent folder, run:

```powershell
.\config.cmd
```

At the prompts, use `https://dev.azure.com/<organization>` for the server URL, select `PAT` authentication, provide your Personal Access Token, choose `Default`, `LocalAgents`, or another pool, enter a unique agent name, and accept `_work` as the work folder.

Start the agent interactively with:

```powershell
.\run.cmd
```

#### Option B: Full setup, service, and maintenance commands

Use these commands when you need to extract the downloaded agent package first. Replace the ZIP filename if Azure DevOps supplied a different version.

```powershell
# Create agent directory and extract the package
mkdir agent
cd agent
Expand-Archive -Path .\vsts-agent-win-x64-5.277.0.zip -DestinationPath .

# Configure the agent interactively
.\config.cmd

# Run the agent interactively
.\run.cmd
```

For an unattended configuration, replace the placeholders and keep the PAT private:

```powershell
.\config.cmd --unattended `
  --url https://dev.azure.com/<organization> `
  --auth pat --token <PAT_TOKEN> `
  --pool LocalAgents --agent windows-playwright-01 `
  --work _work
```

Install and start the agent as a Windows service from an elevated PowerShell window:

```powershell
.\svc install
.\svc start
```

```powershell
# Stop or uninstall the service
.\svc stop
.\svc uninstall

# Remove the agent configuration
.\config.cmd remove

# Check agent version and run diagnostics
.\bin\Agent.Listener.exe --version
.\run.cmd --diag
```

1. In Azure DevOps, select **Organization settings → Pipelines → Agent pools → Add pool**.
2. Select **Self-hosted**, name the pool `LocalAgents`, and create it.
3. Open the new **LocalAgents** pool, select **Agents → New agent**, choose **Windows**, and download the agent ZIP shown by Azure DevOps.
4. Open an **elevated PowerShell** window. Do not use Git Bash or PowerShell ISE for agent configuration.
5. Create an agent folder with no spaces in its path, for example `C:\agents\local-agent`, and extract the downloaded ZIP there.
6. Create a short-lived Azure DevOps Personal Access Token (PAT): select **User settings → Personal access tokens → New Token**, then choose the **Agent Pools (Read & manage)** scope. Copy it immediately; Azure DevOps shows it only once.
7. From the extracted agent folder, run:

   ```powershell
   .\config.cmd
   ```

   Answer the prompts as follows:

   | Prompt | Value |
   | --- | --- |
   | Server URL | `https://dev.azure.com/<your-organization>` |
   | Authentication type | `PAT` |
   | Personal access token | The PAT created in step 6 |
   | Agent pool | `LocalAgents` |
   | Agent name | A unique machine name, for example `windows-playwright-01` |
   | Work folder | `_work` (default is suitable) |
   | Run as service | `Y` (recommended) |

8. If the service was not installed during configuration, install and start it from the agent folder in elevated PowerShell:

   ```powershell
   .\svc install
   .\svc start
   ```

9. Return to **Organization settings → Agent pools → LocalAgents → Agents**. The agent must show **Online** before queuing the pipeline.

The PAT is used for agent registration, not stored in the pipeline. Revoke it after use if your organization policy permits, or keep it only for the agent-registration lifecycle and rotate it before its expiry.

### Prepare the LocalAgents machine

Run the following once on the machine that hosts the agent (not in Azure DevOps):

```powershell
git --version
node --version
npm --version
```

Install Git and Node.js if any command is unavailable. The pipeline runs `npm ci`, but it requires Git/Node and internet access to download packages and Playwright browsers. Since this project uses a Windows self-hosted pool, set the browser install step in `azure-pipelines-git-gmail.yml` to `npx playwright install`, as described below.

The Windows account that runs the agent service must be able to:

- Read and write the agent work folder.
- Reach Azure DevOps, npm, the test sites, the MySQL server, and `smtp.gmail.com` on port `587`.
- Run Node.js, Playwright browser processes, and the pipeline scripts.

If a company firewall restricts outbound traffic, allow Azure DevOps and agent downloads. Microsoft documents the required endpoints and recommends allowing `dev.azure.com` and `download.agent.dev.azure.com` (or `*.dev.azure.com`).

### 1. Enable the variable group in YAML

The current YAML has the variable-group declaration commented out. Enable it before running the pipeline:

```yaml
variables:
  - group: SMTPConfig
```

`SMTPConfig` is only a name; it contains both SMTP and database variables in this project.

### 2. Create and authorize the variable group

In Azure DevOps, open **Pipelines → Library → + Variable group**, name it `SMTPConfig`, and add these variables:

| Variable | Example / purpose | Secret? |
| --- | --- | --- |
| `DB_HOST` | MySQL server hostname | No |
| `DB_PORT` | `3306` | No |
| `DB_USER` | MySQL user | No |
| `DB_PASSWORD` | MySQL password | Yes |
| `DB_NAME` | `playwright_reporting_gmail` | No |
| `SMTP_HOST` | `smtp.gmail.com` | No |
| `SMTP_PORT` | `587` | No |
| `SMTP_USER` | Sender Gmail address | No |
| `SMTP_PASSWORD` | Gmail App Password | Yes |
| `EMAIL_FROM` | Sender Gmail address | No |
| `CLIENT_EMAIL` | Recipient email address | No |
| `DEMOBLAZE_USERNAME` | Dedicated valid Demoblaze test-account username | Yes |
| `DEMOBLAZE_PASSWORD` | Dedicated valid Demoblaze test-account password | Yes |

Save the group and select **Pipeline permissions** (or authorize it when the pipeline first runs) to permit this pipeline to use it. Secret values are masked in logs, but do not print or echo them in pipeline scripts.

The `Run Playwright tests` step passes the two Demoblaze variables into the test process:

```yaml
env:
  CI: 'true'
  DEMOBLAZE_USERNAME: $(DEMOBLAZE_USERNAME)
  DEMOBLAZE_PASSWORD: $(DEMOBLAZE_PASSWORD)
```

This overrides only the valid login data. The invalid username/password cases and their expected error messages continue to come from `test-data/testdata.json`.

### 3. Define the browser variable

The pipeline runs:

```yaml
npx playwright test --project=$(browser)
```

Create a pipeline variable named `browser` with one of the project names from `playwright.config.js`:

```text
chromium
firefox
webkit
```

For the simplest setup, use `chromium`. An undefined `browser` variable results in an invalid Playwright project command.

### 4. Prepare the self-hosted agent

The agent must have:

- Internet access to the test websites, `smtp.gmail.com:587`, and the MySQL server.
- Permission to reach the MySQL server port (normally `3306`).
- Node.js available, or permission for the `UseNode@1` task to install it.
- Playwright browser dependencies appropriate for the agent operating system.

If `LocalAgents` runs on Windows, change the pipeline browser-install command to:

```yaml
- script: npx playwright install
  displayName: 'Install Playwright browsers'
```

Keep `npx playwright install --with-deps` only for Linux agents.

### 5. Queue and run the pipeline

1. Commit and push `azure-pipelines-git-gmail.yml` and the project source to the configured branch (`main`).
2. In Azure DevOps, open **Pipelines**, select this pipeline, and select **Run pipeline**.
3. Select branch `main` and set the `browser` variable to `chromium` (or `firefox` / `webkit`).
4. Select **Run**. The job should be queued under the `LocalAgents` pool and then picked up by the online agent.
5. Open the running job and check each step. After completion, review the JUnit Tests tab and download the published HTML and ZIP artifacts.

If the job stays queued, open **Agent pools → LocalAgents** and confirm that an agent is online and permitted to use the pool. If the job starts but fails before tests, verify the agent machine prerequisites and the Windows browser-install command.

### Pipeline order

The intended sequence is:

```text
Install dependencies → Install browsers → Run tests → Save MySQL summary
→ Create report ZIP → Email ZIP → Publish ZIP/HTML artifacts → Publish JUnit results
```

The reporting, ZIP, email, and publishing steps use `condition: always()` so that failed tests still produce artifacts and an email report. The email script exits with code `1` if sending fails, so an SMTP failure marks the pipeline as failed. To make email optional, add `continueOnError: true` to the `Email Playwright Report` step.

## Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| `Missing project name` or an invalid project | Create the Azure `browser` variable, e.g. `chromium`. |
| `535 Authentication failed` | Use a valid Gmail App Password; do not use the Gmail login password. |
| `ETIMEDOUT` or `ECONNREFUSED` for SMTP | Permit the agent to reach `smtp.gmail.com` on port `587`; check firewall/proxy rules. |
| Email variables are empty in Azure | Uncomment the variable-group YAML section and authorize `SMTPConfig` for the pipeline. |
| `Playwright JSON report not found` | Run Playwright before `save-report-to-db.js`; it creates `test-results/results.json`. |
| ZIP file is missing | Run `node scripts/zip-report.js` after Playwright has created `playwright-report/`. |
| Database connection failure | Check the DB variables, MySQL firewall access, database name, and the `test_execution_gmail` table. |

## Security

- Keep `.env` local and out of source control.
- Store `DB_PASSWORD` and `SMTP_PASSWORD` as Azure DevOps secret variables.
- Rotate a password or Gmail App Password immediately if it is ever exposed in a log, screenshot, commit, or chat.
