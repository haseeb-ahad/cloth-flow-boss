/**
 * Simple perceptual hash for images using average hash algorithm
 * This creates a fingerprint of an image that remains similar even with minor modifications
 */

export const generateImageHash = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Create a small canvas for hashing
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }
          
          // Resize to 8x8 for perceptual hashing
          const hashSize = 8;
          canvas.width = hashSize;
          canvas.height = hashSize;
          
          // Draw and scale image
          ctx.drawImage(img, 0, 0, hashSize, hashSize);
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, hashSize, hashSize);
          const pixels = imageData.data;
          
          // Convert to grayscale and calculate average
          const grayscale: number[] = [];
          for (let i = 0; i < pixels.length; i += 4) {
            const gray = (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
            grayscale.push(gray);
          }
          
          const avg = grayscale.reduce((a, b) => a + b, 0) / grayscale.length;
          
          // Generate binary hash
          let hash = "";
          for (const gray of grayscale) {
            hash += gray >= avg ? "1" : "0";
          }
          
          // Convert binary to hex for shorter storage
          const hexHash = parseInt(hash, 2).toString(16).padStart(16, "0");
          
          // Also add file size as part of hash for extra uniqueness
          const fullHash = `${hexHash}-${file.size}`;
          
          resolve(fullHash);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Calculate hamming distance between two hashes
 * Lower distance = more similar images
 */
export const hammingDistance = (hash1: string, hash2: string): number => {
  const [hex1, size1] = hash1.split("-");
  const [hex2, size2] = hash2.split("-");
  
  // If file sizes are very different, likely different images
  if (Math.abs(parseInt(size1) - parseInt(size2)) > 1000) {
    return 64; // Max distance
  }
  
  const bin1 = parseInt(hex1, 16).toString(2).padStart(64, "0");
  const bin2 = parseInt(hex2, 16).toString(2).padStart(64, "0");
  
  let distance = 0;
  for (let i = 0; i < bin1.length; i++) {
    if (bin1[i] !== bin2[i]) distance++;
  }
  
  return distance;
};

/**
 * Check if two images are similar (threshold based)
 */
export const areImagesSimilar = (hash1: string, hash2: string, threshold = 10): boolean => {
  return hammingDistance(hash1, hash2) <= threshold;
};