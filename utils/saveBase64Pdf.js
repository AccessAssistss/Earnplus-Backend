const fs = require("fs");
const path = require("path");

const BASE_UPLOADS_DIR = path.join(__dirname, "../uploads");

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function saveBase64Pdf(base64String, entity, subFolder, filenamePrefix) {
    if (!base64String) return null;

    const cleanedBase64 = base64String.replace(/^"+|"+$/g, "");

    const buffer = Buffer.from(cleanedBase64, "base64");

    const uploadDir = path.join(BASE_UPLOADS_DIR, entity, subFolder);
    ensureDir(uploadDir);

    const fileName = `${filenamePrefix}-${Date.now()}.pdf`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, buffer);

    return `/uploads/${entity}/${subFolder}/${fileName}`;
}

module.exports = saveBase64Pdf;
