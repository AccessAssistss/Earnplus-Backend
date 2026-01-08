const fs = require("fs");
const path = require("path");

const saveJsonResponse = async (folderName, fileName, data) => {
    try {
        const PROJECT_ROOT = process.cwd();

        const dirPath = path.join(
            PROJECT_ROOT,
            "logs",
            "new",
            folderName
        );

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        const filePath = path.join(dirPath, `${fileName}.json`);

        await fs.promises.writeFile(
            filePath,
            JSON.stringify(data, null, 2),
            "utf8"
        );

        console.log("JSON saved at:", filePath);
        return filePath;
    } catch (err) {
        console.error("Failed to save JSON response:", err.message);
        return null;
    }
};

module.exports = { saveJsonResponse };
