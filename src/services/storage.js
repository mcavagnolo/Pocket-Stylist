import { storage } from './firebase';
import { ref, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';

/**
 * Uploads a Base64 image to Firebase Storage and returns the download URL.
 * @param {string} userId - The user's ID.
 * @param {string} base64Image - The Base64 image string.
 * @returns {Promise<string>} - The download URL.
 */
export const uploadImageToStorage = async (userId, base64Image) => {
  try {
    // Create a unique filename
    const filename = `closet/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storageRef = ref(storage, `users/${userId}/${filename}`);

    console.log("Starting upload...");
    
    // Convert data URL to Blob for better reliability
    const response = await fetch(base64Image);
    const blob = await response.blob();

    // Upload with timeout
    const uploadPromise = uploadBytes(storageRef, blob);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Upload timed out after 30 seconds")), 30000)
    );

    const snapshot = await Promise.race([uploadPromise, timeoutPromise]);

    console.log("Upload successful, getting URL...");

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image to storage:", error);
    throw error;
  }
};

export const testStorageConnection = async (userId) => {
  console.log("Starting storage connection test...");
  try {
    // 1. Check if storage object exists
    if (!storage) throw new Error("Firebase Storage instance is null");
    console.log("Storage instance exists. Bucket:", storage.app.options.storageBucket);

    // 2. Create reference
    const testRef = ref(storage, `users/${userId}/test-connection.txt`);
    console.log("Created reference:", testRef.fullPath);

    // 3. Create Blob
    const blob = new Blob(["Test connection " + new Date().toISOString()], { type: 'text/plain' });
    
    // 4. Upload with timeout
    console.log("Starting upload...");
    const uploadPromise = uploadBytes(testRef, blob);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Upload timed out after 10 seconds")), 10000)
    );

    const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
    console.log("Upload successful:", snapshot);
    
    return { success: true, bucket: storage.app.options.storageBucket };
  } catch (error) {
    console.error("Storage connection test failed:", error);
    // Return the error details so we can show them to the user
    throw new Error(`Test failed: ${error.message}`);
  }
};
