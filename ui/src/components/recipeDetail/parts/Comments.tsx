import React, { useState } from 'react';
import { CommentForm } from './CommentForm';
import { formatDistanceToNow } from 'date-fns';
import { useComments } from '../hooks/useComments';

interface Comment {
  _id: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  recipeId: string;
}

interface CommentsProps {
  comments: Comment[];
  recipeId: string;
  onCommentsChange: () => void;
}

export const Comments: React.FC<CommentsProps> = ({ comments, recipeId, onCommentsChange }) => {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const { deleteComment } = useComments();

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteComment(commentId);
      onCommentsChange();
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Failed to delete comment. Please try again.');
    }
  };

  // Always assume we're logged in as Admin
  const currentUserId = 'Admin';

  return (
    <div className="section-block comments-section">
      <h2>Comments</h2>
      
      <CommentForm recipeId={recipeId} onCommentAdded={onCommentsChange} />
      
      <ul className="comment-list">
        {comments && comments.length ? (
          comments.map((comment) => (
            <li key={comment._id} className="comment-item">
              <header>
                <div className="comment-header-main">
                  <span className="comment-author">
                    {comment.user_id || 'Admin'}
                  </span>
                  <span className="comment-date">
                    {comment.created_at && formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    {comment.updated_at !== comment.created_at && 
                      <span className="comment-edited"> (edited)</span>
                    }
                  </span>
                </div>
                {currentUserId === comment.user_id && (
                  <div className="comment-actions">
                    {editingCommentId !== comment._id && (
                      <>
                        <button 
                          onClick={() => setEditingCommentId(comment._id)}
                          className="btn btn-small"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(comment._id)}
                          className="btn btn-small btn-danger"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </header>
              
              {editingCommentId === comment._id ? (
                <CommentForm
                  recipeId={recipeId}
                  existingComment={comment}
                  onCommentAdded={onCommentsChange}
                  onCancelEdit={() => setEditingCommentId(null)}
                />
              ) : (
                <div className="comment-content">{comment.content}</div>
              )}
            </li>
          ))
        ) : (
          <li className="comment-empty">
            No comments yet. Be the first to comment!
          </li>
        )}
      </ul>
    </div>
  );
};
