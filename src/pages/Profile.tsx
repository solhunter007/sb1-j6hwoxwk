import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LoadingState } from '../components/ui/LoadingState';
import { format } from 'date-fns';
import { Edit2, Calendar, ArrowLeft } from 'lucide-react';
import { DefaultAvatar } from '../components/profile/DefaultAvatar';
import { AccountSettings } from '../components/profile/AccountSettings';
import { usePraiseStore } from '../stores/praiseStore';
import { FollowButton } from '../components/profile/FollowButton';
import { FollowStats } from '../components/profile/FollowStats';
import { ChurchMembership } from '../components/profile/ChurchMembership';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  header_url: string | null;
  bio: string;
  created_at: string;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  church_membership?: {
    churchId: string;
    churchName: string;
    location: string;
    status: 'pending' | 'active' | 'rejected';
  };
  sermon_notes: Array<{
    id: string;
    title: string;
    created_at: string;
    visibility: string;
  }>;
}

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const isOwnProfile = user?.id === id;
  const { initializePraiseState } = usePraiseStore();

  useEffect(() => {
    if (id) {
      loadProfile();
    }
  }, [id]);

  const loadProfile = async () => {
    try {
      if (!id) {
        setError('Profile ID is required');
        setLoading(false);
        return;
      }

      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          full_name,
          avatar_url,
          header_url,
          bio,
          created_at,
          follower_count,
          following_count,
          sermon_notes (
            id,
            title,
            created_at,
            visibility
          )
        `)
        .eq('id', id)
        .single();

      if (profileError) throw profileError;

      // Get follow status if logged in
      let isFollowing = false;
      if (user) {
        const { data: followData } = await supabase.rpc('get_follow_counts', {
          p_user_id: id
        });
        isFollowing = followData?.is_following || false;
      }

      // Get church membership using the new function
      const { data: membershipData } = await supabase.rpc('get_church_membership', {
        p_user_id: id
      });

      const churchMembership = membershipData ? {
        churchId: membershipData.church_id,
        churchName: membershipData.church_name,
        location: membershipData.location,
        status: membershipData.status
      } : undefined;

      setProfile({
        ...profileData,
        is_following: isFollowing,
        church_membership: churchMembership
      });

      // Initialize praise state for sermon notes
      if (profileData.sermon_notes) {
        await Promise.all(
          profileData.sermon_notes.map(note => initializePraiseState(note.id))
        );
      }

      setError(null);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-holy-blue-900 mb-4">{error}</h2>
          <p className="text-holy-blue-600 mb-6">
            {error === 'Profile not found' 
              ? 'The profile you are looking for does not exist.'
              : 'There was a problem loading this profile.'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary inline-flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  if (showSettings && isOwnProfile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => setShowSettings(false)}
            className="btn-secondary inline-flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </button>
        </div>
        <AccountSettings />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* Header Image */}
        <div 
          className="h-48 bg-gradient-to-r from-holy-blue-500 to-holy-blue-600"
          style={profile.header_url ? {
            backgroundImage: `url(${profile.header_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined}
        />
        
        <div className="relative px-6 pb-6">
          {/* Profile Image */}
          <div className="absolute -top-16 left-6">
            <div className="h-32 w-32 rounded-full bg-white p-1 shadow-lg">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <DefaultAvatar size={128} />
              )}
            </div>
          </div>

          {/* Profile Actions */}
          <div className="absolute top-4 right-6 flex items-center gap-3">
            {!isOwnProfile && (
              <FollowButton
                userId={profile.id}
                isFollowing={profile.is_following}
                onFollowChange={loadProfile}
              />
            )}
            {isOwnProfile && (
              <button 
                onClick={() => setShowSettings(true)}
                className="btn-secondary"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
            )}
          </div>

          {/* Profile Info */}
          <div className="pt-20">
            <div className="flex items-baseline space-x-3">
              <h1 className="text-2xl font-bold text-holy-blue-900">
                {profile.full_name}
              </h1>
              <span className="text-holy-blue-600">@{profile.username}</span>
            </div>
            
            {profile.bio && (
              <p className="mt-4 text-holy-blue-800">{profile.bio}</p>
            )}

            <div className="mt-4 flex items-center justify-between">
              <FollowStats
                userId={profile.id}
                followerCount={profile.follower_count}
                followingCount={profile.following_count}
              />
              <div className="flex items-center text-sm text-holy-blue-600">
                <Calendar className="h-4 w-4 mr-1" />
                Joined {format(new Date(profile.created_at), 'MMMM yyyy')}
              </div>
            </div>
          </div>

          {/* Church Membership */}
          <div className="mt-8">
            <ChurchMembership
              userId={profile.id}
              membership={profile.church_membership}
              onMembershipChange={loadProfile}
            />
          </div>

          {/* Sermon Notes */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-holy-blue-900">Sermon Notes</h2>
            {profile.sermon_notes?.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {profile.sermon_notes.map((note) => (
                  <Link
                    key={note.id}
                    to={`/sermon-notes/${note.id}`}
                    className="card p-4 hover:scale-102 transition-transform hover:shadow-md"
                  >
                    <h3 className="font-semibold text-holy-blue-900 hover:text-holy-blue-600 transition-colors">
                      {note.title}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-holy-blue-600">
                        {format(new Date(note.created_at), 'MMM d, yyyy')}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-holy-blue-50 text-holy-blue-600">
                        {note.visibility}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-holy-blue-50 rounded-lg">
                <p className="text-holy-blue-600">No sermon notes yet.</p>
                {isOwnProfile && (
                  <Link to="/sermon-notes/new" className="btn-primary mt-4">
                    Create Your First Note
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}