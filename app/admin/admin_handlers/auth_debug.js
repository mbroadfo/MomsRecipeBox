// Debug handler to show current user's authentication status and roles
import { validateLambdaAuth } from '../jwt_validator.js';

export async function authDebugHandler(event) {
  try {
    console.log('🔍 Auth debug handler called');
    
    // Try to validate auth without requiring admin role
    const authResult = await validateLambdaAuth(event);
    
    if (!authResult.isAuthorized) {
      return {
        statusCode: authResult.statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: authResult.error,
          details: authResult.details,
          code: 'AUTH_FAILED',
          debug: true
        })
      };
    }

    console.log(`✅ User ${authResult.userId} authentication successful`);

    // Return detailed auth information
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authenticated: true,
        userId: authResult.userId,
        role: authResult.role,
        isAdmin: authResult.isAdmin,
        audiences: authResult.user.aud,
        subject: authResult.user.sub,
        issuer: authResult.user.iss,
        tokenClaims: {
          customRoles: authResult.user['https://momsrecipebox.app/roles'] || null,
          appMetadata: authResult.user['https://momsrecipebox.app/app_metadata'] || null,
          scopes: authResult.user.scope || null,
          permissions: authResult.user.permissions || null
        },
        message: `User authenticated successfully with role: ${authResult.role}`
      })
    };

  } catch (error) {
    console.error('Error in authDebugHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        debug: true
      })
    };
  }
}