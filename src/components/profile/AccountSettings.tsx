import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Trash2, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';
import { ProfileEditor } from './ProfileEditor';

interface Profile {
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string | null;
  header_url: string | null;
}

export function AccountSettings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm account deletion');
      return;
    }

    setLoading(true);
    try {
      // Delete all user data
      const { error: storageError } = await supabase.storage
        .from('avatars')
        .remove([`${user.id}/profile.jpg`, `${user.id}/header.jpg`]);

      if (storageError) {
        console.error('Error deleting storage:', storageError);
      }

      // Delete user auth record
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

      if (deleteError) throw deleteError;

      await signOut();
      navigate('/');
      toast.success('Your account has been deleted');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
      setIsDeleting(false);
    }
  };

  const handleProfileUpdate = async (updatedProfile: Partial<Profile>) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updatedProfile)
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-holy-blue-100">
        <div className="p-6">
          <h2 className="text-2xl font-semibold text-holy-blue-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-holy-blue-500" />
            Account Settings
          </h2>
        </div>

        <div className="border-t border-holy-blue-100">
          <ProfileEditor
            profile={profile}
            onUpdate={handleProfileUpdate}
            loading={loading}
          />
        </div>

        <div className="border-t border-holy-blue-100 p-6">
          <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
          
          {!isDeleting ? (
            <button
              onClick={() => setIsDeleting(true)}
              className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="h-5 w-5" />
              Delete Account
            </button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900">
                      Are you sure you want to delete your account?
                    </h4>
                    <p className="mt-1 text-sm text-red-700">
                      This action cannot be undone. All your data, posts, and profile information will be permanently erased.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">
                  Type DELETE to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full px-3 py-2 border border-red-200 rounded-lg focus:ring-red-500 focus:border-red-500"
                  placeholder="DELETE"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'DELETE' || loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Deletion
                </button>
                <button
                  onClick={() => {
                    setIsDeleting(false);
                    setDeleteConfirmation('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}