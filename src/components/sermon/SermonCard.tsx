import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, HelpingHand } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DefaultAvatar } from '../profile/DefaultAvatar';
import { cn } from '../../utils/cn';
import { usePraiseStore } from '../../stores/praiseStore';
import { useCommentStore } from '../../stores/commentStore';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { ShareButton } from '../share/ShareButton';

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

interface SermonCardProps {
  note: SermonNote;
}

export function SermonCard({ note }: SermonCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = React.useState(false);
  const { togglePraise, initializePraiseState, praisedNotes, praiseCounts } = usePraiseStore();
  const { commentCounts, initializeCommentState, subscribeToCommentUpdates } = useCommentStore();

  // Use store values with fallback to prop values
  const hasPraised = praisedNotes.has(note.id);
  const praiseCount = praiseCounts.get(note.id) ?? note.praise_count;
  const commentCount = commentCounts.get(note.id) ?? note.comment_count;

  // Initialize praise and comment state once on mount
  useEffect(() => {
    if (note.id) {
      // Initialize states
      initializePraiseState(note.id);
      initializeCommentState(note.id);

      // Subscribe to comment updates
      const unsubscribe = subscribeToCommentUpdates(note.id);

      // Cleanup subscription on unmount
      return () => {
        unsubscribe();
      };
    }
  }, [note.id, initializePraiseState, initializeCommentState, subscribeToCommentUpdates]);

  const handlePraise = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to praise sermon notes');
      navigate('/auth', { 
        state: { from: location },
        replace: true 
      });
      return;
    }

    if (isLoading) return;

    try {
      setIsLoading(true);
      await togglePraise(note.id);
      toast.success(
        hasPraised ? 'Praise removed' : 'Sermon note praised!',
        { duration: 2000 }
      );
    } catch (error) {
      console.error('Error toggling praise:', error);
      toast.error('Failed to update praise. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Extract text content from the note content object
  const getTextContent = (content: any): string => {
    try {
      if (!content || !content.content) return '';
      
      // Filter out pastor and church info from preview
      const contentBlocks = content.content
        .filter((block: any) => block.type === 'paragraph')
        .filter((block: any) => {
          const text = block.content?.[0]?.text || '';
          return !text.startsWith('Pastor:') && !text.startsWith('Church:');
        });

      return contentBlocks
        .map((block: any) => block.content?.[0]?.text || '')
        .join(' ')
        .slice(0, 200) + '...';
    } catch (e) {
      console.error('Error parsing note content:', e);
      return '';
    }
  };

  // Extract pastor and church info
  const getSermonInfo = (content: any): { pastor: string; church: string } => {
    try {
      if (!content || !content.content) return { pastor: '', church: '' };

      const info = {
        pastor: '',
        church: ''
      };

      content.content.forEach((block: any) => {
        if (block.type === 'paragraph') {
          const text = block.content?.[0]?.text || '';
          if (text.startsWith('Pastor:')) {
            info.pastor = text.replace('Pastor:', '').trim();
          } else if (text.startsWith('Church:')) {
            info.church = text.replace('Church:', '').trim();
          }
        }
      });

      return info;
    } catch (e) {
      console.error('Error extracting sermon info:', e);
      return { pastor: '', church: '' };
    }
  };

  const sermonInfo = getSermonInfo(note.content);

  return (
    <article className="bg-white rounded-lg shadow-sm border border-holy-blue-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Author info section */}
        <div className="flex items-center mb-4">
          <Link to={`/profile/${note.author.id}`} className="flex items-center">
            {note.author.avatar_url ? (
              <img
                src={note.author.avatar_url}
                alt={note.author.full_name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full overflow-hidden">
                <DefaultAvatar size={40} />
              </div>
            )}
            <div className="ml-3">
              <h3 className="text-holy-blue-900 font-semibold">
                {note.author.full_name}
              </h3>
              <p className="text-holy-blue-600 text-sm">@{note.author.username}</p>
            </div>
          </Link>
          <span className="ml-auto text-sm text-holy-blue-500">
            {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Content section */}
        <Link to={`/sermon-notes/${note.id}`} className="block group">
          <h2 className="text-xl font-semibold text-holy-blue-900 group-hover:text-holy-blue-600 transition-colors mb-2">
            {note.title}
          </h2>
          {/* Sermon Info */}
          {(sermonInfo.pastor || sermonInfo.church) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-holy-blue-600 mb-3">
              {sermonInfo.pastor && (
                <span>{sermonInfo.pastor}</span>
              )}
              {sermonInfo.church && (
                <span>{sermonInfo.church}</span>
              )}
            </div>
          )}
          <p className="text-holy-blue-700 line-clamp-3">
            {getTextContent(note.content)}
          </p>
        </Link>

        {/* Actions section */}
        <div className="flex items-center gap-6 pt-4 mt-4 border-t border-holy-blue-100">
          <button
            onClick={handlePraise}
            disabled={isLoading || !user}
            className={cn(
              "group flex items-center gap-2 text-sm transition-all duration-300",
              hasPraised
                ? "text-divine-yellow-500 hover:text-divine-yellow-600"
                : "text-holy-blue-500 hover:text-holy-blue-600",
              (isLoading || !user) && "opacity-50 cursor-not-allowed"
            )}
            title={!user ? "Sign in to praise" : hasPraised ? "Remove Praise" : "Praise"}
          >
            <HelpingHand
              className={cn(
                "h-5 w-5 transition-all duration-300",
                hasPraised && "fill-divine-yellow-500",
                "group-hover:scale-110",
                isLoading && "animate-pulse"
              )}
            />
            <span>{praiseCount}</span>
          </button>

          <Link
            to={`/sermon-notes/${note.id}`}
            className="flex items-center gap-2 text-sm text-holy-blue-500 hover:text-holy-blue-600"
          >
            <MessageCircle className="h-5 w-5" />
            <span>{commentCount}</span>
          </Link>

          <ShareButton
            noteId={note.id}
            noteTitle={note.title}
            className="ml-auto"
          />
        </div>
      </div>
    </article>
  );
}