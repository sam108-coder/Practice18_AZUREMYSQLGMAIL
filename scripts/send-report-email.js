require("dotenv").config();

const nodemailer = require("nodemailer");
const path = require("path");

async function sendReport() {

    const transporter = nodemailer.createTransport({

        host: process.env.SMTP_HOST,

        port: Number(process.env.SMTP_PORT || 587),

        secure: false,

        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }

    });

    await transporter.verify();

    const reportZip = path.resolve(
        "playwright-report.zip"
    );

    await transporter.sendMail({

        from: process.env.EMAIL_FROM,

        to: process.env.CLIENT_EMAIL,

        subject:
            `Playwright Automation Report - Build ${process.env.BUILD_BUILDNUMBER || "Local"}`,

        html: `
            <h2>Playwright Automation Execution Report</h2>

            <p>Hello Team,</p>

            <p>
                Please find the Playwright automation execution report
                attached to this email.
            </p>

            <table border="1" cellpadding="8">

                <tr>
                    <td><b>Build</b></td>
                    <td>${process.env.BUILD_BUILDNUMBER || "Local"}</td>
                </tr>

                <tr>
                    <td><b>Environment</b></td>
                    <td>${process.env.TEST_ENV || "QA"}</td>
                </tr>

                <tr>
                    <td><b>Branch</b></td>
                    <td>${process.env.BUILD_SOURCEBRANCHNAME || "Local"}</td>
                </tr>

            </table>

            <br>

            <p>
                Regards,<br>
                Automation Team
            </p>
        `,

        attachments: [
            {
                filename: "playwright-report.zip",
                path: reportZip
            }
        ]

    });

    console.log("Email sent successfully.");

}

sendReport().catch(error => {

    console.error("Email failed:", error);

    process.exit(1);

});
