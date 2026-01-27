import { functions, httpsCallable } from './firebase';

/**
 * Analyzes an image of a clothing item to extract metadata via Cloud Function.
 * @param {string} base64Image - The base64 encoded image string
 * @returns {Promise<Object>} - The extracted metadata
 */
export async function analyzeClothingItem(base64Image) {
  try {
    const analyzeFunction = httpsCallable(functions, 'analyzeClothingItem');
    const result = await analyzeFunction({ base64Image });
    
    // The result.data contains the return value from the cloud function
    return result.data;
  } catch (error) {
    console.error("Error analyzing image via Cloud Function:", error);
    // Return safe fallback to prevent UI crash
    return {
      type: "unknown",
      color: "unknown",
      style: "unknown",
      tags: ["manual-entry"],
      refreshCycle: 7,
      boundingBox: null
    };
  }
}

/**
 * Generates outfit suggestions based on available items and criteria via Cloud Function.
 * @param {Array} availableItems - List of available clothing items
 * @param {Object} criteria - User criteria (destination, temperature, style)
 * @param {string} userPrompt - Optional voice/text prompt from user
 * @returns {Promise<Array>} - Array of 3 outfit suggestions
 */
export async function generateOutfitSuggestions(availableItems, criteria, userPrompt = '') {
  try {
    // Optimization: Strip heavy image data before sending to Cloud Function
    // to avoid hitting payload size limits.
    const sanitizedItems = availableItems.map(item => {
        const { imageUri, image, ...rest } = item;
        return rest;
    });

    const generateFunction = httpsCallable(functions, 'generateOutfitSuggestions');
    const result = await generateFunction({ availableItems: sanitizedItems, criteria, userPrompt });
    
    // The result.data is the array of outfits
    const suggestions = result.data || [];
    
    // Assign unique IDs to each suggestion
    return suggestions.map(outfit => ({
        ...outfit,
        id: crypto.randomUUID()
    }));
  } catch (error) {
    console.error("Error generating outfits via Cloud Function:", error);
    throw error; // Re-throw so UI can handle it
  }
}
