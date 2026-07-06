import React, { useState, useEffect } from 'react';
import { fileStorage } from '../../lib/fileStorage';

export const OrgLogo = ({ logoUrl, alt = "Organization Logo", className = "h-8 w-8 rounded-full object-cover" }) => {
  const [signedUrl, setSignedUrl] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSignedUrl = async () => {
      // If it's a standard HTTP url (legacy or external), just use it
      if (logoUrl?.startsWith('http://') || logoUrl?.startsWith('https://')) {
        setSignedUrl(logoUrl);
        return;
      }
      
      // If it's a private storage path, fetch the signed URL
      if (logoUrl) {
        const { url } = await fileStorage.getDownloadUrl(logoUrl);
        if (isMounted && url) {
          setSignedUrl(url);
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

  if (!signedUrl) {
    return (
      <div className={`${className} bg-slate-200 flex items-center justify-center text-slate-400 font-bold`}>
        {alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img src={signedUrl} alt={alt} className={className} />
  );
};
