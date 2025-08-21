import { useState } from 'react';

interface Comment {
  _id: string;
  recipeId: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface UseCommentsResult {
  addComment: (recipeId: string, content: string) => Promise<Comment>;
  updateComment: (commentId: string, content: string) => Promise<Comment>;
  deleteComment: (commentId: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export const useComments = (): UseCommentsResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => {
    // Always return "Admin" as the user ID
    return "Admin";
  };

  const addComment = async (recipeId: string, content: string): Promise<Comment> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/recipes/${recipeId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: getUserId(),
          content,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add comment: ${response.statusText}`);
      }

      const data = await response.json();
      return data as Comment;
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateComment = async (commentId: string, content: string): Promise<Comment> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: getUserId(),
          content,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update comment: ${response.statusText}`);
      }

      const data = await response.json();
      return data as Comment;
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (commentId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete comment: ${response.statusText}`);
      }

      return true;
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    addComment,
    updateComment,
    deleteComment,
    loading,
    error,
  };
};
