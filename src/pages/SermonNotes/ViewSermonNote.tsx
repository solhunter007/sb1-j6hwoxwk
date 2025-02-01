import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LoadingState } from '../../components/ui/LoadingState';
import { HelpingHand, MessageCircle, Share2, BookOpen, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DefaultAvatar } from '../../components/profile/DefaultAvatar';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';
import { usePraiseStore } from '../../stores/praiseStore';
import { useCommentStore } from '../../stores/commentStore';
import { CommentSection } from '../../components/comments/CommentSection';
import { toast } from 'sonner';
import { ShareButton } from '../../components/share/ShareButton';

interface SermonNote {
  id: string;
  title: string;
  content: any;
  created_at: string;
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

export default function ViewSermonNote() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [note, setNote] = useState<SermonNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { togglePraise, syncPraiseCount } = usePraiseStore();
  const { commentCounts, initializeCommentState } = useCommentStore();

  useEffect(() => {
    if (id) {
      loadSermonNote();
      initializeCommentState(id);
    }
  }, [id, initializeCommentState]);

  useEffect(() => {
    if (note) {
      syncPraiseCount(note.id);
    }
  }, [note, syncPraiseCount]);

  const loadSermonNote = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sermon_notes')
        .select(`
          id,
          title,
          content,
          created_at,
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
        .eq('id', id)
        .single();

      if (error) throw error;

      const processedNote = {
        ...data,
        praise_count: parseInt(data.praise_count) || 0,
        comment_count: parseInt(data.comment_count) || 0,
        user_has_praised: data.user_has_praised?.includes(user?.id) || false
      };

      setNote(processedNote);
      setError(null);
    } catch (err) {
      console.error('Error loading sermon note:', err);
      setError('Failed to load sermon note');
    } finally {
      setLoading(false);
    }
  };

  const handlePraise = async () => {
    if (!user || !note) return;

    try {
      await togglePraise(note.id);
      
      // Update local state
      setNote(prev => {
        if (!prev) return null;
        return {
          ...prev,
          user_has_praised: !prev.user_has_praised,
          praise_count: prev.user_has_praised ? prev.praise_count - 1 : prev.praise_count + 1
        };
      });
    } catch (error) {
      toast.error('Failed to update praise');
    }
  };

  if (loading) return <LoadingState />;

  if (error || !note) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold text-holy-blue-900 mb-4">
            {error || 'Sermon note not found'}
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="btn-primary inline-flex items-center"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Get comment count from store or fallback to initial value
  const commentCount = commentCounts.get(note.id) ?? note.comment_count;

  // Render the content blocks
  const renderContent = (content: any) => {
    if (!content || !content.content) return null;

    return content.content.map((block: any, index: number) => {
      switch (block.type) {
        case 'paragraph':
          return (
            <p key={index} className="mb-4">
              {block.content?.[0]?.text || ''}
            </p>
          );
        case 'heading':
          const HeadingTag = `h${block.attrs.level}` as keyof JSX.IntrinsicElements;
          return (
            <HeadingTag key={index} className="font-bold mb-4">
              {block.content?.[0]?.text || ''}
            </HeadingTag>
          );
        case 'bulletList':
          return (
            <ul key={index} className="list-disc pl-6 mb-4">
              {block.content.map((item: any, itemIndex: number) => (
                <li key={itemIndex}>
                  {item.content?.[0]?.content?.[0]?.text || ''}
                </li>
              ))}
            </ul>
          );
        default:
          return null;
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(-1)}
        className="btn-secondary inline-flex items-center mb-6"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back
      </button>

      <article className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-holy-blue-100">
          <div className="p-8">
            {/* Author Info */}
            <div className="flex items-center mb-6">
              <div className="flex items-center">
                {note.author.avatar_url ? (
                  <img
                    src={note.author.avatar_url}
                    alt={note.author.full_name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full overflow-hidden">
                    <DefaultAvatar size={48} />
                  </div>
                )}
                <div className="ml-3">
                  <h3 className="text-holy-blue-900 font-semibold">
                    {note.author.full_name}
                  </h3>
                  <p className="text-holy-blue-600 text-sm">@{note.author.username}</p>
                </div>
              </div>
              <span className="ml-auto text-sm text-holy-blue-500">
                {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
              </span>
            </div>

            {/* Scripture References */}
            {note.scripture_references && note.scripture_references.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {note.scripture_references.map((reference, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-holy-blue-50 text-holy-blue-600 text-sm"
                  >
                    <BookOpen className="h-4 w-4 mr-1" />
                    {reference}
                  </div>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="prose max-w-none">
              <h1 className="text-3xl font-bold text-holy-blue-900 mb-6">
                {note.title}
              </h1>
              <div className="text-holy-blue-800">
                {renderContent(note.content)}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-6 pt-6 mt-6 border-t border-holy-blue-100">
              <button
                onClick={handlePraise}
                disabled={!user}
                className={cn(
                  "flex items-center gap-2 text-sm transition-colors",
                  note.user_has_praised
                    ? "text-divine-yellow-500 hover:text-divine-yellow-600"
                    : "text-holy-blue-500 hover:text-holy-blue-600",
                  !user && "opacity-50 cursor-not-allowed"
                )}
                title={!user ? "Sign in to praise" : note.user_has_praised ? "Remove Praise" : "Praise"}
              >
                <HelpingHand
                  className={cn(
                    "h-5 w-5",
                    note.user_has_praised && "fill-divine-yellow-500"
                  )}
                />
                <span>{note.praise_count}</span>
              </button>

              <a
                href="#comments"
                className="flex items-center gap-2 text-sm text-holy-blue-500 hover:text-holy-blue-600"
              >
                <MessageCircle className="h-5 w-5" />
                <span>{commentCount}</span>
              </a>

              <ShareButton
                noteId={note.id}
                noteTitle={note.title}
                description={`Check out this sermon note by ${note.author.full_name}`}
                className="ml-auto"
              />
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div id="comments">
          <CommentSection
            sermonNoteId={note.id}
            onCommentAdded={() => {
              // Let the store handle the count update
              initializeCommentState(note.id);
            }}
          />
        </div>
      </article>
    </div>
  );
}