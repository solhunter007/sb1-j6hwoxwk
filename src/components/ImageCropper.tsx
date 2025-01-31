import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop/types';
import { MoveIcon, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react';

interface ImageCropperProps {
  image: string;
  aspect: number;
  minWidth?: number;
  minHeight?: number;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
  cropShape?: 'rect' | 'round';
  outputWidth?: number;
  outputHeight?: number;
}

export default function ImageCropper({ 
  image, 
  aspect,
  minWidth = 200, 
  minHeight = 200,
  onCropComplete,
  onCancel,
  cropShape = 'rect',
  outputWidth = 400,
  outputHeight = 400
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  const onCropChange = (location: Point) => {
    setCrop(location);
  };

  const onZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const onCropAreaChange = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onMediaLoaded = useCallback((mediaSize: { width: number; height: number }) => {
    setImageDimensions(mediaSize);
    setIsImageLoaded(true);

    // Check if image meets minimum dimensions
    if (mediaSize.width < minWidth || mediaSize.height < minHeight) {
      setError(`Image must be at least ${minWidth}x${minHeight} pixels`);
    } else {
      setError(null);
    }
  }, [minWidth, minHeight]);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to desired output size
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    // Draw the cropped image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outputWidth,
      outputHeight
    );

    return new Promise((resolve, reject) => {
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch (e) {
        reject(e);
      }
    });
  };

  const handleCrop = async () => {
    try {
      if (!croppedAreaPixels) return;

      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
      setError('Failed to process image. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl overflow-hidden">
        <div className="p-4 border-b border-holy-blue-100">
          <h3 className="text-lg font-semibold text-holy-blue-900">
            {cropShape === 'round' ? 'Crop Your Photo' : 'Adjust Header Image'}
          </h3>
          <p className="text-sm text-holy-blue-600 mt-1">
            {cropShape === 'round'
              ? 'Center your face within the circle for best results'
              : 'Adjust the image position and zoom to create your header'}
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
            cropShape={cropShape}
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
              },
              mediaStyle: {
                width: '100%',
                height: '100%',
                objectFit: 'contain'
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

        {error && (
          <div className="p-4 bg-red-50 border-y border-red-100">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

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

          {imageDimensions && (
            <p className="text-sm text-holy-blue-600">
              Original image: {imageDimensions.width}x{imageDimensions.height}px
            </p>
          )}

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
              disabled={!isImageLoaded || !croppedAreaPixels || !!error}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}