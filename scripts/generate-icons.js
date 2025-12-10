import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

const SOURCE_IMAGE = 'pics/PSLogo512.png'; // Default source
const OUTPUT_DIR = 'public';

const SIZES = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.png', size: 64 },
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
];

async function generateIcons() {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR);
    }

    console.log(`Reading source image from ${SOURCE_IMAGE}...`);
    const image = await Jimp.read(SOURCE_IMAGE);

    for (const icon of SIZES) {
      const outputPath = path.join(OUTPUT_DIR, icon.name);
      console.log(`Generating ${icon.name} (${icon.size}x${icon.size})...`);
      
      await image
        .clone()
        .resize({ w: icon.size, h: icon.size }) // New API might use object? Or just resize(w, h)
        .write(outputPath); // New API might be write or save
    }
// ...

    console.log('Icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
