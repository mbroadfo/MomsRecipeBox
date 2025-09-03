// Admin handler for deleting users
import { deleteAuth0User } from '../auth0_utils.js';
import { validateLambdaAuth } from '../jwt_validator.js';
import { getDb } from '../../app.js';

export async function deleteUserHandler(event) {
  try {
    // Validate admin authentication
    const authResult = await validateLambdaAuth(event, 'admin');
    
    if (!authResult.isAuthorized) {
      return {
        statusCode: authResult.statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: authResult.error,
          details: authResult.details,
          code: 'AUTH_FAILED'
        })
      };
    }

    // Get user ID from path parameters
    const userId = event.pathParameters?.id;
    if (!userId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing user ID in path' })
      };
    }

    // Prevent admin from deleting themselves (if it's a user token, not M2M)
    if (authResult.userId === userId && authResult.user.gty !== 'client-credentials') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Cannot delete your own account' })
      };
    }

    console.log(`🔍 Admin user ${authResult.userId} attempting to delete user: ${userId}`);

    // Delete user from Auth0
    const deleted = await deleteAuth0User(userId);
    
    if (deleted) {
      // Optional: Clean up user data in MongoDB
      const db = await getDb();
      
      // Delete user's recipes, favorites, comments, etc.
      await Promise.all([
        db.collection('recipes').deleteMany({ owner_id: userId }),
        db.collection('favorites').deleteMany({ userId: userId }),
        db.collection('comments').deleteMany({ user_id: userId }),
        db.collection('shopping_lists').deleteMany({ user_id: userId })
      ]);
      
      console.log(`🗑️ Deleted user ${userId} and associated data from MongoDB`);
    }

    console.log(`✅ Successfully deleted user: ${userId}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        message: 'User deleted successfully',
        deletedUserId: userId
      })
    };

  } catch (error) {
    console.error('Error in deleteUserHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to delete user', details: error.message })
    };
  }
}
