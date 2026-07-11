import { supabase } from './supabaseClient';

export const fileStorage = {
  /**
   * Uploads a file to Supabase Storage and records metadata in Postgres.
   * Path format: {organization_id}/{feature_name}/{timestamp_filename}
   */
  async uploadFile(file, orgId, featureName = 'general', bucketName = 'workspaces') {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${orgId}/${featureName}/${Date.now()}_${safeName}`;

      // 1. Upload to Storage Bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Create DB Record
      const { data: record, error: dbError } = await supabase
        .from('file_records')
        .insert({
          organization_id: orgId,
          uploaded_by: userData.user.id,
          feature_name: featureName,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          content_type: file.type || 'application/octet-stream'
        })
        .select()
        .single();

      if (dbError) {
        // Cleanup storage if DB fails
        await supabase.storage.from('workspaces').remove([uploadData.path]);
        throw dbError;
      }

      return { data: record };
    } catch (error) {
      console.error('[FileStorage] Upload failed:', error);
      return { error };
    }
  },

  /**
   * Fetches metadata for files in a specific org/feature.
   */
  async getFiles(orgId, featureName) {
    let query = supabase
      .from('file_records')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
      
    if (featureName) {
      query = query.eq('feature_name', featureName);
    }

    const { data, error } = await query;
    return { data, error };
  },

  /**
   * Generates a temporary signed URL to view/download a private file.
   */
  async getDownloadUrl(filePath) {
    const { data, error } = await supabase.storage
      .from('workspaces')
      .createSignedUrl(filePath, 3600); // 1 hour expiry
      
    return { url: data?.signedUrl, error };
  },

  /**
   * Deletes the DB record and the physical file.
   */
  async deleteFile(filePath, recordId) {
    try {
      // 1. Delete from DB (RLS ensures only admins can do this)
      const { error: dbError } = await supabase
        .from('file_records')
        .delete()
        .eq('id', recordId);
        
      if (dbError) throw dbError;

      // 2. Delete from Storage
      const { error: storageError } = await supabase.storage
        .from('workspaces')
        .remove([filePath]);
        
      if (storageError) {
        console.error('[FileStorage] Storage delete failed (orphaned file):', storageError);
      }

      return { success: true };
    } catch (error) {
      console.error('[FileStorage] Delete failed:', error);
      return { error };
    }
  }
};
