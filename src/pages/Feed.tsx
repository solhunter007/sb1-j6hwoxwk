import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SermonCard } from '../components/sermon/SermonCard';
import { FeedFilters } from '../components/feed/FeedFilters';
import { LoadingState } from '../components/ui/LoadingState';
import { Scroll, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

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
  }, [filter, searchQuery]);

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
          user_has_praised:praises!inner(user_id)
        `)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

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

      setNotes(data || []);
    } catch (err) {
      console.error('Error loading sermon notes:', err);
      setError('Failed to load sermon notes');
      toast.error('Failed to load sermon notes');
    } finally {
      setLoading(false);
    }
  };

  const handlePraise = async (noteId: string, currentlyPraised: boolean) => {
    if (!user) {
      toast.error('Please sign in to praise sermon notes');
      return;
    }

    try {
      if (currentlyPraised) {
        await supabase
          .from('praises')
          .delete()
          .eq('sermon_note_id', noteId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('praises')
          .insert({ sermon_note_id: noteId, user_id: user.id });
      }

      // Update local state
      setNotes(prevNotes =>
        prevNotes.map(note =>
          note.id === noteId
            ? {
                ...note,
                praise_count: currentlyPraised
                  ? note.praise_count - 1
                  : note.praise_count + 1,
                user_has_praised: !currentlyPraised,
              }
            : note
        )
      );
    } catch (error) {
      console.error('Error toggling praise:', error);
      toast.error('Failed to update praise');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-holy-blue-900">Your Feed</h1>
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
              onPraise={() => handlePraise(note.id, note.user_has_praised)}
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