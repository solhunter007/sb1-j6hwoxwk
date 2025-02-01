import React, { useState, useRef } from 'react';
import { Camera, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ImageCropper from '../ImageCropper';
import { DefaultAvatar } from './DefaultAvatar';
import { supabase } from '../../lib/supabase';

interface ProfilePhotoUploadProps {
  currentPhoto?: string;
  onPhotoChange: (photo: string | null) => void;
  onSkip?: () => void;
  showSkip?: boolean;
  className?: string;
  userId?: string;
}

export function ProfilePhotoUpload({ 
  currentPhoto, 
  onPhotoChange,
  onSkip,
  showSkip = false,
  className = '',
  userId
}: ProfilePhotoUploadProps) {
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
        if (img.width < 400 || img.height < 400) {
          setError('Image dimensions must be at least 400x400 pixels');
          return;
        }

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

  const handleUploadClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    fileInputRef.current?.click();
  };

  const handleSkipClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    onSkip?.();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-holy-blue-900">
          Add a profile picture (optional)
        </h3>
        <p className="text-sm text-holy-blue-600 mt-1">
          Choose a square image that represents you or your church
        </p>
      </div>

      <div className="relative group">
        <div className="relative w-40 h-40 mx-auto">
          {isUploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : (
            <>
              {currentPhoto ? (
                <img
                  src={currentPhoto}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover border-2 border-holy-blue-100"
                />
              ) : (
                <div className="w-full h-full rounded-full border-2 border-holy-blue-100 overflow-hidden">
                  <DefaultAvatar size={160} />
                </div>
              )}
              <button
                onClick={handleUploadClick}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
        aria-label="Upload profile photo"
      />

      {error && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="text-center space-y-3">
        <button
          type="button"
          onClick={handleUploadClick}
          className="btn-primary"
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Upload Image'
          )}
        </button>

        {showSkip && !isUploading && (
          <div>
            <button
              type="button"
              onClick={handleSkipClick}
              className="text-sm text-holy-blue-600 hover:text-holy-blue-700"
            >
              Skip for now
            </button>
          </div>
        )}

        <p className="text-xs text-holy-blue-600/70">
          Recommended: Square image, minimum 400x400 pixels
          <br />
          Accepted formats: JPG, PNG, or GIF • Max 10MB
        </p>
      </div>

      {cropImage && (
        <ImageCropper
          image={cropImage}
          aspect={1}
          minWidth={400}
          minHeight={400}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropImage(null)}
        />
      )}
    </div>
  );
}