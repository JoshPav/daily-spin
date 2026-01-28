import { join } from 'node:path';
import sharp from 'sharp';

const ICONS_DIR = join(import.meta.dir, '../public/icons');

// Colors matching the app theme
const BACKGROUND_COLOR = '#0a0a0a';
const TEXT_COLOR = '#ffffff';

// Icon sizes to generate
const SIZES = {
  'pwa-192x192.png': 192,
  'pwa-512x512.png': 512,
  'pwa-maskable-512x512.png': 512,
  'apple-touch-icon.png': 180,
};

/**
 * Create an SVG with the DailySpin logo
 * For maskable icons, content is scaled down to fit within the safe zone (80% centered)
 */
function createLogoSvg(size: number, isMaskable: boolean = false): string {
  // For maskable icons, scale content to 80% and center it
  const contentScale = isMaskable ? 0.6 : 0.85;
  const fontSize = Math.round(size * 0.15 * contentScale);

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${BACKGROUND_COLOR}"/>
      <text
        x="50%"
        y="50%"
        font-family="Arial Black, Helvetica, sans-serif"
        font-size="${fontSize}"
        font-weight="900"
        fill="${TEXT_COLOR}"
        text-anchor="middle"
        dominant-baseline="central"
        letter-spacing="-1"
      >DailySpin</text>
    </svg>
  `;
}

async function generateIcon(filename: string, size: number): Promise<void> {
  const isMaskable = filename.includes('maskable');
  const svg = createLogoSvg(size, isMaskable);

  const outputPath = join(ICONS_DIR, filename);

  await sharp(Buffer.from(svg)).png().toFile(outputPath);

  console.log(`Generated: ${filename} (${size}x${size})`);
}

async function main(): Promise<void> {
  console.log('Generating PWA icons...\n');

  for (const [filename, size] of Object.entries(SIZES)) {
    await generateIcon(filename, size);
  }

  console.log('\nDone! Icons generated in public/icons/');
  console.log(
    '\nNote: You may need to rebuild the app for changes to take effect.',
  );
}

main().catch(console.error);
