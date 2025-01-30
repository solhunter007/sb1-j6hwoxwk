import React from 'react';
import { useParams } from 'react-router-dom';
import { Users, Calendar, BookOpen } from 'lucide-react';

export default function Church() {
  const { id } = useParams();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center space-x-4">
            <div className="h-20 w-20 rounded-lg bg-gray-200"></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Church Name</h1>
              <p className="text-gray-600">Location</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200">
          <div className="grid md:grid-cols-3 divide-x divide-gray-200">
            <div className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold">Members</h2>
              </div>
              <p className="text-gray-600">No members yet</p>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold">Events</h2>
              </div>
              <p className="text-gray-600">No upcoming events</p>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold">Recent Notes</h2>
              </div>
              <p className="text-gray-600">No sermon notes yet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}