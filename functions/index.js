const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require('firebase-admin');
const OpenAI = require('openai');

admin.initializeApp();

const openaiApiKey = defineSecret("OPENAI_API_KEY");

const getOpenAIClient = () => {
    let apiKey = openaiApiKey.value();
    if (apiKey) {
        apiKey = apiKey.trim();
    }
    
    console.log("Initializing OpenAI with trimmed key length:", apiKey ? apiKey.length : 0);
    
    if (!apiKey) {
        throw new HttpsError('failed-precondition', 'OpenAI API Key not configured.');
    }
    return new OpenAI({ apiKey });
};

/**
 * Analyzes an image of a clothing item to extract metadata.
 * Runs 3 parallel requests for consensus to improve accuracy.
 */
exports.analyzeClothingItem = onCall({
    secrets: [openaiApiKey],
    timeoutSeconds: 60,
    memory: "1GB"
}, async (request) => {
    // Ensure user is authenticated
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { base64Image } = request.data;
    if (!base64Image) {
        throw new HttpsError('invalid-argument', 'The function must be called with a "base64Image" argument.');
    }

    const openai = getOpenAIClient();

    // Helper function for a single analysis
    const runAnalysis = async () => {
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Analyze this clothing item. Return a JSON object with the following fields: 'type' (e.g., shirt, pants, dress), 'color' (primary color), 'style' (e.g., casual, formal, sporty), 'tags' (array of 3-5 descriptive keywords), 'refreshCycle' (number of days before re-wearing), and 'boundingBox' (an array of 4 numbers [ymin, xmin, ymax, xmax] between 0 and 1 representing the tight bounding box of the item)." },
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
        } catch (err) {
            console.error("Single analysis failed", err);
            return null;
        }
    };

    // Run 3 analyses in parallel
    const resultsRaw = await Promise.all([runAnalysis(), runAnalysis(), runAnalysis()]);
    const results = resultsRaw.filter(r => r !== null);

    if (results.length === 0) {
        throw new HttpsError('internal', 'Analysis failed to return valid results.');
    }

    // --- Consensus Logic (Moved from Frontend) ---

    const getMode = (arr) => {
        const counts = {};
        let maxCount = 0;
        let mode = arr[0];
        for (const item of arr) {
            const key = String(item).toLowerCase().trim();
            counts[key] = (counts[key] || 0) + 1;
            if (counts[key] > maxCount) {
                maxCount = counts[key];
                mode = item;
            }
        }
        return mode;
    };

    const type = getMode(results.map(r => r.type));
    const color = getMode(results.map(r => r.color));
    const style = getMode(results.map(r => r.style));
    const refreshCycle = parseInt(getMode(results.map(r => r.refreshCycle)) || 7);

    // Bounding Box Average
    const validBoxes = results
        .map(r => r.boundingBox)
        .filter(b => Array.isArray(b) && b.length === 4);

    let boundingBox = null;
    if (validBoxes.length > 0) {
        const avgBox = [0, 0, 0, 0];
        validBoxes.forEach(box => {
            avgBox[0] += box[0];
            avgBox[1] += box[1];
            avgBox[2] += box[2];
            avgBox[3] += box[3];
        });
        boundingBox = avgBox.map(v => v / validBoxes.length);
    }

    // Tags Consensus
    const allTags = results.flatMap(r => r.tags || []);
    const tagCounts = {};
    allTags.forEach(tag => {
        const key = tag.toLowerCase().trim();
        tagCounts[key] = (tagCounts[key] || 0) + 1;
    });

    let consensusTags = Object.keys(tagCounts).filter(key => tagCounts[key] >= 2);
    if (consensusTags.length === 0 && results.length > 0) {
        consensusTags = results[0].tags || [];
    }

    return {
        type,
        color,
        style,
        tags: consensusTags,
        refreshCycle,
        boundingBox
    };
});

/**
 * Generates outfit suggestions based on available items and criteria.
 */
