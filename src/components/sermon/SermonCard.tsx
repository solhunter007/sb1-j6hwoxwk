import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, BookOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DefaultAvatar } from '../profile/DefaultAvatar';
import { cn } from '../../utils/cn';

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
  onPraise: () => void;
}

export function SermonCard({ note, onPraise }: SermonCardProps) {
  const getExcerpt = (content: any): string => {
    // Extract text content from the JSON structure
    try {
      return content.content
        .map((block: any) => block.content?.[0]?.text || '')
        .join(' ')
        .slice(0, 200) + '...';
    } catch (e) {
      return '';
    }
  };

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
          <p className="text-holy-blue-700 mb-4">{getExcerpt(note.content)}</p>
        </Link>

        {note.scripture_references && note.scripture_references.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
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

        <div className="flex items-center gap-6 pt-4 border-t border-holy-blue-100">
          <button
            onClick={onPraise}
            className={cn(
              "flex items-center gap-2 text-sm transition-colors",
              note.user_has_praised
                ? "text-red-500 hover:text-red-600"
                : "text-holy-blue-500 hover:text-holy-blue-600"
            )}
          >
            <Heart
              className={cn(
                "h-5 w-5",
                note.user_has_praised && "fill-current"
              )}
            />
            <span>{note.praise_count}</span>
          </button>

          <Link
            to={`/sermon-notes/${note.id}`}
            className="flex items-center gap-2 text-sm text-holy-blue-500 hover:text-holy-blue-600"
          >
            <MessageCircle className="h-5 w-5" />
            <span>{note.comment_count}</span>
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