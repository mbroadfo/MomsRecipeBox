import React, { useState } from 'react';
import { useComments } from '../hooks/useComments';

interface CommentFormProps {
  recipeId: string;
  onCommentAdded?: () => void;
  existingComment?: {
    _id: string;
    content: string;
  };
  onCancelEdit?: () => void;
}

export const CommentForm: React.FC<CommentFormProps> = ({ 
  recipeId, 
  onCommentAdded, 
  existingComment,
  onCancelEdit 
}) => {
  const [content, setContent] = useState(existingComment?.content || '');
  const [localError, setLocalError] = useState<string | null>(null);
  const { addComment, updateComment, loading: submitting, error: apiError } = useComments();

  const isEdit = !!existingComment;
  const error = localError || apiError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLocalError(null);

    try {
      if (isEdit && existingComment) {
        await updateComment(existingComment._id, content);
        if (onCancelEdit) onCancelEdit();
      } else {
        await addComment(recipeId, content);
        setContent(''); // Clear content only for new comments
      }
      
      if (onCommentAdded) onCommentAdded();
    } catch (err) {
      setLocalError((err as Error).message);
      console.error('Comment submission error:', err);
    }
  };

  // No login check needed - we assume the user is always logged in as Admin

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      {error && <div className="comment-error">{error}</div>}
      <div className="comment-form-input">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add your comment..."
          disabled={submitting}
          rows={3}
        />
      </div>
      <div className="comment-form-actions">
        {isEdit && (
          <button 
            type="button" 
            onClick={onCancelEdit}
            className="btn btn-outline"
            disabled={submitting}
          >
            Cancel
          </button>
        )}
        <button 
          type="submit" 
          disabled={!content.trim() || submitting}
          className="btn btn-primary"
        >
          {submitting ? 'Submitting...' : isEdit ? 'Update Comment' : 'Post Comment'}
        </button>
      </div>
    </form>
  );
};
