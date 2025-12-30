const fs = require("fs");
const path = require("path");

const BASE_DIR = path.join(__dirname, "../uploads");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const saveBase64Html = (base64Content, filePrefix) => {
  if (!base64Content) return null;

  const buffer = Buffer.from(base64Content, "base64");
  ensureDir(BASE_DIR);

  const fileName = `${filePrefix}_${Date.now()}.html`;
  const filePath = path.join(BASE_DIR, fileName);

  fs.writeFileSync(filePath, buffer);

  return `/uploads/crif/${fileName}`;
}

module.exports = { saveBase64Html };
