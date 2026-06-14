import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "..", "public");
const appDir = path.resolve(__dirname, "..", "app");

const faviconSvg = await readFile(path.join(publicDir, "favicon.svg"));

const appleSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="#F2700C"/>
  <path d="M 10 100 L 35 50 L 55 85 L 90 25 L 120 80 L 150 55 L 170 100 Z" fill="#FFFFFF"/>
  <text x="90" y="155" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700" fill="#FFFFFF" text-anchor="middle">Merkao</text>
</svg>`);

const png16 = await sharp(faviconSvg, { density: 384 }).resize(16, 16).png().toBuffer();
const png32 = await sharp(faviconSvg, { density: 384 }).resize(32, 32).png().toBuffer();
const png48 = await sharp(faviconSvg, { density: 384 }).resize(48, 48).png().toBuffer();
const png180 = await sharp(appleSvg, { density: 384 }).resize(180, 180).png().toBuffer();

await writeFile(path.join(publicDir, "favicon-16x16.png"), png16);
await writeFile(path.join(publicDir, "favicon-32x32.png"), png32);
await writeFile(path.join(publicDir, "apple-touch-icon.png"), png180);

const ico = await pngToIco([png16, png32, png48]);
await writeFile(path.join(appDir, "favicon.ico"), ico);

console.log("Favicons generated.");
