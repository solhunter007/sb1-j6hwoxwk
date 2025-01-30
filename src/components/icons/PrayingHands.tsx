import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number;
}

export const PrayingHands = ({
  size = 24,
  strokeWidth = 2,
  color = "currentColor",
  ...props
}: IconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 3C10.9 3 9.9 3.9 9.9 5L10 10H7.5C6.7 10 6 10.7 6 11.5C6 12.3 6.7 13 7.5 13H10L9.9 18C9.9 19.1 10.9 20 12 20C13.1 20 14.1 19.1 14.1 18L14 13H16.5C17.3 13 18 12.3 18 11.5C18 10.7 17.3 10 16.5 10H14L14.1 5C14.1 3.9 13.1 3 12 3Z" />
      <path d="M12 3C13.1 3 14.1 3.9 14.1 5L14 10H16.5C17.3 10 18 10.7 18 11.5C18 12.3 17.3 13 16.5 13H14L14.1 18C14.1 19.1 13.1 20 12 20" />
    </svg>
  );
};