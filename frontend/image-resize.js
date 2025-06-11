const { createClient } = require("@supabase/supabase-js");
const sharp = require("sharp");

// Initialize Supabase client with service role key
const SUPABASE_URL = "https://vjulyxmuswlktvlvdhhi.supabase.co"; // Derived from your HOST
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdWx5eG11c3dsa3R2bHZkaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDkyMTMyNCwiZXhwIjoyMDU2NDk3MzI0fQ.civdal8JUya2xw1jS6Tc_J_JJex2N5r2hewPAR5NPqc"; // Replace with your actual service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Bucket and image settings
const BUCKET_NAME = "student-images"; // Your bucket name
const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const QUALITY = 70;

async function testSupabaseAuth() {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    console.log("✅ Authentication successful. Buckets:", data.map(b => b.name));
    return true;
  } catch (error) {
    console.error("❌ Authentication failed:", error.message);
    return false;
  }
}

async function resizeImagesInFolder(folderPath = "") {
  try {
    // List files and folders in the current path
    const { data: items, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folderPath, { limit: 1000 });

    if (listError) {
      console.error(`❌ Error listing items in ${folderPath || "root"}:`, listError.message);
      return 0;
    }

    let processedCount = 0;

    for (const item of items) {
      const itemPath = folderPath ? `${folderPath}/${item.name}` : item.name;

      // If it's a folder (has no metadata like created_at), recurse into it
      if (!item.created_at) {
        console.log(`📁 Entering folder: ${itemPath}`);
        const subFolderCount = await resizeImagesInFolder(itemPath);
        processedCount += subFolderCount;
        continue;
      }

      // Skip non-image files
      if (!item.name.match(/\.(jpg|jpeg|png)$/i)) {
        console.log(`⏭️ Skipping non-image file: ${itemPath}`);
        continue;
      }

      console.log(`🛠️ Processing: ${itemPath}`);

      // Download the original image
      const { data: imageData, error: downloadError } = await supabase.storage
        .from(BUCKET_NAME)
        .download(itemPath);

      if (downloadError) {
        console.error(`❌ Error downloading ${itemPath}:`, downloadError.message);
        continue;
      }

      if (!imageData) {
        console.error(`❌ No data returned for ${itemPath}`);
        continue;
      }

      // Convert Blob to Buffer
      const buffer = Buffer.from(await imageData.arrayBuffer());
      console.log(`📥 Original size: ${(buffer.length / 1024).toFixed(2)} KB`);

      // Resize and compress with sharp
      const resizedImage = await sharp(buffer)
        .resize({
          width: MAX_WIDTH,
          height: MAX_HEIGHT,
          fit: "contain",
        })
        .jpeg({ quality: QUALITY }) // Use .png() for PNG if needed
        .toBuffer();

      console.log(`📏 Resized size: ${(resizedImage.length / 1024).toFixed(2)} KB`);

      // Overwrite original image
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(itemPath, resizedImage, {
          contentType: item.name.endsWith(".png") ? "image/png" : "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error(`❌ Error uploading ${itemPath}:`, uploadError.message);
        continue;
      }

      console.log(`✅ Overwritten: ${itemPath}`);
      processedCount++;
    }

    return processedCount;
  } catch (error) {
    console.error(`❌ Error in folder ${folderPath || "root"}:`, error.message);
    return 0;
  }
}

async function resizeImages() {
  // Test authentication first
  const isAuthenticated = await testSupabaseAuth();
  if (!isAuthenticated) {
    console.error("🛑 Stopping due to authentication failure.");
    return;
  }

  console.log(`📂 Processing bucket: ${BUCKET_NAME}`);
  const totalProcessed = await resizeImagesInFolder();
  console.log(`🎉 Processed ${totalProcessed} images in bucket ${BUCKET_NAME}!`);
}

resizeImages();