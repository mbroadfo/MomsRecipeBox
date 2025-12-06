import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { getApiUrl } from '../../../config/environment';
import { getCurrentUserId } from '../../../types/global';
import { showToast, ToastType } from '../../Toast';
import { ConfirmDialog } from '../../ConfirmDialog';

interface Comment {
  _id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
}

interface CommentsProps {
  comments: Comment[];
  recipeId: string;
  onCommentsChange: (comments: Comment[]) => void;
}

export const Comments: React.FC<CommentsProps> = ({ comments, recipeId, onCommentsChange }) => {
  const { getAccessTokenSilently, user } = useAuth0();
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; commentId: string | null }>({ 
    isOpen: false, 
    commentId: null 
  });

  const currentUserId = getCurrentUserId();

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${getApiUrl()}/recipes/${recipeId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment.trim() })
      });

      if (!response.ok) throw new Error('Failed to add comment');

      const addedComment = await response.json();
      onCommentsChange([addedComment, ...comments]);
      setNewComment('');
      showToast('Comment added successfully', ToastType.Success);
    } catch (error) {
      console.error('Error adding comment:', error);
      showToast('Failed to add comment', ToastType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${getApiUrl()}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: editContent.trim() })
      });

      if (!response.ok) throw new Error('Failed to update comment');

      const updatedComment = await response.json();
      onCommentsChange(comments.map(c => 
        c._id === commentId ? updatedComment : c
      ));
      setEditingCommentId(null);
      setEditContent('');
      showToast('Comment updated successfully', ToastType.Success);
    } catch (error) {
      console.error('Error updating comment:', error);
      showToast('Failed to update comment', ToastType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setIsSubmitting(true);
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${getApiUrl()}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete comment');

      onCommentsChange(comments.filter(c => c._id !== commentId));
      showToast('Comment deleted', ToastType.Success);
      setDeleteConfirm({ isOpen: false, commentId: null });
    } catch (error) {
      console.error('Error deleting comment:', error);
      showToast('Failed to delete comment', ToastType.Error);
      setDeleteConfirm({ isOpen: false, commentId: null });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  const getUserDisplay = (userId: string) => {
    if (!userId) return 'Unknown';
    if (userId.includes('@')) return userId;
    if (userId === currentUserId && user?.email) return user.email;
    if (userId.includes('|')) {
      const parts = userId.split('|');
      return `user-${parts[1]?.substring(0, 8) || 'unknown'}`;
    }
    return userId.substring(0, 8);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="section-block">
      <h2>Comments</h2>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
        onConfirm={() => {
          if (deleteConfirm.commentId) {
            handleDeleteComment(deleteConfirm.commentId);
          }
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, commentId: null })}
      />
      
      {/* Add Comment Form */}
      <form onSubmit={handleAddComment} style={{ marginBottom: '1.5rem' }}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.9375rem',
            resize: 'vertical',
            minHeight: '80px',
            marginBottom: '0.75rem',
            fontFamily: 'inherit'
          }}
        />
        <button
          type="submit"
          disabled={!newComment.trim() || isSubmitting}
          style={{
            padding: '0.625rem 1.25rem',
            background: newComment.trim() && !isSubmitting ? '#3b82f6' : '#9ca3af',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.9375rem',
            fontWeight: 600,
            cursor: newComment.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s'
          }}
        >
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </button>
      </form>

      {/* Comments List */}
      <ul className="comment-list">
        {comments && comments.length ? (
          comments.map((comment) => (
            <li key={comment._id} className="comment-item">
              {editingCommentId === comment._id ? (
                /* Edit Mode */
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.9375rem',
                      resize: 'vertical',
                      minHeight: '80px',
                      marginBottom: '0.75rem',
                      fontFamily: 'inherit'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleUpdateComment(comment._id)}
                      disabled={!editContent.trim() || isSubmitting}
                      style={{
                        padding: '0.5rem 1rem',
                        background: editContent.trim() && !isSubmitting ? '#10b981' : '#9ca3af',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: editContent.trim() && !isSubmitting ? 'pointer' : 'not-allowed'
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={isSubmitting}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#6b7280',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div>
                  <header style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <div>
                      <strong>{getUserDisplay(comment.user_id)}</strong>
                      {' '}
                      <span style={{ opacity: 0.55, fontSize: '0.875rem' }}>
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    {comment.user_id === currentUserId && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => startEditing(comment)}
                          disabled={isSubmitting}
                          style={{
                            padding: '0.375rem 0.75rem',
                            background: '#fff',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            fontSize: '0.8125rem',
                            color: '#374151',
                            cursor: 'pointer',
                            fontWeight: 500
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, commentId: comment._id })}
                          disabled={isSubmitting}
                          style={{
                            padding: '0.375rem 0.75rem',
                            background: '#fff',
                            border: '1px solid #dc2626',
                            borderRadius: '0.375rem',
                            fontSize: '0.8125rem',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontWeight: 500
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </header>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{comment.content}</div>
                </div>
              )}
            </li>
          ))
        ) : (
          <li className="comment-empty">No comments yet.</li>
        )}
      </ul>
    </div>
  );
};
