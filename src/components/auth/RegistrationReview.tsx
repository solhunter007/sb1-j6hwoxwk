import React from 'react';
import { useRegistrationStore } from '../../stores/registrationStore';
import { Church, User } from 'lucide-react';
import { DefaultAvatar } from '../profile/DefaultAvatar';

export function RegistrationReview() {
  const { data } = useRegistrationStore();

  return (
    <div className="space-y-8">
      {/* Account Type */}
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

      {/* Profile Picture */}
      <div className="flex items-start gap-6">
        <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-holy-blue-100 flex-shrink-0">
          {data.profileImage ? (
            <img
              src={data.profileImage}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <DefaultAvatar size={128} />
          )}
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-holy-blue-600">Full Name</h4>
            <p className="mt-1 text-holy-blue-900">{data.fullName}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-holy-blue-600">Username</h4>
            <p className="mt-1 text-holy-blue-900">@{data.username}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-holy-blue-600">Email</h4>
            <p className="mt-1 text-holy-blue-900">{data.email}</p>
          </div>
        </div>
      </div>

      {/* Church Details */}
      {data.userType === 'church' && data.churchDetails && (
        <div className="border-t border-holy-blue-100 pt-6">
          <h4 className="text-lg font-semibold text-holy-blue-900 mb-4">Church Details</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h5 className="text-sm font-medium text-holy-blue-600">Church Name</h5>
              <p className="mt-1 text-holy-blue-900">{data.churchDetails.name}</p>
            </div>
            <div>
              <h5 className="text-sm font-medium text-holy-blue-600">Location</h5>
              <p className="mt-1 text-holy-blue-900">
                {data.churchDetails.city}, {data.churchDetails.zipCode}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}