const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Create JWKS client for Auth0
const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000 // 10 minutes
});

// Get signing key from JWKS
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Generate IAM policy for API Gateway
function generatePolicy(principalId, effect, resource) {
  const authResponse = {
    principalId: principalId
  };

  if (effect && resource) {
    const policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource
        }
      ]
    };
    authResponse.policyDocument = policyDocument;
  }

  return authResponse;
}

// Main Lambda handler
exports.handler = async (event) => {
  console.log('JWT Authorizer Event:', JSON.stringify(event, null, 2));
  
  const token = event.authorizationToken;
  
  if (!token) {
    console.log('No authorization token provided');
    throw new Error('Unauthorized');
  }

  // Remove 'Bearer ' prefix if present
  const cleanToken = token.replace(/^Bearer\s+/, '');

  try {
    // Decode token to get header
    const decoded = jwt.decode(cleanToken, { complete: true });
    
    if (!decoded || !decoded.header) {
      console.log('Invalid token format');
      throw new Error('Unauthorized');
    }

    // Verify token
    const verifiedToken = await new Promise((resolve, reject) => {
      getKey(decoded.header, (err, key) => {
        if (err) {
          console.log('Error getting signing key:', err);
          return reject(err);
        }

        jwt.verify(cleanToken, key, {
          audience: process.env.AUTH0_AUDIENCE,
          issuer: `https://${process.env.AUTH0_DOMAIN}/`,
          algorithms: ['RS256']
        }, (err, payload) => {
          if (err) {
            console.log('JWT verification failed:', err);
            return reject(err);
          }
          resolve(payload);
        });
      });
    });

    console.log('JWT verified successfully for user:', verifiedToken.sub);
    
    // Return allow policy
    return generatePolicy(verifiedToken.sub, 'Allow', event.methodArn);

  } catch (error) {
    console.log('Authorization failed:', error.message);
    throw new Error('Unauthorized');
  }
};