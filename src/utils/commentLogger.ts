import { logger } from './logger';

interface CommentLogContext {
  commentId?: string;
  noteId: string;
  userId: string;
  content?: string;
  error?: Error;
  count?: number;
  cached?: boolean;
  repaired?: boolean;
}

export const commentLogger = {
  logCommentAction: (action: 'add' | 'delete' | 'update', context: CommentLogContext) => {
    const logContext = {
      ...context,
      content: context.content 
        ? context.content.substring(0, 50) + (context.content.length > 50 ? '...' : '') 
        : undefined,
      timestamp: new Date().toISOString()
    };

    if (context.error) {
      logger.error(
        'CommentAction',
        `Failed to ${action} comment`,
        context.error,
        logContext
      );
    } else {
      logger.info(
        'CommentAction',
        `Successfully ${action}ed comment`,
        logContext
      );
    }
  },

  logCommentCount: (action: 'get' | 'sync' | 'update' | 'repair', context: CommentLogContext) => {
    const logContext = {
      ...context,
      timestamp: new Date().toISOString()
    };

    if (context.error) {
      logger.error(
        'CommentCount',
        `Failed to ${action} comment count`,
        context.error,
        logContext
      );
    } else {
      logger.info(
        'CommentCount',
        `Successfully ${action}ed comment count`,
        logContext
      );
    }
  },

  logCommentValidation: (context: CommentLogContext) => {
    const logContext = {
      ...context,
      timestamp: new Date().toISOString()
    };

    if (context.error) {
      logger.error(
        'CommentValidation',
        'Comment count validation failed',
        context.error,
        logContext
      );
    } else {
      logger.info(
        'CommentValidation',
        context.repaired 
          ? 'Comment count repaired'
          : 'Comment count validated',
        logContext
      );
    }
  }
};