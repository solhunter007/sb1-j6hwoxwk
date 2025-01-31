import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { logger } from '../utils/logger';

interface PraiseState {
  praisedNotes: Set<string>;
  praiseCounts: Map<string, number>;
  pendingToggles: Set<string>;
  initializedNotes: Set<string>;
  togglePraise: (noteId: string) => Promise<void>;
  initializePraiseState: (noteId: string) => Promise<void>;
  syncPraiseCount: (noteId: string) => Promise<void>;
  clearAllPraises: () => void;
  subscribeToNoteUpdates: (noteId: string) => () => void;
}

export const usePraiseStore = create<PraiseState>()(
  persist(
    (set, get) => ({
      praisedNotes: new Set<string>(),
      praiseCounts: new Map<string, number>(),
      pendingToggles: new Set<string>(),
      initializedNotes: new Set<string>(),

      clearAllPraises: () => {
        set({
          praisedNotes: new Set<string>(),
          praiseCounts: new Map<string, number>(),
          pendingToggles: new Set<string>(),
          initializedNotes: new Set<string>()
        });
      },

      subscribeToNoteUpdates: (noteId: string) => {
        const channel = supabase
          .channel(`praise:${noteId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'praises',
              filter: `sermon_note_id=eq.${noteId}`
            },
            async () => {
              await get().syncPraiseCount(noteId);
            }
          )
          .subscribe();

        return () => {
          channel.unsubscribe();
        };
      },

      initializePraiseState: async (noteId: string) => {
        const state = get();
        
        if (state.initializedNotes.has(noteId)) {
          return;
        }

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          logger.info('initializePraiseState', 'Initializing praise state', {
            noteId,
            userId: user.id
          });

          const { data, error } = await supabase.rpc('get_praise_state', {
            p_note_id: noteId,
            p_user_id: user.id
          });

          if (error) throw error;

          const { has_praised, praise_count } = data;

          set(state => {
            const newPraisedNotes = new Set(state.praisedNotes);
            const newPraiseCounts = new Map(state.praiseCounts);
            const newInitializedNotes = new Set(state.initializedNotes);

            if (has_praised) {
              newPraisedNotes.add(noteId);
            } else {
              newPraisedNotes.delete(noteId);
            }

            newPraiseCounts.set(noteId, praise_count);
            newInitializedNotes.add(noteId);

            return {
              ...state,
              praisedNotes: newPraisedNotes,
              praiseCounts: newPraiseCounts,
              initializedNotes: newInitializedNotes
            };
          });

          state.subscribeToNoteUpdates(noteId);

          logger.info('initializePraiseState', 'Successfully initialized praise state', {
            noteId,
            userId: user.id,
            hasPraised: has_praised,
            count: praise_count
          });
        } catch (error) {
          logger.error('initializePraiseState', 'Failed to initialize praise state', error as Error, {
            noteId
          });
          throw error;
        }
      },

      syncPraiseCount: async (noteId: string) => {
        try {
          const { data, error } = await supabase.rpc('get_praise_state', {
            p_note_id: noteId,
            p_user_id: (await supabase.auth.getUser()).data.user?.id
          });

          if (error) throw error;

          const { has_praised, praise_count } = data;

          set(state => {
            const newPraisedNotes = new Set(state.praisedNotes);
            const newPraiseCounts = new Map(state.praiseCounts);

            if (has_praised) {
              newPraisedNotes.add(noteId);
            } else {
              newPraisedNotes.delete(noteId);
            }

            newPraiseCounts.set(noteId, praise_count);

            return {
              ...state,
              praisedNotes: newPraisedNotes,
              praiseCounts: newPraiseCounts
            };
          });

          logger.info('syncPraiseCount', 'Successfully synced praise count', {
            noteId,
            count: praise_count,
            hasPraised: has_praised
          });
        } catch (error) {
          logger.error('syncPraiseCount', 'Failed to sync praise count', error as Error, {
            noteId
          });
          throw error;
        }
      },

      togglePraise: async (noteId: string) => {
        const state = get();
        
        if (state.pendingToggles.has(noteId)) {
          return;
        }

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          set(state => ({
            ...state,
            pendingToggles: new Set(state.pendingToggles).add(noteId)
          }));

          const { data, error } = await supabase.rpc('toggle_praise', {
            p_note_id: noteId,
            p_user_id: user.id
          });

          if (error) throw error;

          const { action, new_count } = data;

          set(state => {
            const newPraisedNotes = new Set(state.praisedNotes);
            const newPraiseCounts = new Map(state.praiseCounts);

            if (action === 'added') {
              newPraisedNotes.add(noteId);
            } else {
              newPraisedNotes.delete(noteId);
            }

            newPraiseCounts.set(noteId, new_count);

            return {
              ...state,
              praisedNotes: newPraisedNotes,
              praiseCounts: newPraiseCounts
            };
          });

          logger.info('togglePraise', 'Successfully toggled praise', {
            noteId,
            userId: user.id,
            action,
            newCount: new_count
          });
        } catch (error) {
          logger.error('togglePraise', 'Failed to toggle praise', error as Error, {
            noteId
          });
          
          await get().syncPraiseCount(noteId);
          throw error;
        } finally {
          set(state => ({
            ...state,
            pendingToggles: new Set([...state.pendingToggles].filter(id => id !== noteId))
          }));
        }
      },
    }),
    {
      name: 'praise-store',
      partialize: (state) => ({
        praisedNotes: Array.from(state.praisedNotes),
        praiseCounts: Array.from(state.praiseCounts.entries()),
        initializedNotes: Array.from(state.initializedNotes)
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        praisedNotes: new Set(persistedState.praisedNotes || []),
        praiseCounts: new Map(persistedState.praiseCounts || []),
        initializedNotes: new Set(persistedState.initializedNotes || []),
        pendingToggles: new Set()
      })
    }
  )
);