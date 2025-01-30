import React from 'react';
import { useRegistrationStore } from '../../stores/registrationStore';
import { Church, User } from 'lucide-react';

export function RegistrationReview() {
  const { data } = useRegistrationStore();

  return (
    <div className="space-y-6">
      <div className="bg-holy-blue-50 p-4 rounded-lg border border-holy-blue-200">
        <p className="text-holy-blue-800 text-sm">
          Please review your information carefully. Your account will only be created after you confirm these details.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {data.userType === 'church' ? (
            <Church className="h-6 w-6 text-holy-blue-500" />
          ) : (
            <User className="h-6 w-6 text-holy-blue-500" />
          )}
          <h3 className="text-lg font-semibold text-holy-blue-900">
            {data.userType === 'church' ? 'Church Account' : 'Individual Account'}
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-holy-blue-600">Full Name</label>
            <p className="mt-1">{data.fullName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-holy-blue-600">Username</label>
            <p className="mt-1">@{data.username}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-holy-blue-600">Email</label>
            <p className="mt-1">{data.email}</p>
          </div>
        </div>

        {data.userType === 'church' && data.churchDetails && (
          <div className="mt-4">
            <h4 className="text-md font-semibold text-holy-blue-900 mb-2">Church Details</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-holy-blue-600">Church Name</label>
                <p className="mt-1">{data.churchDetails.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-holy-blue-600">Location</label>
                <p className="mt-1">{data.churchDetails.city}, {data.churchDetails.zipCode}</p>
              </div>
            </div>
          </div>
        )}

        {(data.profileImage || data.headerImage) && (
          <div className="mt-4">
            <h4 className="text-md font-semibold text-holy-blue-900 mb-2">Images</h4>
            <div className="grid gap-4 md:grid-cols-2">
              {data.profileImage && (
                <div>
                  <label className="block text-sm font-medium text-holy-blue-600">Profile Picture</label>
                  <img 
                    src={data.profileImage} 
                    alt="Profile" 
                    className="mt-1 w-32 h-32 rounded-full object-cover"
                  />
                </div>
              )}
              {data.headerImage && (
                <div>
                  <label className="block text-sm font-medium text-holy-blue-600">Header Image</label>
                  <img 
                    src={data.headerImage} 
                    alt="Header" 
                    className="mt-1 w-full h-32 rounded-lg object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}