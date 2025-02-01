import React from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

interface FollowStatsProps {
  userId: string;
  followerCount: number;
  followingCount: number;
}

export function FollowStats({ userId, followerCount, followingCount }: FollowStatsProps) {
  return (
    <div className="flex items-center gap-6 text-sm text-holy-blue-600">
      <Link 
        to={`/profile/${userId}/followers`}
        className="flex items-center gap-1 hover:text-holy-blue-700"
      >
        <Users className="h-4 w-4" />
        <span>{followerCount}</span>
        <span>Followers</span>
      </Link>
      <Link 
        to={`/profile/${userId}/following`}
        className="flex items-center gap-1 hover:text-holy-blue-700"
      >
        <Users className="h-4 w-4" />
        <span>{followingCount}</span>
        <span>Following</span>
      </Link>
    </div>
  );
}