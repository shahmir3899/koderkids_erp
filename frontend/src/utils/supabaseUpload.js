// ============================================
// SUPABASE UPLOAD HELPER
// Upload school logos to Supabase Storage
// ============================================

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_SEC_KEY;

// Debug: Log what we're getting
console.log('🔍 Supabase Config Debug:');
console.log('  - URL:', supabaseUrl);
console.log('  - Key exists:', !!supabaseKey);

// Initialize Supabase client
let supabase;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('   Make sure .env file has:');
  console.error('   - REACT_APP_SUPABASE_URL');
  console.error('   - REACT_APP_SUPABASE_SEC_KEY');
  
  // Create a dummy client that will show helpful errors
  supabase = {
    storage: {
      from: () => ({
        upload: async () => {
          throw new Error('Supabase not configured. Check .env file and restart server.');
        },
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: async () => ({ error: new Error('Supabase not configured') }),
      }),
    },
  };
} else {
  // Create real client
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client initialized successfully');
}

// Export the client
export { supabase };

/**
 * Upload school logo to Supabase Storage
 * @param {File} file - Image file to upload
 * @param {string} schoolName - School name (used for filename)
 * @returns {Promise<string>} Public URL of uploaded image
 */
export const uploadSchoolLogo = async (file, schoolName) => {
  try {
    console.log('📤 Uploading logo to Supabase...');

    // Create unique filename
    const timestamp = Date.now();
    const sanitizedSchoolName = schoolName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileExt = file.name.split('.').pop();
    const fileName = `${sanitizedSchoolName}_${timestamp}.${fileExt}`;
    const filePath = `school-logos/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('school-assets') // Bucket name
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('school-assets')
      .getPublicUrl(filePath);

    console.log('✅ Logo uploaded successfully:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('❌ Error uploading logo:', error);
    throw error;
  }
};

/**
 * Delete school logo from Supabase Storage
 * @param {string} logoUrl - Public URL of the logo to delete
 * @returns {Promise<void>}
 */
export const deleteSchoolLogo = async (logoUrl) => {
  try {
    if (!logoUrl) return;

    // Extract file path from URL
    const urlParts = logoUrl.split('/school-logos/');
    if (urlParts.length < 2) return;

    const filePath = `school-logos/${urlParts[1]}`;

    console.log('🗑️ Deleting logo from Supabase:', filePath);

    const { error } = await supabase.storage
      .from('school-assets')
      .remove([filePath]);

    if (error) {
      console.error('❌ Error deleting logo:', error);
      throw error;
    }

    console.log('✅ Logo deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting logo:', error);
    // Don't throw - deletion failure shouldn't block other operations
  }
};

/**
 * Update school logo (delete old, upload new)
 * @param {File} newFile - New image file
 * @param {string} schoolName - School name
 * @param {string} oldLogoUrl - Old logo URL to delete
 * @returns {Promise<string>} Public URL of new uploaded image
 */
export const updateSchoolLogo = async (newFile, schoolName, oldLogoUrl) => {
  try {
    // Upload new logo first
    const newLogoUrl = await uploadSchoolLogo(newFile, schoolName);

    // Delete old logo (if exists)
    if (oldLogoUrl) {
      await deleteSchoolLogo(oldLogoUrl);
    }

    return newLogoUrl;
  } catch (error) {
    console.error('❌ Error updating logo:', error);
    throw error;
  }
};

export default {
  uploadSchoolLogo,
  deleteSchoolLogo,
  updateSchoolLogo,
};