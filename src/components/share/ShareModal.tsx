import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function ShareModal({ isOpen, onClose, children, title = 'Share' }: ShareModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50",
        "transition-opacity duration-200",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div 
        className={cn(
          "bg-white rounded-lg shadow-xl w-full max-w-md",
          "transform transition-all duration-200",
          isOpen ? "scale-100" : "scale-95"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-holy-blue-100">
          <h2 className="text-lg font-semibold text-holy-blue-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-holy-blue-500 hover:text-holy-blue-600 rounded-full hover:bg-holy-blue-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}