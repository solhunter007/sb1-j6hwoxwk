import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SermonCard } from '../components/sermon/SermonCard';
import { FeedFilters } from '../components/feed/FeedFilters';
import { LoadingState } from '../components/ui/LoadingState';
import { Scroll, AlertCircle, PenSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

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

type FilterType = 'recent' | 'following' | 'praised' | 'church';

export default function Feed() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<SermonNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSermonNotes();
  }, [filter, searchQuery, user]);

  const loadSermonNotes = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
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
        .order('created_at', { ascending: false });

      // Show both public notes and the user's own notes
      if (user) {
        query = query.or(`visibility.eq.public,author_id.eq.${user.id}`);
      } else {
        query = query.eq('visibility', 'public');
      }

      // Apply filters
      if (filter === 'following') {
        query = query.in('author_id', [user?.id]); // Replace with actual following logic
      } else if (filter === 'praised') {
        query = query.eq('praises.user_id', user?.id);
      } else if (filter === 'church') {
        query = query.eq('visibility', 'church');
      }

      // Apply search
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content->>'text'.ilike.%${searchQuery}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Process the data to format counts and user_has_praised correctly
      const processedNotes = data?.map(note => ({
        ...note,
        praise_count: parseInt(note.praise_count) || 0,
        comment_count: parseInt(note.comment_count) || 0,
        user_has_praised: note.user_has_praised?.includes(user?.id) || false
      })) || [];

      setNotes(processedNotes);
    } catch (err) {
      console.error('Error loading sermon notes:', err);
      setError('Failed to load sermon notes');
      toast.error('Failed to load sermon notes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Section with CTA */}
      <div className="text-center py-12 mb-8 bg-gradient-to-br from-holy-blue-50 to-white rounded-2xl border border-holy-blue-100 shadow-sm">
        <h1 className="text-4xl font-bold text-holy-blue-900 mb-4">
          Share Your Spiritual Insights
        </h1>
        <p className="text-lg text-holy-blue-600 mb-8 max-w-2xl mx-auto">
          Capture and share your sermon reflections with the community
        </p>
        <Link
          to="/sermon-notes/new"
          className="btn-primary inline-flex items-center px-8 py-4 text-lg group relative"
          aria-label="Create new sermon notes"
        >
          <PenSquare className="h-6 w-6 mr-2 group-hover:animate-bounce" />
          New Sermon Notes
          <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-holy-blue-900">Your Feed</h2>
          <p className="text-holy-blue-600 mt-1">
            Discover and engage with sermon notes from your community
          </p>
        </div>
      </div>

      <FeedFilters
        filter={filter}
        onFilterChange={setFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      ) : notes.length > 0 ? (
        <div className="space-y-6">
          {notes.map(note => (
            <SermonCard
              key={note.id}
              note={note}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-holy-blue-50 rounded-lg">
          <Scroll className="h-12 w-12 text-holy-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-holy-blue-900 mb-2">
            No sermon notes found
          </h3>
          <p className="text-holy-blue-600">
            {filter === 'following'
              ? "You're not following anyone yet"
              : filter === 'praised'
              ? "You haven't praised any sermon notes"
              : "There are no sermon notes to display"}
          </p>
        </div>
      )}
    </div>
  );
}