import React from 'react';
import { Link } from 'react-router-dom';
import { Church, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';

interface ChurchMembershipProps {
  userId: string;
  membership?: {
    churchId: string;
    churchName: string;
    location: string;
    status: 'pending' | 'active' | 'rejected';
  };
  onMembershipChange?: () => void;
}

export function ChurchMembership({ 
  userId, 
  membership,
  onMembershipChange 
}: ChurchMembershipProps) {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const isOwnProfile = user?.id === userId;

  const handleJoinLeave = async () => {
    if (!user) {
      toast.error('Please sign in to join a church');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('handle_church_membership', {
        p_church_id: membership?.churchId,
        p_action: membership ? 'leave' : 'join'
      });

      if (error) throw error;

      onMembershipChange?.();

      toast.success(
        data.action === 'requested'
          ? 'Membership request sent'
          : 'Successfully left church'
      );
    } catch (error) {
      console.error('Error updating church membership:', error);
      toast.error('Failed to update church membership');
    } finally {
      setLoading(false);
    }
  };

  if (!membership) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-holy-blue-50 rounded-lg text-center">
        <Church className="h-12 w-12 text-holy-blue-400" />
        <div>
          <h3 className="font-semibold text-holy-blue-900">No Church Membership</h3>
          <p className="text-sm text-holy-blue-600 mt-1">
            {isOwnProfile 
              ? "Join a church to connect with your community"
              : "This user hasn't joined a church yet"}
          </p>
        </div>
        {isOwnProfile && (
          <Link 
            to="/churches"
            className="btn-primary"
          >
            Find a Church
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg border border-holy-blue-100">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-holy-blue-50 rounded-lg">
            <Church className="h-6 w-6 text-holy-blue-500" />
          </div>
          <div>
            <Link 
              to={`/church/${membership.churchId}`}
              className="font-semibold text-holy-blue-900 hover:text-holy-blue-600"
            >
              {membership.churchName}
            </Link>
            <div className="flex items-center gap-1 text-sm text-holy-blue-600 mt-1">
              <MapPin className="h-4 w-4" />
              <span>{membership.location}</span>
            </div>
            <div className={cn(
              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2",
              membership.status === 'active' 
                ? "bg-green-100 text-green-800"
                : membership.status === 'pending'
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            )}>
              {membership.status.charAt(0).toUpperCase() + membership.status.slice(1)}
            </div>
          </div>
        </div>
        {isOwnProfile && (
          <button
            onClick={handleJoinLeave}
            disabled={loading}
            className="btn-secondary"
          >
            Leave Church
          </button>
        )}
      </div>
    </div>
  );
}