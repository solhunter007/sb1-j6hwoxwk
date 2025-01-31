import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { commentLogger } from '../utils/commentLogger';

interface CommentState {
  commentCounts: Map<string, number>;
  pendingComments: Set<string>;
  initializedNotes: Set<string>;
  initializeCommentState: (noteId: string) => Promise<void>;
  syncCommentCount: (noteId: string) => Promise<void>;
  subscribeToCommentUpdates: (noteId: string) => () => void;
  clearAllComments: () => void;
  incrementCount: (noteId: string) => void;
  decrementCount: (noteId: string) => void;
}

export const useCommentStore = create<CommentState>()(
  persist(
    (set, get) => ({
      commentCounts: new Map<string, number>(),
      pendingComments: new Set<string>(),
      initializedNotes: new Set<string>(),

      clearAllComments: () => {
        set({
          commentCounts: new Map<string, number>(),
          pendingComments: new Set<string>(),
          initializedNotes: new Set<string>()
        });
      },

      incrementCount: (noteId: string) => {
        set(state => {
          const newCommentCounts = new Map(state.commentCounts);
          const currentCount = newCommentCounts.get(noteId) || 0;
          newCommentCounts.set(noteId, currentCount + 1);
          
          commentLogger.logCommentCount('update', {
            noteId,
            count: currentCount + 1
          });
          
          return {
            ...state,
            commentCounts: newCommentCounts
          };
        });
      },

      decrementCount: (noteId: string) => {
        set(state => {
          const newCommentCounts = new Map(state.commentCounts);
          const currentCount = newCommentCounts.get(noteId) || 0;
          const newCount = Math.max(0, currentCount - 1);
          newCommentCounts.set(noteId, newCount);
          
          commentLogger.logCommentCount('update', {
            noteId,
            count: newCount
          });
          
          return {
            ...state,
            commentCounts: newCommentCounts
          };
        });
      },

      subscribeToCommentUpdates: (noteId: string) => {
        const channel = supabase
          .channel(`comments:${noteId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'comments',
              filter: `sermon_note_id=eq.${noteId}`
            },
            async (payload) => {
              if (payload.eventType === 'INSERT') {
                get().incrementCount(noteId);
              } else if (payload.eventType === 'DELETE') {
                get().decrementCount(noteId);
              }
              
              // Sync with server to ensure accuracy
              await get().syncCommentCount(noteId);
            }
          )
          .subscribe();

        return () => {
          channel.unsubscribe();
        };
      },

      initializeCommentState: async (noteId: string) => {
        const state = get();
        
        if (state.initializedNotes.has(noteId)) {
          return;
        }

        try {
          logger.info('initializeCommentState', 'Initializing comment state', { noteId });

          const { data, error } = await supabase.rpc('get_comment_count_v15', {
            p_sermon_note_id: noteId
          });

          if (error) throw error;

          set(state => {
            const newCommentCounts = new Map(state.commentCounts);
            const newInitializedNotes = new Set(state.initializedNotes);

            newCommentCounts.set(noteId, data);
            newInitializedNotes.add(noteId);

            return {
              ...state,
              commentCounts: newCommentCounts,
              initializedNotes: newInitializedNotes
            };
          });

          // Subscribe to updates
          state.subscribeToCommentUpdates(noteId);

          logger.info('initializeCommentState', 'Successfully initialized comment state', {
            noteId,
            count: data
          });
        } catch (error) {
          logger.error('initializeCommentState', 'Failed to initialize comment state', error as Error, {
            noteId
          });
          throw error;
        }
      },

      syncCommentCount: async (noteId: string) => {
        try {
          const { data, error } = await supabase.rpc('get_comment_count_v15', {
            p_sermon_note_id: noteId
          });

          if (error) throw error;

          set(state => {
            const newCommentCounts = new Map(state.commentCounts);
            newCommentCounts.set(noteId, data);

            commentLogger.logCommentCount('sync', {
              noteId,
              count: data
            });

            return {
              ...state,
              commentCounts: newCommentCounts
            };
          });
        } catch (error) {
          logger.error('syncCommentCount', 'Failed to sync comment count', error as Error, {
            noteId
          });
          throw error;
        }
      }
    }),
    {
      name: 'comment-store',
      partialize: (state) => ({
        commentCounts: Array.from(state.commentCounts.entries()),
        initializedNotes: Array.from(state.initializedNotes)
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        commentCounts: new Map(persistedState.commentCounts || []),
        initializedNotes: new Set(persistedState.initializedNotes || []),
        pendingComments: new Set()
      })
    }
  )
);