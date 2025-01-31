import React, { useState } from 'react';
import { Share2, Copy, Facebook, Twitter, Mail, Link2, Code, X, ExternalLink, Linkedin } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';
import { shareContent, generateEmbedCode } from '../../utils/share';

interface ShareButtonProps {
  noteId: string;
  noteTitle: string;
  className?: string;
  description?: string;
  image?: string;
}

type ShareTab = 'social' | 'link' | 'embed';

export function ShareButton({ 
  noteId, 
  noteTitle, 
  className,
  description,
  image 
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ShareTab>('social');
  const [isCopying, setIsCopying] = useState(false);

  const handleShare = async (platform?: string) => {
    try {
      await shareContent({
        path: `/sermon-notes/${noteId}`,
        metadata: {
          title: noteTitle,
          description,
          image,
        },
        platform
      });

      if (platform) {
        toast.success(`Opened in ${platform}`);
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share. Please try another method.');
    }
  };

  const copyToClipboard = async (text: string, type: 'link' | 'embed') => {
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(text);
      toast.success(`${type === 'link' ? 'Link' : 'Embed code'} copied to clipboard!`);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy. Please try again.');
    } finally {
      setIsCopying(false);
    }
  };

  const embedCode = generateEmbedCode(`/sermon-notes/${noteId}`);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 text-holy-blue-500 hover:text-holy-blue-600 transition-colors",
          className
        )}
      >
        <Share2 className="h-5 w-5" />
        Share
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-holy-blue-100">
              <h2 className="text-lg font-semibold text-holy-blue-900">Share Sermon Note</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-holy-blue-500 hover:text-holy-blue-600 rounded-full hover:bg-holy-blue-50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-holy-blue-100">
              <button
                onClick={() => setActiveTab('social')}
                className={cn(
                  "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === 'social'
                    ? "text-holy-blue-600 border-b-2 border-holy-blue-500"
                    : "text-holy-blue-600/70 hover:text-holy-blue-600"
                )}
              >
                Social Media
              </button>
              <button
                onClick={() => setActiveTab('link')}
                className={cn(
                  "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === 'link'
                    ? "text-holy-blue-600 border-b-2 border-holy-blue-500"
                    : "text-holy-blue-600/70 hover:text-holy-blue-600"
                )}
              >
                Direct Link
              </button>
              <button
                onClick={() => setActiveTab('embed')}
                className={cn(
                  "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === 'embed'
                    ? "text-holy-blue-600 border-b-2 border-holy-blue-500"
                    : "text-holy-blue-600/70 hover:text-holy-blue-600"
                )}
              >
                Embed
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {activeTab === 'social' && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleShare('facebook')}
                    className="flex items-center justify-center gap-2 p-3 text-white bg-[#1877F2] rounded-lg hover:bg-[#1874E8] transition-colors"
                  >
                    <Facebook className="h-5 w-5" />
                    Facebook
                  </button>
                  <button
                    onClick={() => handleShare('twitter')}
                    className="flex items-center justify-center gap-2 p-3 text-white bg-[#1DA1F2] rounded-lg hover:bg-[#1A98E6] transition-colors"
                  >
                    <Twitter className="h-5 w-5" />
                    Twitter
                  </button>
                  <button
                    onClick={() => handleShare('linkedin')}
                    className="flex items-center justify-center gap-2 p-3 text-white bg-[#0A66C2] rounded-lg hover:bg-[#0959AB] transition-colors"
                  >
                    <Linkedin className="h-5 w-5" />
                    LinkedIn
                  </button>
                  <button
                    onClick={() => handleShare('email')}
                    className="flex items-center justify-center gap-2 p-3 text-white bg-[#EA4335] rounded-lg hover:bg-[#E03E30] transition-colors"
                  >
                    <Mail className="h-5 w-5" />
                    Email
                  </button>
                  {navigator.share && (
                    <button
                      onClick={() => handleShare()}
                      className="col-span-2 flex items-center justify-center gap-2 p-3 text-white bg-holy-blue-500 rounded-lg hover:bg-holy-blue-600 transition-colors"
                    >
                      <ExternalLink className="h-5 w-5" />
                      More Options
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'link' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={window.location.href}
                      readOnly
                      className="flex-1 px-3 py-2 border border-holy-blue-200 rounded-lg bg-holy-blue-50 text-holy-blue-900"
                    />
                    <button
                      onClick={() => copyToClipboard(window.location.href, 'link')}
                      disabled={isCopying}
                      className="flex items-center gap-2 px-4 py-2 text-white bg-holy-blue-500 rounded-lg hover:bg-holy-blue-600 transition-colors disabled:opacity-50"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                  </div>
                  <p className="text-sm text-holy-blue-600">
                    Share this link directly with others to let them view this sermon note.
                  </p>
                </div>
              )}

              {activeTab === 'embed' && (
                <div className="space-y-4">
                  <div className="relative">
                    <pre className="p-3 bg-holy-blue-50 rounded-lg text-sm text-holy-blue-900 overflow-x-auto">
                      <code>{embedCode}</code>
                    </pre>
                    <button
                      onClick={() => copyToClipboard(embedCode, 'embed')}
                      disabled={isCopying}
                      className="absolute top-2 right-2 flex items-center gap-2 px-3 py-1 text-sm text-white bg-holy-blue-500 rounded-lg hover:bg-holy-blue-600 transition-colors disabled:opacity-50"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                  </div>
                  <p className="text-sm text-holy-blue-600">
                    Use this code to embed the sermon note on your website or blog.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t border-holy-blue-100">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-holy-blue-600 hover:text-holy-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}