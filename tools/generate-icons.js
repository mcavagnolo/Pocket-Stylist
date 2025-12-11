import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_ICON = path.join(__dirname, '../pics/Stylized app logo5.png');
const PUBLIC_DIR = path.join(__dirname, '../public');

async function generateIcons() {
  try {
    console.log('Reading source icon...');
    const icon = await Jimp.read(SOURCE_ICON);

    const sizes = [
      { name: 'favicon.png', size: 64 },
      { name: 'favicon-16x16.png', size: 16 },
      { name: 'favicon-32x32.png', size: 32 },
      { name: 'apple-touch-icon.png', size: 180 },
      { name: 'pwa-192x192.png', size: 192 },
      { name: 'pwa-512x512.png', size: 512 }
    ];

    for (const { name, size } of sizes) {
      console.log(`Generating ${name}...`);
      const resized = icon.clone().resize({ w: size, h: size });
      await resized.write(path.join(PUBLIC_DIR, name));
    }

    console.log('Icons generated successfully!');
  } catch (err) {
    console.error('Error generating icons:', err);
  }
}

generateIcons();
