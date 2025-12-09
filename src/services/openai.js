import OpenAI from 'openai';

// Initialize OpenAI client
// Note: In a production app, you should proxy these requests through a backend
// to avoid exposing your API key. For this PWA prototype, we'll use the key from env.
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Required for client-side usage
});

/**
 * Analyzes an image of a clothing item to extract metadata.
 * @param {string} base64Image - The base64 encoded image string (data:image/jpeg;base64,...)
 * @returns {Promise<Object>} - The extracted metadata (type, color, style, tags)
 */
export async function analyzeClothingItem(base64Image) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this clothing item. Return a JSON object with the following fields: 'type' (e.g., shirt, pants, dress), 'color' (primary color), 'style' (e.g., casual, formal, sporty), 'tags' (array of 3-5 descriptive keywords), and 'refreshCycle' (suggested number of days before re-wearing, e.g., 1 for underwear, 7 for shirts, 14 for pants)." },
            {
              type: "image_url",
              image_url: {
                "url": base64Image,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error analyzing image:", error);
    // Return mock data if API fails or key is missing
    return {
      type: "unknown",
      color: "unknown",
      style: "unknown",
      tags: ["manual-entry"],
      refreshCycle: 7
    };
  }
}

/**
 * Generates outfit suggestions based on available items and criteria.
 * @param {Array} availableItems - List of available clothing items
 * @param {Object} criteria - User criteria (destination, temperature, style)
 * @returns {Promise<Array>} - Array of 3 outfit suggestions
 */
export async function generateOutfitSuggestions(availableItems, criteria) {
  try {
    // Filter items to reduce token count if necessary, but for now send all available
    const itemsDescription = availableItems.map(item => ({
      id: item.id,
      type: item.type,
      color: item.color,
      tags: item.tags,
      style: item.style
    }));

    const prompt = `
      I need 3 outfit suggestions from the following wardrobe items:
      ${JSON.stringify(itemsDescription)}

      Criteria:
      - Destination: ${criteria.destination}
      - Temperature: ${criteria.temperature}
      - Style Preference: ${criteria.style}

      Please select 3 distinct outfits. For each outfit, provide:
      1. A short summary explaining why it fits the criteria.
      2. The list of item IDs used in the outfit.
      
      Return the result as a JSON object with a key "outfits" containing an array of the 3 suggestions.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful fashion stylist assistant." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.outfits;
  } catch (error) {
    console.error("Error generating outfits:", error);
    return [];
  }
}
