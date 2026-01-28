import { join } from 'node:path';
import sharp from 'sharp';

const ICONS_DIR = join(import.meta.dir, '../public/icons');

// Colors matching the app theme
const BACKGROUND_COLOR = '#0a0a0a';
const TEXT_COLOR = '#ffffff';

// Montserrat ExtraBold (800) font - Google Fonts URL for woff2
const MONTSERRAT_FONT_URL =
  'https://fonts.gstatic.com/s/montserrat/v29/JTUSjIg1_i6t8kCHKm459WRhyzbi.woff2';

// Icon sizes to generate
const SIZES = {
  'pwa-192x192.png': 192,
  'pwa-512x512.png': 512,
  'pwa-maskable-512x512.png': 512,
  'apple-touch-icon.png': 180,
};

// SVG icon size
const SVG_SIZE = 512;

/**
 * Fetch and convert font to base64 for SVG embedding
 */
async function fetchFontAsBase64(): Promise<string> {
  const response = await fetch(MONTSERRAT_FONT_URL);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

/**
 * Create an SVG with the DailySpin logo using embedded Montserrat font
 * For maskable icons, content is scaled down to fit within the safe zone (80% centered)
 */
function createLogoSvg(
  size: number,
  fontBase64: string,
  isMaskable: boolean = false,
): string {
  // For maskable icons, scale content to 80% and center it
  const contentScale = isMaskable ? 0.6 : 0.85;
  const fontSize = Math.round(size * 0.15 * contentScale);

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          @font-face {
            font-family: 'Montserrat';
            font-weight: 800;
            src: url('data:font/woff2;base64,${fontBase64}') format('woff2');
          }
        </style>
      </defs>
      <rect width="100%" height="100%" fill="${BACKGROUND_COLOR}"/>
      <text
        x="50%"
        y="50%"
        font-family="Montserrat, sans-serif"
        font-size="${fontSize}"
        font-weight="800"
        fill="${TEXT_COLOR}"
        text-anchor="middle"
        dominant-baseline="central"
        letter-spacing="-1"
      >DailySpin</text>
    </svg>
  `;
}

async function generateIcon(
  filename: string,
  size: number,
  fontBase64: string,
): Promise<void> {
  const isMaskable = filename.includes('maskable');
  const svg = createLogoSvg(size, fontBase64, isMaskable);

  const outputPath = join(ICONS_DIR, filename);

  await sharp(Buffer.from(svg)).png().toFile(outputPath);

  console.log(`Generated: ${filename} (${size}x${size})`);
}

/**
 * Create a lightweight SVG that references Google Fonts instead of embedding
 */
function createLightweightSvg(size: number): string {
  const fontSize = Math.round(size * 0.15 * 0.85);

  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800&amp;display=swap');
    </style>
  </defs>
  <rect width="100%" height="100%" fill="${BACKGROUND_COLOR}"/>
  <text
    x="50%"
    y="50%"
    font-family="Montserrat, sans-serif"
    font-size="${fontSize}"
    font-weight="800"
    fill="${TEXT_COLOR}"
    text-anchor="middle"
    dominant-baseline="central"
    letter-spacing="-1"
  >DailySpin</text>
</svg>`;
}

async function saveSvgIcon(): Promise<void> {
  const svg = createLightweightSvg(SVG_SIZE);
  const outputPath = join(ICONS_DIR, 'icon.svg');

  await Bun.write(outputPath, svg);

  console.log(`Generated: icon.svg (${SVG_SIZE}x${SVG_SIZE})`);
}

async function main(): Promise<void> {
  console.log('Generating PWA icons...\n');

  console.log('Fetching Montserrat font...');
  const fontBase64 = await fetchFontAsBase64();
  console.log('Font loaded.\n');

  for (const [filename, size] of Object.entries(SIZES)) {
    await generateIcon(filename, size, fontBase64);
  }

  await saveSvgIcon();

  console.log('\nDone! Icons generated in public/icons/');
  console.log(
    '\nNote: You may need to rebuild the app for changes to take effect.',
  );
}

main().catch(console.error);
