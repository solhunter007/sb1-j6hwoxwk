import React, { useState, useCallback } from 'react';
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
  variant?: 'default' | 'compact';
}

export function ShareButton({ 
  noteId, 
  noteTitle, 
  className,
  description,
  image,
  variant = 'default'
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'social' | 'link' | 'embed'>('social');
  const [isCopying, setIsCopying] = useState(false);

  // Memoize share URL to prevent unnecessary recalculations
  const shareUrl = React.useMemo(() => {
    const url = new URL(`/sermon-notes/${noteId}`, window.location.origin);
    return url.toString();
  }, [noteId]);

  const handleShare = useCallback(async (platform?: string) => {
    try {
      const shareData = {
        path: `/sermon-notes/${noteId}`,
        metadata: {
          title: noteTitle,
          description: description || `Check out this sermon note: ${noteTitle}`,
          image,
          url: shareUrl
        },
        platform
      };

      await shareContent(shareData);

      if (platform) {
        toast.success(`Opened in ${platform}`);
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Error sharing:', error);
      
      // More specific error messages based on the error type
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          toast.error('Sharing was blocked. Please try another method.');
        } else if (error.name === 'AbortError') {
          // User cancelled - no need for error message
          return;
        } else {
          toast.error('Failed to share. Please try another method.');
        }
      }
    }
  }, [noteId, noteTitle, description, image, shareUrl]);

  const copyToClipboard = useCallback(async (text: string, type: 'link' | 'embed') => {
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(text);
      toast.success(`${type === 'link' ? 'Link' : 'Embed code'} copied to clipboard!`);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      
      // Fallback for browsers that don't support clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      
      try {
        document.execCommand('copy');
        toast.success(`${type === 'link' ? 'Link' : 'Embed code'} copied to clipboard!`);
      } catch (fallbackError) {
        toast.error('Failed to copy. Please try selecting and copying manually.');
      }
      
      document.body.removeChild(textarea);
    } finally {
      setIsCopying(false);
    }
  }, []);

  const embedCode = React.useMemo(() => 
    generateEmbedCode(`/sermon-notes/${noteId}`), [noteId]);

  // Handle escape key to close modal
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 text-holy-blue-500 hover:text-holy-blue-600 transition-colors",
          variant === 'compact' && "p-2 rounded-full hover:bg-holy-blue-50",
          className
        )}
        aria-label="Share sermon note"
        aria-haspopup="dialog"
      >
        <Share2 className="h-5 w-5" />
        {variant === 'default' && <span>Share</span>}
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-dialog-title"
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-md animate-in fade-in slide-in-from-bottom-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-holy-blue-100">
              <h2 id="share-dialog-title" className="text-lg font-semibold text-holy-blue-900">
                Share Sermon Note
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-holy-blue-500 hover:text-holy-blue-600 rounded-full hover:bg-holy-blue-50 transition-colors"
                aria-label="Close share dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-holy-blue-100" role="tablist">
              {(['social', 'link', 'embed'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                    activeTab === tab
                      ? "text-holy-blue-600 border-b-2 border-holy-blue-500"
                      : "text-holy-blue-600/70 hover:text-holy-blue-600"
                  )}
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-controls={`${tab}-panel`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-4">
              {activeTab === 'social' && (
                <div 
                  className="grid grid-cols-2 gap-4"
                  role="tabpanel"
                  id="social-panel"
                >
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
                <div 
                  className="space-y-4"
                  role="tabpanel"
                  id="link-panel"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 px-3 py-2 border border-holy-blue-200 rounded-lg bg-holy-blue-50 text-holy-blue-900"
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <button
                      onClick={() => copyToClipboard(shareUrl, 'link')}
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
                <div 
                  className="space-y-4"
                  role="tabpanel"
                  id="embed-panel"
                >
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
          </div>
        </div>
      )}
    </>
  );
}