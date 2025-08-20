/**
 * Comment Schema for Standalone Collection
 * 
 * This schema represents the structure of documents in the comments collection.
 * Comments are stored as separate documents in MongoDB instead of being embedded
 * in recipe documents.
 */

import { ObjectId } from 'mongodb';

/**
 * @typedef {Object} Comment
 * @property {ObjectId} _id - Unique identifier for the comment
 * @property {ObjectId} recipeId - Reference to the recipe this comment belongs to
 * @property {String} user_id - ID of the user who created the comment
 * @property {String} content - The text content of the comment
 * @property {Date} created_at - Timestamp when the comment was created
 * @property {Date} [updated_at] - Timestamp when the comment was last updated (if applicable)
 * @property {Boolean} [deleted] - Flag to indicate if comment has been soft-deleted
 */

/**
 * Validates a comment object against the schema
 * 
 * @param {Object} comment - The comment object to validate
 * @returns {Object} - Result with valid flag and any errors
 */
export function validateComment(comment) {
  const errors = [];
  
  // Check required fields
  if (!comment.recipeId) {
    errors.push('recipeId is required');
  } else if (!(comment.recipeId instanceof ObjectId)) {
    errors.push('recipeId must be an ObjectId');
  }
  
  if (!comment.user_id) {
    errors.push('user_id is required');
  } else if (typeof comment.user_id !== 'string') {
    errors.push('user_id must be a string');
  }
  
  if (!comment.content) {
    errors.push('content is required');
  } else if (typeof comment.content !== 'string') {
    errors.push('content must be a string');
  } else if (comment.content.trim().length === 0) {
    errors.push('content cannot be empty');
  }
  
  if (!comment.created_at) {
    errors.push('created_at is required');
  } else if (!(comment.created_at instanceof Date)) {
    errors.push('created_at must be a Date object');
  }
  
  if (comment.updated_at && !(comment.updated_at instanceof Date)) {
    errors.push('updated_at must be a Date object');
  }
  
  if (comment.deleted !== undefined && typeof comment.deleted !== 'boolean') {
    errors.push('deleted must be a boolean');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Example Comment Document:
 * {
 *   _id: ObjectId("5f8d0f3e1c9d440000d1f3f5"),
 *   recipeId: ObjectId("5f8d0f3e1c9d440000d1f3f4"),
 *   user_id: "auth0|123456789",
 *   content: "This recipe looks delicious!",
 *   created_at: ISODate("2025-08-19T10:30:00.000Z"),
 *   updated_at: ISODate("2025-08-19T11:15:00.000Z")
 * }
 */

/**
 * Indexes to create:
 * 1. recipeId - For efficient retrieval of all comments for a specific recipe
 * 2. user_id - For efficient retrieval of all comments by a specific user
 * 3. created_at - For sorting by date
 */

/**
 * Example MongoDB commands to create indexes:
 * 
 * db.comments.createIndex({ recipeId: 1 });
 * db.comments.createIndex({ user_id: 1 });
 * db.comments.createIndex({ created_at: -1 });
 */
