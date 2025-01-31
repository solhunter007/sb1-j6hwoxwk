import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Scroll } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SermonCard } from '../components/sermon/SermonCard';
import { LoadingState } from '../components/ui/LoadingState';

interface SermonNote {
  id: string;
  title: string;
  content: any;
  created_at: string;
  visibility: 'public' | 'private' | 'church';
  author: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  praise_count: number;
  comment_count: number;
  user_has_praised: boolean;
  scripture_references: string[];
}

export default function SermonNotes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<SermonNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      loadUserNotes();
    }
  }, [user]);

  const loadUserNotes = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sermon_notes')
        .select(`
          id,
          title,
          content,
          created_at,
          visibility,
          scripture_references,
          author:profiles!sermon_notes_author_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          ),
          praise_count:praises(count),
          comment_count:comments(count),
          user_has_praised:praises!left(user_id)
        `)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process the data to format counts and user_has_praised correctly
      const processedNotes = data?.map(note => ({
        ...note,
        praise_count: parseInt(note.praise_count) || 0,
        comment_count: parseInt(note.comment_count) || 0,
        user_has_praised: note.user_has_praised?.includes(user.id) || false
      })) || [];

      setNotes(processedNotes);
    } catch (error) {
      console.error('Error loading user notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = notes.filter(note =>
    searchQuery
      ? note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(note.content).toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-holy-blue-900">Sermon Notes</h1>
          <p className="text-holy-blue-600 mt-1">Capture and share your spiritual insights</p>
        </div>

        {user && (
          <button 
            onClick={() => navigate('/sermon-notes/new')}
            className="btn-primary self-start md:self-auto"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Note
          </button>
        )}
      </div>

      {user ? (
        <>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-holy-blue-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search your notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full rounded-md border border-holy-blue-200 px-4 py-2 focus:border-holy-blue-500 focus:ring focus:ring-holy-blue-200 focus:ring-opacity-50"
              />
            </div>
            <button className="btn-secondary">
              <Filter className="h-5 w-5 mr-2" />
              Filter
            </button>
          </div>

          {loading ? (
            <LoadingState />
          ) : filteredNotes.length > 0 ? (
            <div className="space-y-6">
              {filteredNotes.map(note => (
                <SermonCard
                  key={note.id}
                  note={note}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <Scroll className="h-12 w-12 text-holy-blue-400 mx-auto mb-4" />
              <p className="text-holy-blue-600 mb-4">
                {searchQuery
                  ? "No notes match your search"
                  : "You haven't created any sermon notes yet."}
              </p>
              <button
                onClick={() => navigate('/sermon-notes/new')}
                className="btn-primary"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Note
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-holy-blue-600 mb-4">
            Please sign in to create and view sermon notes.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="btn-primary inline-flex"
          >
            Sign In to Continue
          </button>
        </div>
      )}
    </div>
  );
}