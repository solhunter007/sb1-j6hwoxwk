import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Church, Users, Calendar, BookOpen } from 'lucide-react';

export default function ChurchDashboard() {
  const { user, userType } = useAuth();

  if (!user || userType !== 'church') {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-holy-blue-900">Church Dashboard</h1>
        <p className="text-holy-blue-600 mt-1">Manage your church community and content</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-holy-blue-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-holy-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-holy-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-holy-blue-900">Members</h3>
              <p className="text-2xl font-bold text-holy-blue-600">0</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-holy-blue-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-holy-blue-50 rounded-lg">
              <BookOpen className="h-6 w-6 text-holy-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-holy-blue-900">Sermon Notes</h3>
              <p className="text-2xl font-bold text-holy-blue-600">0</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-holy-blue-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-holy-blue-50 rounded-lg">
              <Calendar className="h-6 w-6 text-holy-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-holy-blue-900">Events</h3>
              <p className="text-2xl font-bold text-holy-blue-600">0</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-holy-blue-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-holy-blue-50 rounded-lg">
              <Church className="h-6 w-6 text-holy-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-holy-blue-900">Groups</h3>
              <p className="text-2xl font-bold text-holy-blue-600">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-holy-blue-900 mb-4">Recent Activity</h2>
        <div className="bg-white rounded-lg shadow-sm border border-holy-blue-100 p-6">
          <p className="text-holy-blue-600 text-center">No recent activity</p>
        </div>
      </div>
    </div>
  );
}