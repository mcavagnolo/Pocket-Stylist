export const resizeImage = (base64Str, maxWidth = 1024, maxHeight = 1024) => {
  return new Promise((resolve) => {
    let img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      let ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Quality 0.7 usually results in 50-150KB for 1024px images
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
};

export const cropImage = (base64Str, boundingBox, padding = 0.0) => {
  return new Promise((resolve) => {
    if (!boundingBox || boundingBox.length !== 4) {
      resolve(base64Str);
      return;
    }

    let img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let canvas = document.createElement('canvas');
      let [ymin, xmin, ymax, xmax] = boundingBox;
      
      // Calculate pixel coordinates
      let y1 = ymin * img.height;
      let x1 = xmin * img.width;
      let y2 = ymax * img.height;
      let x2 = xmax * img.width;

      // Apply padding
      const width = x2 - x1;
      const height = y2 - y1;
      
      x1 = Math.max(0, x1 - (width * padding));
      y1 = Math.max(0, y1 - (height * padding));
      x2 = Math.min(img.width, x2 + (width * padding));
      y2 = Math.min(img.height, y2 + (height * padding));

      const newWidth = x2 - x1;
      const newHeight = y2 - y1;

      canvas.width = newWidth;
      canvas.height = newHeight;
      
      let ctx = canvas.getContext('2d');
      ctx.drawImage(img, x1, y1, newWidth, newHeight, 0, 0, newWidth, newHeight);
      
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(base64Str);
  });
};
