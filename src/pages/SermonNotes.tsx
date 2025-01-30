import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Filter } from 'lucide-react';
import { SermonEditor } from '../components/sermon/Editor';

export default function SermonNotes() {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = async (content: string) => {
    // TODO: Implement save draft functionality
    console.log('Saving draft:', content);
  };

  const handlePublish = async (content: string) => {
    // TODO: Implement publish functionality
    console.log('Publishing:', content);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-holy-blue-900">Sermon Notes</h1>
          <p className="text-holy-blue-600 mt-1">Capture and share your spiritual insights</p>
        </div>

        {user && !isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="btn-primary self-start md:self-auto"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Note
          </button>
        )}
      </div>

      {user ? (
        isCreating ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-holy-blue-900">Create New Note</h2>
              <button 
                onClick={() => setIsCreating(false)}
                className="text-holy-blue-600 hover:text-holy-blue-700"
              >
                Cancel
              </button>
            </div>
            <SermonEditor onSave={handleSave} onPublish={handlePublish} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-holy-blue-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search your notes..."
                  className="pl-10 w-full rounded-md border border-holy-blue-200 px-4 py-2 focus:border-holy-blue-500 focus:ring focus:ring-holy-blue-200 focus:ring-opacity-50"
                />
              </div>
              <button className="btn-secondary">
                <Filter className="h-5 w-5 mr-2" />
                Filter
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-holy-blue-600 text-center">
                You haven't created any sermon notes yet.
              </p>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-holy-blue-600 mb-4">
            Please sign in to create and view sermon notes.
          </p>
          <a href="/auth" className="btn-primary inline-flex">
            Sign In to Continue
          </a>
        </div>
      )}
    </div>
  );
}