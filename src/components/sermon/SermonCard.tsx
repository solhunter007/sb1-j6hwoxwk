import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Share2, HelpingHand } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DefaultAvatar } from '../profile/DefaultAvatar';
import { cn } from '../../utils/cn';

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

interface SermonCardProps {
  note: SermonNote;
  onPraise: () => void;
}

export function SermonCard({ note, onPraise }: SermonCardProps) {
  const getExcerpt = (content: any): { mainContent: string; metadata: { pastor?: string; church?: string } } => {
    try {
      let mainContent = '';
      const metadata: { pastor?: string; church?: string } = {};

      for (const block of content.content) {
        if (block.type === 'paragraph' && block.content) {
          const text = block.content[0]?.text || '';
          if (text.startsWith('Pastor:')) {
            metadata.pastor = text.replace('Pastor:', '').trim();
          } else if (text.startsWith('Church:')) {
            metadata.church = text.replace('Church:', '').trim();
          } else {
            mainContent += text + ' ';
          }
        }
        // Stop once we have enough text for the main content
        if (mainContent.length > 150) break;
      }

      return {
        mainContent: mainContent.trim().slice(0, 150) + (mainContent.length > 150 ? '...' : ''),
        metadata
      };
    } catch (e) {
      return { mainContent: '', metadata: {} };
    }
  };

  const { mainContent, metadata } = getExcerpt(note.content);

  // Ensure counts are numbers
  const praiseCount = typeof note.praise_count === 'number' ? note.praise_count : 0;
  const commentCount = typeof note.comment_count === 'number' ? note.comment_count : 0;

  return (
    <article className="bg-white rounded-lg shadow-sm border border-holy-blue-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
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

        <Link to={`/sermon-notes/${note.id}`} className="block group">
          <h2 className="text-xl font-semibold text-holy-blue-900 group-hover:text-holy-blue-600 transition-colors mb-2">
            {note.title}
          </h2>
          {(metadata.pastor || metadata.church) && (
            <p className="text-sm text-holy-blue-600/80 mb-3">
              {metadata.pastor && <span>Pastor {metadata.pastor}</span>}
              {metadata.pastor && metadata.church && <span> • </span>}
              {metadata.church && <span>{metadata.church}</span>}
            </p>
          )}
          <p className="text-holy-blue-700 line-clamp-3">
            {mainContent}
          </p>
        </Link>

        <div className="flex items-center gap-6 pt-4 mt-4 border-t border-holy-blue-100">
          <button
            onClick={onPraise}
            className={cn(
              "flex items-center gap-2 text-sm transition-colors",
              note.user_has_praised
                ? "text-divine-yellow-500 hover:text-divine-yellow-600"
                : "text-holy-blue-500 hover:text-holy-blue-600"
            )}
            title={note.user_has_praised ? "Remove Praise" : "Praise"}
          >
            <HelpingHand
              className={cn(
                "h-5 w-5",
                note.user_has_praised && "fill-divine-yellow-500"
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

          <button className="flex items-center gap-2 text-sm text-holy-blue-500 hover:text-holy-blue-600 ml-auto">
            <Share2 className="h-5 w-5" />
            Share
          </button>
        </div>
      </div>
    </article>
  );
}