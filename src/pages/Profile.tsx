import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const isOwnProfile = user?.id === id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-gray-200"></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isOwnProfile ? 'Your Profile' : 'User Profile'}
              </h1>
              <p className="text-gray-600">@username</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold mb-4">Recent Notes</h2>
          <p className="text-gray-600">No sermon notes yet.</p>
        </div>
      </div>
    </div>
  );
}