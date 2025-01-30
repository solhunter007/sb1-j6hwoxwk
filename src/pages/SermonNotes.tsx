import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus } from 'lucide-react';

export default function SermonNotes() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Sermon Notes</h1>
        {user && (
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-5 w-5 mr-2" />
            New Note
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600 text-center">
          {user 
            ? "You haven't created any sermon notes yet."
            : "Please sign in to create and view sermon notes."}
        </p>
      </div>
    </div>
  );
}