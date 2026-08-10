const fs = require("fs");
const { ZipArchive } = require("archiver");

const output = fs.createWriteStream(
    "playwright-report.zip"
);

const archive = new ZipArchive({
    zlib: {
        level: 9
    }
});

output.on("close", () => {

    console.log(
        `ZIP created successfully: ${archive.pointer()} bytes`
    );

});

archive.on("error", (error) => {

    throw error;

});

archive.pipe(output);

archive.directory(
    "playwright-report/",
    "playwright-report"
);

archive.finalize();
