// Builds public/og.png (1200x630), the default social preview image.
// Run: node scripts/make-og.mjs
import sharp from "sharp";

const W = 1200, H = 630, PHOTO = 260;

const mask = Buffer.from(`<svg width="${PHOTO}" height="${PHOTO}"><circle cx="${PHOTO / 2}" cy="${PHOTO / 2}" r="${PHOTO / 2}"/></svg>`);
const photo = await sharp("public/umer.webp").resize(PHOTO, PHOTO).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();

const card = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#fafafa"/>
  <text x="90" y="290" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="84" font-weight="700" fill="#171717" letter-spacing="-2">Umer Khan</text>
  <text x="92" y="356" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="36" fill="#525252">Forward Deployed Engineer at Accenture</text>
  <rect x="92" y="400" width="64" height="2" fill="#171717"/>
  <text x="92" y="540" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="28" fill="#a3a3a3">umerkhan.io</text>
</svg>`);

await sharp(card).composite([{ input: photo, left: W - PHOTO - 90, top: (H - PHOTO) / 2 }]).png().toFile("public/og.png");
console.log("public/og.png written");
