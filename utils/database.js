require("dotenv").config();

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5
});

async function saveTestExecution(data) {
    const query = `
        INSERT INTO test_execution
        (
            build_id,
            build_number,
            branch_name,
            environment,
            total_tests,
            passed_tests,
            failed_tests,
            skipped_tests,
            duration_seconds,
            execution_status,
            report_path
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        data.buildId,
        data.buildNumber,
        data.branchName,
        data.environment,
        data.totalTests,
        data.passedTests,
        data.failedTests,
        data.skippedTests,
        data.durationSeconds,
        data.executionStatus,
        data.reportPath
    ];

    await pool.execute(query, values);
}

async function closeDatabase() {
    await pool.end();
}

module.exports = {
    saveTestExecution,
    closeDatabase
};