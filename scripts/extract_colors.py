import sys
import subprocess
import os

# Ensure Pillow is installed
try:
    from PIL import Image
    import colorsys
except ImportError:
    print("Installing Pillow...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image
    import colorsys

def rgb_to_hex(rgb):
    return '#{:02x}{:02x}{:02x}'.format(rgb[0], rgb[1], rgb[2])

def get_pixel_color(image_path, x, y):
    try:
        if not os.path.exists(image_path):
            return f"File not found: {image_path}"
        img = Image.open(image_path)
        img = img.convert("RGB")
        pixel = img.getpixel((x, y))
        return rgb_to_hex(pixel)
    except Exception as e:
        return f"Error reading {image_path}: {e}"

def get_highlight_color(image_path):
    try:
        if not os.path.exists(image_path):
            return f"File not found: {image_path}", []
            
        img = Image.open(image_path)
        img = img.convert("RGB")
        img = img.resize((150, 150)) # Resize for speed
        
        # Get colors
        pixels = list(img.getdata())
        
        # Simple quantization by rounding to reduce noise
        quantized_pixels = []
        for r, g, b in pixels:
            quantized_pixels.append((round(r/20)*20, round(g/20)*20, round(b/20)*20))
            
        from collections import Counter
        counts = Counter(quantized_pixels)
        common_colors = counts.most_common(20)
        
        candidates = []
        for color_rgb, count in common_colors:
            r, g, b = color_rgb
            h, s, v = colorsys.rgb_to_hsv(r/255.0, g/255.0, b/255.0)
            
            # Filter out blacks, whites, grays for "highlight" color
            # Saturation > 0.3, Value > 0.3
            if s > 0.3 and v > 0.3:
                candidates.append((color_rgb, s, v))
        
        # Sort by saturation
        candidates.sort(key=lambda x: x[1], reverse=True)
        
        if candidates:
            best_color = candidates[0][0]
            return rgb_to_hex(best_color), [rgb_to_hex(c[0]) for c in candidates]
        else:
            # Fallback to most common if no colorful candidates
            return rgb_to_hex(common_colors[0][0]), [rgb_to_hex(c[0]) for c in common_colors]

    except Exception as e:
        return f"Error reading {image_path}: {e}", []

banner_path = os.path.abspath('src/assets/banner.png')
logo_path = os.path.abspath('pics/Stylized app logo4.png')

print(f"Processing {banner_path} and {logo_path}")

banner_bg = get_pixel_color(banner_path, 0, 0)
logo_highlight, logo_palette = get_highlight_color(logo_path)

print(f"Banner Background: {banner_bg}")
print(f"Logo Highlight Candidate: {logo_highlight}")
print(f"Logo Palette Candidates: {logo_palette}")
