import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Send, Loader2, MessageCircle, Trash2 } from 'lucide-react';
import { DefaultAvatar } from '../profile/DefaultAvatar';
import { cn } from '../../utils/cn';
import { toast } from 'sonner';
import { logger } from '../../utils/logger';
import { useCommentStore } from '../../stores/commentStore';
import { commentLogger } from '../../utils/commentLogger';

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

interface CommentSectionProps {
  sermonNoteId: string;
  onCommentAdded?: () => void;
}

export function CommentSection({ sermonNoteId, onCommentAdded }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { syncCommentCount } = useCommentStore();
  const commentSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only load comments if the component is mounted
    if (commentSectionRef.current) {
      loadComments();
      const unsubscribe = subscribeToComments();
      return () => {
        unsubscribe();
      };
    }
  }, [sermonNoteId]);

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
        async (payload) => {
          if (!commentSectionRef.current) return; // Check if component is still mounted
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { data: newComment, error } = await supabase
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
              .eq('id', payload.new.id)
              .single();

            if (!error && newComment) {
              setComments(prev => {
                const filtered = prev.filter(c => c.id !== newComment.id);
                return [newComment, ...filtered];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setComments(prev => prev.filter(c => c.id !== payload.old.id));
          }

          await syncCommentCount(sermonNoteId);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const loadComments = async () => {
    if (!commentSectionRef.current) return; // Check if component is still mounted

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
      
      if (commentSectionRef.current) { // Check again before setting state
        setComments(data || []);
      }
    } catch (error) {
      logger.error('loadComments', 'Failed to load comments', error as Error, { sermonNoteId });
      toast.error('Failed to load comments');
    } finally {
      if (commentSectionRef.current) { // Check again before setting state
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || !sermonNoteId) return;

    try {
      setSubmitting(true);
      
      // Get latest user profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Create optimistic comment
      const tempComment: Comment = {
        id: 'temp-' + Date.now(),
        content: newComment.trim(),
        created_at: new Date().toISOString(),
        author: {
          id: user.id,
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url
        }
      };

      // Log optimistic update
      commentLogger.logCommentAction('add', {
        noteId: sermonNoteId,
        userId: user.id,
        content: newComment.trim()
      });

      setComments(prev => [tempComment, ...prev]);
      setNewComment('');

      const { data, error } = await supabase
        .from('comments')
        .insert([{
          sermon_note_id: sermonNoteId,
          author_id: user.id,
          content: newComment.trim()
        }])
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
        .single();

      if (error) throw error;

      // Log successful comment creation
      commentLogger.logCommentAction('add', {
        commentId: data.id,
        noteId: sermonNoteId,
        userId: user.id,
        content: data.content
      });

      // Replace temp comment with real one
      setComments(prev => [
        data,
        ...prev.filter(c => c.id !== tempComment.id)
      ]);

      onCommentAdded?.();
      toast.success('Comment added successfully');
    } catch (error) {
      // Log error
      commentLogger.logCommentAction('add', {
        noteId: sermonNoteId,
        userId: user.id,
        content: newComment.trim(),
        error: error as Error
      });

      logger.error('handleSubmit', 'Failed to add comment', error as Error, { sermonNoteId });
      toast.error('Failed to add comment');
      
      // Revert optimistic update
      setComments(prev => prev.filter(c => !c.id.startsWith('temp-')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user || commentId.startsWith('temp-')) return;

    try {
      setDeleting(commentId);

      // Log delete attempt
      commentLogger.logCommentAction('delete', {
        commentId,
        noteId: sermonNoteId,
        userId: user.id
      });

      // Optimistically remove from UI
      setComments(prev => prev.filter(c => c.id !== commentId));

      const { error } = await supabase.rpc('delete_comment', {
        p_comment_id: commentId,
        p_user_id: user.id
      });

      if (error) throw error;

      // Log successful deletion
      commentLogger.logCommentAction('delete', {
        commentId,
        noteId: sermonNoteId,
        userId: user.id
      });

      toast.success('Comment deleted successfully');
    } catch (error) {
      // Log error
      commentLogger.logCommentAction('delete', {
        commentId,
        noteId: sermonNoteId,
        userId: user.id,
        error: error as Error
      });

      logger.error('handleDelete', 'Failed to delete comment', error as Error, { commentId });
      toast.error('Failed to delete comment');
      
      // Reload comments to restore state
      loadComments();
    } finally {
      setDeleting(null);
    }
  };

  const renderAvatar = (comment: Comment) => {
    if (comment.author.avatar_url) {
      return (
        <img
          src={comment.author.avatar_url}
          alt={comment.author.full_name}
          className="w-10 h-10 rounded-full object-cover"
          onError={(e) => {
            // If image fails to load, replace with DefaultAvatar
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      );
    }
    
    return (
      <div className="w-10 h-10 rounded-full overflow-hidden">
        <DefaultAvatar size={40} />
      </div>
    );
  };

  return (
    <div ref={commentSectionRef} className="bg-white rounded-lg shadow-sm border border-holy-blue-100">
      <div className="p-6 border-b border-holy-blue-100">
        <h2 className="text-xl font-semibold text-holy-blue-900 flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Comments
        </h2>
      </div>

      {user && (
        <div className="p-6 border-b border-holy-blue-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start gap-3">
              {renderAvatar({
                id: 'current-user',
                content: '',
                created_at: new Date().toISOString(),
                author: {
                  id: user.id,
                  username: user.user_metadata.username,
                  full_name: user.user_metadata.full_name,
                  avatar_url: user.user_metadata.avatar_url
                }
              })}
              <div className="flex-1">
                <label htmlFor="comment-input" className="sr-only">Write a comment</label>
                <textarea
                  id="comment-input"
                  name="comment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full px-4 py-3 border border-holy-blue-200 rounded-lg resize-none focus:ring-1 focus:ring-holy-blue-500 focus:border-holy-blue-500"
                  rows={3}
                  aria-label="Comment text"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="btn-primary"
                aria-label={submitting ? "Sending comment..." : "Post comment"}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Post Comment
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Comments List */}
      <div className="divide-y divide-holy-blue-100">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-holy-blue-500" />
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="p-6">
              <div className="flex items-start gap-3">
                {renderAvatar(comment)}
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <h4 className="font-semibold text-holy-blue-900">
                        {comment.author.full_name}
                      </h4>
                      <p className="text-sm text-holy-blue-600">@{comment.author.username}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-holy-blue-500">
                        {format(new Date(comment.created_at), 'MMM d, yyyy')}
                      </span>
                      {user?.id === comment.author.id && !comment.id.startsWith('temp-') && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          disabled={deleting === comment.id}
                          className={cn(
                            "text-red-500 hover:text-red-600 transition-colors",
                            deleting === comment.id && "opacity-50 cursor-not-allowed"
                          )}
                          title="Delete comment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-holy-blue-800 mt-2 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <p className="text-holy-blue-600">
              No comments yet. Be the first to comment!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}