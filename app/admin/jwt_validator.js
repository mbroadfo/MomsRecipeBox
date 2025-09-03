// Node.js JWT validator for MomsRecipeBox
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import dotenv from 'dotenv';
dotenv.config();

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE_PERMISSIONS = {
  "https://momsrecipebox-api": "*",           // General API access
  "https://momsrecipebox-admin-api": "admin"  // Admin API access
};
const JWKS_URL = `https://${AUTH0_DOMAIN}/.well-known/jwks.json`;
const ALGORITHMS = ['RS256'];

// Create JWKS client
const client = jwksClient({
  jwksUri: JWKS_URL,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000 // 10 minutes
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('❌ Error getting signing key:', err);
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export function validateJWT(token, requiredAudience = null) {
  return new Promise((resolve, reject) => {
    console.log('🔍 Validating JWT token...');
    
    jwt.verify(
      token,
      getKey,
      {
        audience: requiredAudience || Object.keys(AUTH0_AUDIENCE_PERMISSIONS),
        issuer: `https://${AUTH0_DOMAIN}/`,
        algorithms: ALGORITHMS
      },
      (err, decoded) => {
        if (err) {
          console.error('❌ JWT validation failed:', err.message);
          return reject(err);
        }

        console.log('✅ JWT decoded successfully');
        console.log('🎯 Token subject:', decoded.sub);
        console.log('🎯 Token audiences:', decoded.aud);

        try {
          // Check audience permissions
          const tokenAudiences = Array.isArray(decoded.aud) ? decoded.aud : [decoded.aud];
          
          if (!tokenAudiences || tokenAudiences.length === 0) {
            throw new Error('Missing audience claim in token');
          }

          let allowed = false;
          let userRole = 'user'; // default role

          for (const aud of tokenAudiences) {
            const requiredRole = AUTH0_AUDIENCE_PERMISSIONS[aud];
            console.log(`🔍 Checking audience: ${aud}, required role: ${requiredRole}`);
            
            if (!requiredRole) {
              continue; // Unknown audience, skip
            }

            if (requiredRole === "*") {
              // General access allowed
              allowed = true;
              break;
            } else if (requiredRole === "admin") {
              // Check if this is an M2M token (client credentials)
              if (decoded.gty === 'client-credentials') {
                console.log('🔓 Token is from client credentials grant, granting admin access');
                allowed = true;
                userRole = 'admin';
                break;
              }

              // Check user roles in custom claims
              const rolesClaimKey = `https://momsrecipebox.app/roles`;
              const rolesClaim = decoded[rolesClaimKey];
              console.log(`👥 Found roles claim: ${JSON.stringify(rolesClaim)}`);
              
              let roles = [];
              if (Array.isArray(rolesClaim)) {
                roles = rolesClaim;
              } else if (typeof rolesClaim === 'object' && rolesClaim?.role) {
                roles = Array.isArray(rolesClaim.role) ? rolesClaim.role : [rolesClaim.role];
              } else if (typeof rolesClaim === 'string') {
                roles = [rolesClaim];
              }

              console.log(`🔑 Normalized roles: ${JSON.stringify(roles)}`);
              
              if (roles.includes('admin')) {
                console.log('✅ User has admin role');
                allowed = true;
                userRole = 'admin';
                break;
              }
            }
          }

          if (!allowed) {
            throw new Error('User not authorized for any valid audience');
          }

          // Return the validated user info
          resolve({
            user: decoded,
            role: userRole,
            isAdmin: userRole === 'admin',
            userId: decoded.sub,
            audiences: tokenAudiences
          });

        } catch (authError) {
          console.error('❌ Authorization failed:', authError.message);
          reject(authError);
        }
      }
    );
  });
}

// Middleware function for Express-style apps
export function requireAuth(requiredRole = null) {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers?.authorization || req.headers?.Authorization;
      
      if (!authHeader) {
        return res.status(401).json({ 
          error: 'Missing Authorization header',
          code: 'MISSING_AUTH_HEADER'
        });
      }

      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Invalid Authorization header format. Expected: Bearer <token>',
          code: 'INVALID_AUTH_FORMAT'
        });
      }

      const token = authHeader.split(' ')[1];
      const validation = await validateJWT(token);

      // Check role requirements
      if (requiredRole === 'admin' && !validation.isAdmin) {
        return res.status(403).json({ 
          error: 'Admin privileges required',
          code: 'INSUFFICIENT_PRIVILEGES'
        });
      }

      // Attach user info to request
      req.user = validation.user;
      req.userRole = validation.role;
      req.isAdmin = validation.isAdmin;
      req.userId = validation.userId;

      next();
    } catch (error) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        details: error.message,
        code: 'AUTH_FAILED'
      });
    }
  };
}

// Lambda-style validation function
export async function validateLambdaAuth(event, requiredRole = null) {
  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    
    if (!authHeader) {
      return {
        isAuthorized: false,
        error: 'Missing Authorization header',
        statusCode: 401
      };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return {
        isAuthorized: false,
        error: 'Invalid Authorization header format',
        statusCode: 401
      };
    }

    const token = authHeader.split(' ')[1];
    const validation = await validateJWT(token);

    // Check role requirements
    if (requiredRole === 'admin' && !validation.isAdmin) {
      return {
        isAuthorized: false,
        error: 'Admin privileges required',
        statusCode: 403
      };
    }

    return {
      isAuthorized: true,
      user: validation.user,
      role: validation.role,
      isAdmin: validation.isAdmin,
      userId: validation.userId
    };

  } catch (error) {
    return {
      isAuthorized: false,
      error: 'Authentication failed',
      details: error.message,
      statusCode: 401
    };
  }
}
