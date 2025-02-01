import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  onFollowChange?: () => void;
  className?: string;
}

export function FollowButton({ 
  userId, 
  isFollowing, 
  onFollowChange,
  className 
}: FollowButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please sign in to follow users');
      return;
    }

    if (user.id === userId) {
      toast.error('You cannot follow yourself');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('toggle_follow', {
        p_following_id: userId
      });

      if (error) throw error;

      onFollowChange?.();

      toast.success(
        data.action === 'followed' 
          ? 'Successfully followed user' 
          : 'Successfully unfollowed user'
      );
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFollow}
      disabled={loading || !user || user.id === userId}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors",
        isFollowing
          ? "bg-holy-blue-100 text-holy-blue-600 hover:bg-holy-blue-200"
          : "bg-holy-blue-500 text-white hover:bg-holy-blue-600",
        (loading || !user || user.id === userId) && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <UserMinus className="h-4 w-4" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}