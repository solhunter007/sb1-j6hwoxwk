import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop/types';
import { MoveIcon, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ImageCropperProps {
  image: string;
  aspect: number;
  minWidth?: number;
  minHeight?: number;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export default function ImageCropper({ 
  image, 
  aspect,
  minWidth = 400,
  minHeight = 400,
  onCropComplete,
  onCancel,
  title = 'Crop Image',
  description
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  const onCropChange = (location: Point) => {
    setCrop(location);
  };

  const onZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const onCropAreaChange = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
    
    // Validate dimensions
    if (croppedAreaPixels.width < minWidth || croppedAreaPixels.height < minHeight) {
      setError(`Image must be at least ${minWidth}x${minHeight} pixels`);
    } else {
      setError(null);
    }
  }, [minWidth, minHeight]);

  const onImageLoad = useCallback((imageInfo: HTMLImageElement) => {
    setIsImageLoaded(true);
    setImageSize({
      width: imageInfo.width,
      height: imageInfo.height
    });

    // Validate minimum image dimensions
    if (imageInfo.width < minWidth || imageInfo.height < minHeight) {
      setError(`Original image must be at least ${minWidth}x${minHeight} pixels`);
    }
  }, [minWidth, minHeight]);

  const handleCrop = async () => {
    try {
      if (!croppedAreaPixels) return;
      if (error) return;

      const canvas = document.createElement('canvas');
      const image = await createImage(image);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No 2d context');
      }

      // Set canvas size to desired output size
      canvas.width = aspect === 1 ? 400 : 1200;
      canvas.height = aspect === 1 ? 400 : 400;

      // Draw the cropped image
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Convert to base64 with quality setting
      const croppedImage = canvas.toDataURL('image/jpeg', 0.9);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
      setError('Failed to process image. Please try again.');
    }
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', reject);
      image.src = url;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="p-4 border-b border-holy-blue-100">
          <h3 className="text-lg font-semibold text-holy-blue-900">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-holy-blue-600 mt-1">
              {description}
            </p>
          )}
        </div>

        {/* Cropper */}
        <div className="relative h-96 bg-gray-100">
          {!isImageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-holy-blue-500" />
            </div>
          )}
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaChange}
            onMediaLoaded={onImageLoad}
            minZoom={0.5}
            maxZoom={3}
            cropShape={aspect === 1 ? 'round' : 'rect'}
            showGrid={!isImageLoaded}
            style={{
              containerStyle: {
                width: '100%',
                height: '100%',
                backgroundColor: '#f3f4f6'
              },
              cropAreaStyle: {
                border: '2px solid #3b82f6',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
              }
            }}
          />
          <div className="absolute left-4 bottom-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 flex items-center gap-2">
            <MoveIcon className="h-4 w-4 text-holy-blue-600" />
            <span className="text-sm text-holy-blue-900">
              Drag to adjust position
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border-y border-red-100">
            <div className="flex items-start gap-2 text-red-600">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="p-4 bg-holy-blue-50 space-y-4">
          {/* Zoom Slider */}
          <div className="flex items-center gap-4">
            <ZoomOut className="h-4 w-4 text-holy-blue-600" />
            <input
              type="range"
              value={zoom}
              min={0.5}
              max={3}
              step={0.1}
              aria-label="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className={cn(
                "w-full h-2 bg-holy-blue-200 rounded-lg appearance-none cursor-pointer",
                "focus:outline-none focus:ring-2 focus:ring-holy-blue-500"
              )}
            />
            <ZoomIn className="h-4 w-4 text-holy-blue-600" />
          </div>

          {/* Image Info */}
          {imageSize && (
            <p className="text-xs text-holy-blue-600 text-center">
              Original size: {imageSize.width}x{imageSize.height} pixels
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleCrop}
              className="btn-primary"
              disabled={!isImageLoaded || !!error}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}