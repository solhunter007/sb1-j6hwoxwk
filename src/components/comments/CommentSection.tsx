import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Send, Loader2, MessageCircle, Trash2, HelpingHand, AlertTriangle } from 'lucide-react';
import { DefaultAvatar } from '../profile/DefaultAvatar';
import { cn } from '../../utils/cn';
import { toast } from 'sonner';
import { logger } from '../../utils/logger';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  praise_count: number;
  user_has_praised: boolean;
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
  onCommentDeleted?: () => void;
}

export function CommentSection({ 
  sermonNoteId, 
  onCommentAdded, 
  onCommentDeleted 
}: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [praisingComment, setPraisingComment] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    if (!sermonNoteId) return;
    
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
          ),
          praise_count:comment_praises(count),
          user_has_praised:comment_praises!left(user_id)
        `)
        .eq('sermon_note_id', sermonNoteId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('loadComments', 'Failed to load comments', error, { sermonNoteId });
        throw error;
      }

      const processedComments = data?.map(comment => ({
        ...comment,
        praise_count: parseInt(comment.praise_count) || 0,
        user_has_praised: comment.user_has_praised?.includes(user?.id) || false
      })) || [];

      setComments(processedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [sermonNoteId, user?.id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (!sermonNoteId) return;

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
        (payload) => {
          logger.info('commentSubscription', 'Comment change detected', { 
            event: payload.eventType,
            commentId: payload.old?.id || payload.new?.id 
          });
          loadComments();
        }
      )
      .subscribe((status) => {
        logger.info('commentSubscription', 'Subscription status changed', { status });
      });

    return () => {
      logger.info('commentSubscription', 'Unsubscribing from comments channel', { sermonNoteId });
      channel.unsubscribe();
    };
  }, [sermonNoteId, loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || !sermonNoteId) return;

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('comments')
        .insert([{
          sermon_note_id: sermonNoteId,
          author_id: user.id,
          content: newComment.trim()
        }]);

      if (error) throw error;

      setNewComment('');
      onCommentAdded?.();
      toast.success('Comment added successfully');
    } catch (error) {
      logger.error('handleSubmit', 'Failed to add comment', error as Error, { sermonNoteId });
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user || !commentId || deleting) return;

    try {
      setDeleting(commentId);
      logger.info('handleDelete', 'Starting comment deletion', { commentId });

      // Begin transaction
      const { data: comment, error: verifyError } = await supabase
        .from('comments')
        .select('id, author_id')
        .eq('id', commentId)
        .eq('author_id', user.id)
        .single();

      if (verifyError) {
        logger.error('handleDelete', 'Failed to verify comment ownership', verifyError, { commentId });
        throw new Error('Failed to verify comment ownership');
      }

      if (!comment) {
        logger.warn('handleDelete', 'Comment not found or unauthorized', { commentId });
        throw new Error('You do not have permission to delete this comment');
      }

      // Delete the comment and all related data in a transaction
      const { error: deleteError } = await supabase.rpc('delete_comment', {
        p_comment_id: commentId,
        p_user_id: user.id
      });

      if (deleteError) {
        logger.error('handleDelete', 'Failed to delete comment', deleteError, { commentId });
        throw deleteError;
      }

      // Update local state
      setComments(prev => prev.filter(c => c.id !== commentId));
      onCommentDeleted?.();
      
      logger.info('handleDelete', 'Comment deleted successfully', { commentId });
      toast.success('Comment deleted successfully');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete comment');
    } finally {
      setDeleting(null);
      setDeleteConfirm(null);
    }
  };

  const handlePraise = async (commentId: string) => {
    if (!user || !commentId) return;

    try {
      setPraisingComment(commentId);
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;

      const { error } = await supabase.rpc('toggle_comment_praise', {
        p_comment_id: commentId,
        p_user_id: user.id
      });

      if (error) throw error;

      await loadComments();
    } catch (error) {
      logger.error('handlePraise', 'Failed to toggle comment praise', error as Error, { commentId });
      toast.error('Failed to update praise');
    } finally {
      setPraisingComment(null);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-holy-blue-100">
      <div className="p-4 border-b border-holy-blue-100">
        <h3 className="text-lg font-semibold text-holy-blue-900 flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Comments ({comments.length})
        </h3>
      </div>

      {/* Comment Input */}
      {user && (
        <div className="p-4 border-b border-holy-blue-100">
          <form onSubmit={handleSubmit}>
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
        </div>
      )}

      {/* Comments List */}
      <div className="divide-y divide-holy-blue-100">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-holy-blue-500" />
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="p-4">
              {deleteConfirm === comment.id ? (
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-700">Delete Comment?</h4>
                      <p className="text-red-600 text-sm">
                        This action cannot be undone. The comment will be permanently deleted.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                      disabled={deleting === comment.id}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={deleting === comment.id}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {deleting === comment.id ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
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
                    <div className="flex items-center gap-4 mt-2">
                      <button
                        onClick={() => handlePraise(comment.id)}
                        disabled={!user || praisingComment === comment.id}
                        className={cn(
                          "group flex items-center gap-1.5 text-sm transition-colors",
                          comment.user_has_praised
                            ? "text-divine-yellow-500 hover:text-divine-yellow-600"
                            : "text-holy-blue-500 hover:text-holy-blue-600",
                          (!user || praisingComment === comment.id) && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <HelpingHand
                          className={cn(
                            "h-4 w-4",
                            comment.user_has_praised && "fill-divine-yellow-500",
                            "group-hover:scale-110 transition-transform"
                          )}
                        />
                        <span>{comment.praise_count}</span>
                      </button>
                      {user?.id === comment.author.id && (
                        <button
                          onClick={() => setDeleteConfirm(comment.id)}
                          className="text-red-500 hover:text-red-600"
                          title="Delete comment"
                          disabled={deleting === comment.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-holy-blue-600">
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
    </div>
  );
}