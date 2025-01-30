import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop/types';
import { MoveIcon, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperProps {
  image: string;
  aspect: number;
  minWidth?: number;
  minHeight?: number;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

export default function ImageCropper({ 
  image, 
  aspect, 
  minWidth = 200, 
  minHeight = 200, 
  onCropComplete, 
  onCancel 
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const onCropChange = (location: Point) => {
    setCrop(location);
  };

  const onZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const onCropAreaChange = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    if (croppedAreaPixels.width < minWidth || croppedAreaPixels.height < minHeight) {
      return; // Prevent crop if below minimum dimensions
    }
    setCroppedAreaPixels(croppedAreaPixels);
  }, [minWidth, minHeight]);

  const createCroppedImage = useCallback(async () => {
    try {
      if (!croppedAreaPixels) return;

      const img = new Image();
      img.crossOrigin = "anonymous"; // Enable CORS
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = image;
      });

      // Create canvas for full size image
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw and scale the cropped image
      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        400,
        400
      );

      // Create thumbnail canvas
      const thumbnailCanvas = document.createElement('canvas');
      thumbnailCanvas.width = 100;
      thumbnailCanvas.height = 100;
      const thumbCtx = thumbnailCanvas.getContext('2d');
      if (!thumbCtx) return;

      // Draw thumbnail
      thumbCtx.drawImage(canvas, 0, 0, 100, 100);

      // Get both images as data URLs
      const fullSize = canvas.toDataURL('image/jpeg', 0.9);
      onCropComplete(fullSize);
    } catch (e) {
      console.error('Error creating cropped image:', e);
    }
  }, [croppedAreaPixels, image, onCropComplete]);

  const onMediaLoaded = useCallback(() => {
    setIsImageLoaded(true);
    setZoom(1); // Reset zoom when new image is loaded
    setCrop({ x: 0, y: 0 }); // Reset position
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl overflow-hidden">
        <div className="p-4 border-b border-holy-blue-100">
          <h3 className="text-lg font-semibold text-holy-blue-900">Crop Your Photo</h3>
          <p className="text-sm text-holy-blue-600 mt-1">
            Center your face within the square for best results
          </p>
        </div>

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
            onMediaLoaded={onMediaLoaded}
            minZoom={0.5}
            maxZoom={3}
            cropShape="round"
            showGrid={false}
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

        <div className="p-4 bg-holy-blue-50 space-y-4">
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
              className="w-full h-2 bg-holy-blue-200 rounded-lg appearance-none cursor-pointer"
            />
            <ZoomIn className="h-4 w-4 text-holy-blue-600" />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={createCroppedImage}
              className="btn-primary"
              disabled={!croppedAreaPixels || !isImageLoaded}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}