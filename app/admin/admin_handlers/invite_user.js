// Admin handler for inviting users
import { inviteAuth0User } from '../auth0_utils.js';
import { validateLambdaAuth } from '../jwt_validator.js';

export async function inviteUserHandler(event) {
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

    console.log(`🔍 Admin user ${authResult.userId} inviting new user`);

    // Parse request body
    let requestBody;
    try {
      requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (err) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { email, firstName, lastName, roles = [] } = requestBody;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields: email, firstName, lastName' })
      };
    }

    // Invite the user
    const newUser = await inviteAuth0User(email, firstName, lastName, roles);

    console.log(`✅ Successfully invited user: ${email} (${newUser.user_id})`);

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: `User ${email} invited successfully`,
        user: {
          user_id: newUser.user_id,
          email: newUser.email,
          firstName: newUser.given_name,
          lastName: newUser.family_name,
          emailVerified: newUser.email_verified
        }
      })
    };

  } catch (error) {
    console.error('Error in inviteUserHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to invite user', details: error.message })
    };
  }
}
