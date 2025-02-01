import React, { useState, useRef } from 'react';
import { Camera, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ImageCropper from '../ImageCropper';
import { supabase } from '../../lib/supabase';

interface HeaderPhotoUploadProps {
  currentPhoto?: string;
  onPhotoChange: (photo: string | null) => void;
  className?: string;
  userId?: string;
}

export function HeaderPhotoUpload({ 
  currentPhoto, 
  onPhotoChange,
  className = '',
  userId
}: HeaderPhotoUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|png|gif)$/)) {
      setError('Please upload a valid image file (JPG, PNG, or GIF)');
      return;
    }

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      
      // Create image object to check dimensions
      const img = new Image();
      img.onload = () => {
        // Clear any previous errors
        setError(null);
        
        // Start cropping process
        setCropImage(dataUrl);
      };

      img.onerror = () => {
        setError('Failed to load image. Please try another file.');
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      setError('Failed to read image file. Please try again.');
    };

    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedImage: string) => {
    try {
      setIsUploading(true);
      setCropImage(null);
      onPhotoChange(croppedImage);
    } catch (error) {
      console.error('Error processing image:', error);
      setError('Failed to process image. Please try again.');
      toast.error('Failed to process image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="relative group">
        <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-holy-blue-100">
          {isUploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : (
            <>
              {currentPhoto ? (
                <img
                  src={currentPhoto}
                  alt="Header"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-holy-blue-100 flex items-center justify-center">
                  <p className="text-holy-blue-500 text-sm">No header image</p>
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="h-10 w-10 text-white" />
              </button>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Upload header photo"
      />

      {error && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary"
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Upload Header Image'
          )}
        </button>

        <p className="text-xs text-holy-blue-600/70 mt-2">
          Recommended: 1200x400 pixels
          <br />
          Accepted formats: JPG, PNG, or GIF • Max 10MB
        </p>
      </div>

      {cropImage && (
        <ImageCropper
          image={cropImage}
          aspect={3}
          minWidth={1200}
          minHeight={400}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropImage(null)}
        />
      )}
    </div>
  );
}