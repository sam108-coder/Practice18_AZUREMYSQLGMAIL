require("dotenv").config();

const mysql = require("mysql2/promise");

async function testDatabase() {

    const connection = await mysql.createConnection({

        host: process.env.DB_HOST,

        port: Number(process.env.DB_PORT),

        user: process.env.DB_USER,

        password: process.env.DB_PASSWORD,

        database: process.env.DB_NAME

    });

    console.log("MySQL connected successfully!");

    const [rows] = await connection.execute(
        "SELECT DATABASE() AS databaseName"
    );

    console.log("Database:", rows[0].databaseName);

    await connection.end();
}

testDatabase().catch(error => {

    console.error("Database connection failed:");

    console.error(error.message);

    process.exit(1);

});