exports.generateOutfitSuggestions = onCall({
    secrets: [openaiApiKey],
    timeoutSeconds: 60
}, async (request) => {
    console.log("generateOutfitSuggestions called");
    if (!request.auth) {
        console.log("Unauthenticated call");
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }


    const { availableItems, criteria } = request.data;
    
    // Fetch recent user preferences (likes/dislikes)
    const db = admin.firestore();
    let preferenceSummary = "";
    try {
        const prefsSnapshot = await db.collection('users').doc(request.auth.uid).collection('outfit_preferences')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        if (!prefsSnapshot.empty) {
            const liked = [];
            const disliked = [];
            
            prefsSnapshot.forEach(doc => {
                const data = doc.data();
                // Create a short descriptor: "Casual: [blue, denim]"
                const tagsStr = data.tags && data.tags.length ? `[${data.tags.slice(0, 5).join(', ')}]` : '';
                const desc = `${data.context?.style || 'General'} style ${tagsStr}`;
                
                if (data.preference === 'like') liked.push(desc);
                else if (data.preference === 'dislike') disliked.push(desc);
            });

            if (liked.length > 0) preferenceSummary += `\n  - RECENT LIKES (Try to emulate these combinations/styles): \n    ${liked.join('\n    ')}`;
            if (disliked.length > 0) preferenceSummary += `\n  - RECENT DISLIKES (AVOID these combinations/styles): \n    ${disliked.join('\n    ')}`;
        }
    } catch (dbError) {
        console.warn("Failed to fetch preferences:", dbError);
        // Continue without preferences if fetch fails
    }
    
    // Automatically enforce outerwear for colder temps or rain
    const autoIncludeOuterwear = ['Cool', 'Cold', 'Rainy'].includes(criteria.temperature);
    const shouldIncludeOuterwear = criteria.includeOuterwear || autoIncludeOuterwear;

    const itemsDescription = availableItems.map(item => ({
        id: item.id,
        type: item.type,
        color: item.color,
        tags: item.tags,
        style: item.style,
        rating: item.rating || 3,
        wearCount: item.wearCount || 0
    }));

    const prompt = `
  I need 3 outfit suggestions from the following wardrobe items:
  ${JSON.stringify(itemsDescription)}

  Criteria:
  - Destination: ${criteria.destination}
  - Temperature: ${criteria.temperature}
  - Style Preference: ${criteria.style}
  - Include Outerwear: ${shouldIncludeOuterwear ? 'YES' : 'NO'}

  User Feedback History:${preferenceSummary || " None yet."}

  Rules:
      1. Every outfit MUST include at least one item from EACH of these categories: 'top', 'bottom', 'shoes', 'socks' (if available in wardrobe).
      2. IMPORTANT: Sweatshirts, hoodies, and sweaters are NOT considered 'tops'. They count as 'outerwear' or 'layers'. You MUST include a shirt/t-shirt/blouse underneath if you select one of these.
      3. Outerwear Rule: ${shouldIncludeOuterwear ? "You MUST include an 'outerwear' layer (jacket, coat, hoodie, cardigan)." : "Do NOT force an outerwear layer unless the temperature is extremely cold (below 10C)."}
      4. Prioritize items with higher 'rating'.
      5. Consider 'wearCount' - if an item has a high rating but low wear count, suggest it more.
      6. Ensure the outfits are appropriate for the temperature and destination.
  Please select 3 distinct outfits. For each outfit, provide:
  1. A short, catchy name (3-5 words) for the outfit (key: "name").
  2. A short summary explaining why it fits the criteria (key: "summary").
  3. The list of item IDs used in the outfit (key: "items").
  
  Return the result as a JSON object with a key "outfits" containing an array of the 3 suggestions.
`;

    const openai = getOpenAIClient();
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a helpful fashion stylist assistant." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
        });

        const result = JSON.parse(response.choices[0].message.content);
        return Array.isArray(result?.outfits) ? result.outfits : [];
    } catch (error) {
        console.error("OpenAI Error:", error);
        throw new HttpsError('internal', `Failed to generate outfits: ${error.message}`);
    }
});
