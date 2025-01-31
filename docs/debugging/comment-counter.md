# 🔍 Comment Counter Debugging Guide

## Table of Contents
1. [API Verification](#api-verification)
2. [Frontend State Management](#frontend-state-management)
3. [Backend Implementation](#backend-implementation)
4. [Testing & Validation](#testing-validation)
5. [Common Issues & Solutions](#common-issues)

## API Verification 🔌

### 1. Testing Comment Creation

```javascript
// Test comment creation endpoint
const testCommentCreation = async (noteId, content) => {
  const response = await fetch('/api/comments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ noteId, content })
  });
  
  console.log('Creation Response:', await response.json());
  return response.ok;
};
```

Expected Response:
```json
{
  "id": "comment-uuid",
  "content": "Test comment",
  "created_at": "2024-01-31T20:00:00Z",
  "author": {
    "id": "user-uuid",
    "username": "testuser"
  }
}
```

### 2. Verifying Database Updates

```sql
-- Check comment count for a specific note
SELECT COUNT(*) 
FROM comments 
WHERE sermon_note_id = :noteId;

-- Verify comment insertion
SELECT * 
FROM comments 
WHERE sermon_note_id = :noteId 
ORDER BY created_at DESC 
LIMIT 1;
```

### 3. Response Format Validation

```typescript
interface CommentResponse {
  id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    username: string;
  };
}

const validateResponse = (data: any): data is CommentResponse => {
  return (
    typeof data.id === 'string' &&
    typeof data.content === 'string' &&
    typeof data.created_at === 'string' &&
    typeof data.author?.id === 'string' &&
    typeof data.author?.username === 'string'
  );
};
```

## Frontend State Management 🔄

### 1. State Update Verification

```typescript
const verifyStateUpdate = (prevCount: number, newCount: number, action: 'add' | 'delete') => {
  const expectedCount = action === 'add' ? prevCount + 1 : Math.max(0, prevCount - 1);
  
  if (newCount !== expectedCount) {
    console.error('State update mismatch:', {
      action,
      prevCount,
      newCount,
      expectedCount
    });
    return false;
  }
  return true;
};
```

### 2. Re-render Triggers

```typescript
useEffect(() => {
  // Subscribe to comment updates
  const unsubscribe = supabase
    .channel(`comments:${noteId}`)
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'comments',
      filter: `sermon_note_id=eq.${noteId}`
    }, (payload) => {
      console.log('Comment change detected:', payload);
      syncCommentCount(noteId);
    })
    .subscribe();

  return () => {
    unsubscribe();
  };
}, [noteId]);
```

### 3. Cache Busting

```typescript
const syncCommentCount = async (noteId: string) => {
  const timestamp = Date.now();
  const response = await fetch(`/api/comments/count/${noteId}?t=${timestamp}`);
  const { count } = await response.json();
  return count;
};
```

## Backend Implementation 💾

### 1. Accurate Count Calculation

```sql
CREATE OR REPLACE FUNCTION get_comment_count(
  p_sermon_note_id UUID
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Get count directly from comments table
  SELECT COUNT(*) INTO v_count
  FROM comments
  WHERE sermon_note_id = p_sermon_note_id;
  
  RETURN COALESCE(v_count, 0);
END;
$$;
```

### 2. Error Management

```typescript
const handleCommentError = async (error: Error, context: any) => {
  // Log error details
  logger.error('CommentAction', 'Comment operation failed', error, context);
  
  // Attempt recovery
  try {
    await syncCommentCount(context.noteId);
  } catch (syncError) {
    logger.error('CommentAction', 'Recovery failed', syncError, context);
  }
  
  // Notify user
  toast.error('Failed to update comment. Please try again.');
};
```

## Testing & Validation ✅

### 1. API Testing Script

```typescript
const testCommentSystem = async (noteId: string) => {
  const results = {
    creation: false,
    deletion: false,
    counting: false
  };

  try {
    // Test creation
    const comment = await testCommentCreation(noteId, 'Test comment');
    results.creation = true;

    // Test counting
    const count = await syncCommentCount(noteId);
    results.counting = typeof count === 'number';

    // Test deletion
    if (comment.id) {
      await testCommentDeletion(comment.id);
      results.deletion = true;
    }
  } catch (error) {
    console.error('Test failed:', error);
  }

  return results;
};
```

### 2. State Validation

```typescript
const validateCommentState = (state: CommentState) => {
  const issues = [];

  // Check for negative counts
  state.commentCounts.forEach((count, noteId) => {
    if (count < 0) {
      issues.push(`Negative count for note ${noteId}: ${count}`);
    }
  });

  // Check for duplicate tracking
  const duplicates = new Set();
  state.pendingComments.forEach(id => {
    if (duplicates.has(id)) {
      issues.push(`Duplicate pending comment: ${id}`);
    }
    duplicates.add(id);
  });

  return issues;
};
```

## Common Issues & Solutions 🚨

1. **Race Conditions**
   ```typescript
   // Use optimistic updates with server validation
   const handleCommentAdd = async () => {
     const optimisticId = `temp-${Date.now()}`;
     setComments(prev => [...prev, { id: optimisticId, content }]);
     
     try {
       const result = await addComment(content);
       setComments(prev => [
         ...prev.filter(c => c.id !== optimisticId),
         result
       ]);
     } catch (error) {
       setComments(prev => prev.filter(c => c.id !== optimisticId));
       handleCommentError(error, { action: 'add' });
     }
   };
   ```

2. **Stale Cache**
   ```typescript
   // Implement cache invalidation
   const invalidateCommentCache = async (noteId: string) => {
     await queryClient.invalidateQueries(['comments', noteId]);
     await syncCommentCount(noteId);
   };
   ```

3. **Network Issues**
   ```typescript
   // Implement retry logic
   const retryOperation = async (
     operation: () => Promise<any>,
     maxRetries = 3
   ) => {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await operation();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
       }
     }
   };
   ```

## Next Steps 🚀

1. Run the API verification tests
2. Monitor state updates in Redux DevTools or React DevTools
3. Check server logs for any errors
4. Verify database consistency
5. Test edge cases (rapid comments, deletions)
6. Monitor real-time updates
7. Validate error handling

Remember to:
- Log all operations
- Validate data at each step
- Implement proper error handling
- Use optimistic updates carefully
- Keep the UI responsive
- Handle edge cases gracefully