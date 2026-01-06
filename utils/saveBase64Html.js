const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

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

  const fileName = `/crif/${filePrefix}_${Date.now()}.html`;
  const filePath = path.join(BASE_DIR, fileName);

  fs.writeFileSync(filePath, buffer);

  return `/uploads${fileName}`;
}

const htmlToBase64Pdf = async (html) => {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  return pdfBuffer.toString("base64");
}

module.exports = { saveBase64Html, htmlToBase64Pdf };
