import React from 'react';
import { HelpingHand as PrayingHands } from 'lucide-react';

export function DefaultAvatar({ size = 400 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 400 400">
      <rect width="400" height="400" fill="#808080" />
      <foreignObject width="400" height="400">
        <div className="h-full w-full flex items-center justify-center">
          <PrayingHands className="w-1/2 h-1/2 text-white" />
        </div>
      </foreignObject>
    </svg>
  );
}