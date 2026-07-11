import React, { useState, useEffect } from 'react';
import { fileStorage } from '../../lib/fileStorage';

import { supabase } from '../../lib/supabaseClient';

export const OrgLogo = ({ logoUrl, alt = "Organization Logo", className = "h-8 w-8 rounded-full object-cover" }) => {
  const [signedUrl, setSignedUrl] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setImageError(false); // Reset error state when url changes
    
    const fetchSignedUrl = async () => {
      setSignedUrl(null); // Clear old url so it doesn't trigger onError during fetch
      
      // If it's a standard HTTP url (legacy or external), just use it
      if (logoUrl?.startsWith('http://') || logoUrl?.startsWith('https://')) {
        if (isMounted) setSignedUrl(logoUrl);
        return;
      }
      
      // If it's a private storage path, fetch the signed URL
      if (logoUrl) {
        if (logoUrl.includes('/logos/')) {
          const { data } = supabase.storage.from('public_assets').getPublicUrl(logoUrl);
          if (isMounted) setSignedUrl(data.publicUrl);
        } else {
          const { url } = await fileStorage.getDownloadUrl(logoUrl);
          if (isMounted && url) {
            setSignedUrl(url);
          }
        }
      } else {
        if (isMounted) setSignedUrl(null);
      }
    };

    fetchSignedUrl();
    
    return () => {
      isMounted = false;
    };
  }, [logoUrl]);

  if (!signedUrl || imageError) {
    return (
      <div className={`${className} bg-slate-200 flex items-center justify-center text-slate-400 font-bold`}>
        {alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img 
      src={signedUrl} 
      alt={alt} 
      className={className} 
      onError={() => setImageError(true)}
    />
  );
};
