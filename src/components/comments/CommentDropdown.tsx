import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Send, Loader2 } from 'lucide-react';
import { DefaultAvatar } from '../profile/DefaultAvatar';
import { cn } from '../../utils/cn';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface CommentDropdownProps {
  sermonNoteId: string;
  isOpen: boolean;
  onCommentAdded: () => void;
}

export function CommentDropdown({ sermonNoteId, isOpen, onCommentAdded }: CommentDropdownProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      loadComments();
      const unsubscribe = subscribeToComments();
      return () => {
        unsubscribe();
      };
    }
  }, [isOpen, sermonNoteId]);

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`comments:${sermonNoteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `sermon_note_id=eq.${sermonNoteId}`
        },
        () => {
          if (dropdownRef.current) {
            loadComments();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const loadComments = async () => {
    if (!dropdownRef.current) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          author:profiles!comments_author_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('sermon_note_id', sermonNoteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (dropdownRef.current) {
        setComments(data || []);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      if (dropdownRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('comments')
        .insert([
          {
            sermon_note_id: sermonNoteId,
            author_id: user.id,
            content: newComment.trim()
          }
        ]);

      if (error) throw error;

      setNewComment('');
      onCommentAdded();
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className={cn(
        "absolute top-full left-0 w-full md:w-96 bg-white rounded-lg shadow-lg border border-holy-blue-100 mt-2 z-10",
        "transform origin-top transition-all duration-200 ease-out",
        isOpen ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
      )}
    >
      {/* Comment Input */}
      {user && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-holy-blue-100">
          <div className="flex items-start gap-3">
            {user.user_metadata.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata.full_name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <DefaultAvatar size={32} />
              </div>
            )}
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full px-3 py-2 border border-holy-blue-200 rounded-lg resize-none focus:ring-1 focus:ring-holy-blue-500 focus:border-holy-blue-500"
                rows={2}
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="btn-primary py-2 px-4"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-holy-blue-500" />
          </div>
        ) : comments.length > 0 ? (
          <div className="divide-y divide-holy-blue-100">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4">
                <div className="flex items-start gap-3">
                  {comment.author.avatar_url ? (
                    <img
                      src={comment.author.avatar_url}
                      alt={comment.author.full_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <DefaultAvatar size={32} />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <h4 className="font-semibold text-holy-blue-900">
                        {comment.author.full_name}
                      </h4>
                      <span className="text-xs text-holy-blue-500">
                        {format(new Date(comment.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <p className="text-holy-blue-800 mt-1">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-holy-blue-600">
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
    </div>
  );
}