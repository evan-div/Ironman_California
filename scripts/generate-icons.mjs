// Regenerates the PNG app icons from public/icons/icon.svg.
// Usage: node scripts/generate-icons.mjs   (requires Playwright's Chromium)
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const svg = readFileSync("public/icons/icon.svg", "utf8");
const browser = await chromium.launch();
const render = async (file, size, { maskable = false, radius = true } = {}) => {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const art = radius && !maskable ? svg : svg.replace('rx="112"', 'rx="0"');
  const scale = maskable ? 0.8 : 1;
  await page.setContent(
    `<body style="margin:0;background:${maskable || !radius ? "#366B54" : "transparent"};display:grid;place-items:center;height:100vh"><div style="width:${size * scale}px;height:${size * scale}px">${art}</div></body>`,
  );
  await page.screenshot({ path: file, omitBackground: true });
  await page.close();
};
await render("public/icons/icon-192.png", 192);
await render("public/icons/icon-512.png", 512);
await render("public/icons/icon-maskable-512.png", 512, { maskable: true });
await render("src/app/apple-icon.png", 180, { radius: false });
await render("src/app/icon.png", 64);
await browser.close();
console.log("icons written");
