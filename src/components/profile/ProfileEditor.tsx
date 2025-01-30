import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';
import { HeaderPhotoUpload } from './HeaderPhotoUpload';
import { Loader2 } from 'lucide-react';

interface Profile {
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string | null;
  header_url: string | null;
}

interface ProfileEditorProps {
  profile: Profile | null;
  onUpdate: (profile: Partial<Profile>) => Promise<void>;
  loading?: boolean;
}

export function ProfileEditor({ profile, onUpdate, loading = false }: ProfileEditorProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<Profile>>({
    full_name: '',
    bio: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold text-holy-blue-900 mb-4">Profile Photo</h3>
          <ProfilePhotoUpload
            currentPhoto={profile?.avatar_url || undefined}
            onPhotoChange={async (photo) => {
              if (photo) {
                await onUpdate({ avatar_url: photo });
              }
            }}
            userId={user?.id}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-holy-blue-900 mb-4">Header Image</h3>
          <HeaderPhotoUpload
            currentPhoto={profile?.header_url || undefined}
            onPhotoChange={async (photo) => {
              if (photo) {
                await onUpdate({ header_url: photo });
              }
            }}
            userId={user?.id}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-holy-blue-900">
            Full Name
          </label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-holy-blue-900">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={4}
            className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
}