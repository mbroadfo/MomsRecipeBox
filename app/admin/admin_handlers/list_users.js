// Admin handler for listing users with statistics
import { getDb } from '../../app.js';
import { listUsersWithStats } from '../auth0_utils.js';
import { validateLambdaAuth } from '../jwt_validator.js';

export async function listUsersHandler(event) {
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

    console.log(`🔍 Admin user ${authResult.userId} requesting user list`);

    // Get database connection and list users with stats
    const db = await getDb();
    const result = await listUsersWithStats(db);

    console.log(`📊 Returning ${result.users.length} users with statistics`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Error in listUsersHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
}
