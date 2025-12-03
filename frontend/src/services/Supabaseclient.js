// ============================================
// SUPABASE CLIENT - Frontend Configuration
// ============================================
// Location: src/services/supabaseClient.js

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase configuration missing! Please check your .env file.');
  console.error('Required variables: REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// STORAGE HELPERS
// ============================================

/**
 * Upload file to Supabase Storage
 * @param {string} bucket - Bucket name
 * @param {string} path - File path in bucket
 * @param {File} file - File to upload
 * @param {Object} options - Upload options
 * @returns {Promise<{data: Object, error: Object}>}
 */
export const uploadFile = async (bucket, path, file, options = {}) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        ...options,
      });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('❌ Supabase upload error:', error);
    return { data: null, error };
  }
};

/**
 * Get public URL for a file
 * @param {string} bucket - Bucket name
 * @param {string} path - File path in bucket
 * @returns {string} Public URL
 */
export const getPublicUrl = (bucket, path) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Delete file from Supabase Storage
 * @param {string} bucket - Bucket name
 * @param {string} path - File path in bucket
 * @returns {Promise<{data: Object, error: Object}>}
 */
export const deleteFile = async (bucket, path) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('❌ Supabase delete error:', error);
    return { data: null, error };
  }
};

/**
 * Upload profile photo with resizing
 * Handles the complete flow: compress -> upload -> get URL
 * @param {File} file - Image file
 * @param {string} employeeId - Employee ID for folder structure
 * @returns {Promise<{url: string, error: Object}>}
 */
export const uploadProfilePhoto = async (file, employeeId) => {
  try {
    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `teachers/${employeeId}/profile_${Date.now()}.${ext}`;
    
    // Upload to profile-photos bucket
    const { data, error } = await uploadFile('profile-photos', filename, file, {
      contentType: file.type,
    });

    if (error) throw error;

    // Get public URL
    const publicUrl = getPublicUrl('profile-photos', filename);
    
    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('❌ Profile photo upload error:', error);
    return { url: null, error };
  }
};

export default supabase;