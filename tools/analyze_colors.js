import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getColors() {
  try {
    // 1. Banner Background Color (Top-Left pixel)
    const bannerPath = path.join(__dirname, '../src/assets/banner.png');
    const banner = await Jimp.read(bannerPath);
    const bannerBgColor = banner.getPixelColor(0, 0);
    const bannerHex = '#' + bannerBgColor.toString(16).slice(0, -2).padStart(6, '0');
    console.log('Banner Background:', bannerHex);

    // 2. Logo Colors (Sample center and edges)
    const logoPath = path.join(__dirname, '../pics/Stylized app logo5.png');
    const logo = await Jimp.read(logoPath);
    
    // Sample the orange circle (usually around the edges or background of the figure)
    // Let's just scan for the most frequent non-white/non-transparent color
    const colorCounts = {};
    let maxCount = 0;
    let dominantColor = '';

    logo.scan(0, 0, logo.bitmap.width, logo.bitmap.height, (x, y, idx) => {
      const r = logo.bitmap.data[idx + 0];
      const g = logo.bitmap.data[idx + 1];
      const b = logo.bitmap.data[idx + 2];
      const a = logo.bitmap.data[idx + 3];

      if (a < 255) return; // Skip transparent
      if (r > 240 && g > 240 && b > 240) return; // Skip white

      const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      
      colorCounts[hex] = (colorCounts[hex] || 0) + 1;
      if (colorCounts[hex] > maxCount) {
        maxCount = colorCounts[hex];
        dominantColor = hex;
      }
    });

    console.log('Logo Dominant Color:', dominantColor);

    // Find an orange/red color
    let orangeColor = '';
    let maxOrangeCount = 0;
    
    logo.scan(0, 0, logo.bitmap.width, logo.bitmap.height, (x, y, idx) => {
        const r = logo.bitmap.data[idx + 0];
        const g = logo.bitmap.data[idx + 1];
        const b = logo.bitmap.data[idx + 2];
        const a = logo.bitmap.data[idx + 3];
  
        if (a < 255) return;
        
        // Simple check for orange/red: R is high, G is medium/low, B is low
        if (r > 200 && g < 150 && b < 100) {
            const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            if ((colorCounts[hex] || 0) > maxOrangeCount) {
                maxOrangeCount = colorCounts[hex];
                orangeColor = hex;
            }
        }
    });
    console.log('Logo Orange Color:', orangeColor);

  } catch (err) {
    console.error(err);
  }
}

getColors();
