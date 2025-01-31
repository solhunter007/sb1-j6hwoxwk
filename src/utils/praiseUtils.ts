import { supabase } from '../lib/supabase';
import { logger } from './logger';

export async function checkExistingPraise(noteId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('praises')
      .select('id')
      .eq('sermon_note_id', noteId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    logger.error('checkExistingPraise', 'Failed to check existing praise', error as Error, {
      noteId,
      userId
    });
    return false;
  }
}

export async function getPraiseCount(noteId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('praises')
      .select('*', { count: 'exact', head: true })
      .eq('sermon_note_id', noteId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    logger.error('getPraiseCount', 'Failed to get praise count', error as Error, {
      noteId
    });
    return 0;
  }
}