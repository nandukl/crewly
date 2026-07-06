import React, { useState, useRef } from 'react';
import { fileStorage } from '../../lib/fileStorage';
import { ImageCropperModal } from './ImageCropperModal';

export const FileUploader = ({ orgId, featureName, onUploadComplete, accept = "*", maxSizeMB = 10, enableCrop = true }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }

    if (enableCrop && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setCropImageSrc(reader.result);
        setOriginalFile(file);
      };
      return;
    }

    await performUpload(file);
  };

  const performUpload = async (fileToUpload) => {
    setError(null);
    setUploading(true);
    setCropImageSrc(null);

    // generate a safe name if it's a blob
    const fileForUpload = fileToUpload instanceof File 
      ? fileToUpload 
      : new File([fileToUpload], originalFile?.name || 'cropped-image.jpg', { type: fileToUpload.type || 'image/jpeg' });

    const { data, error: uploadError } = await fileStorage.uploadFile(fileForUpload, orgId, featureName);
    
    setUploading(false);
    
    if (uploadError) {
      setError(uploadError.message || 'Failed to upload file.');
    } else {
      if (onUploadComplete) {
        onUploadComplete(data);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={triggerSelect}>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept={accept}
        className="hidden" 
      />
      
      {uploading ? (
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-8 w-8 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium text-slate-600">Uploading securely...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <svg className="mx-auto h-12 w-12 text-slate-400 mb-2" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="mt-2 block text-sm font-semibold text-slate-900">
            Click or drag to upload {featureName} files
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            Maximum file size {maxSizeMB}MB
          </span>
        </div>
      )}
      
      {error && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 p-2 rounded w-full text-center font-medium">
          {error}
        </div>
      )}
      </div>

      {cropImageSrc && (
        <ImageCropperModal
          imageSrc={cropImageSrc}
          onCancel={() => {
            setCropImageSrc(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          onCropComplete={(croppedBlob) => {
            performUpload(croppedBlob);
          }}
        />
      )}
    </>
  );
};
