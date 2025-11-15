// Auth0 utility functions for Management API
import axios from 'axios';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { SSMClient, GetParameterCommand, PutParameterCommand } from '@aws-sdk/client-ssm';

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '../../.env') });
config({ path: path.join(__dirname, '../../config/current-profile.env'), override: true });

// Cache for AWS secrets to avoid repeated calls
let secretsCache = null;

// AWS SSM client for Parameter Store
const ssmClient = new SSMClient({ 
  region: process.env.AWS_REGION || 'us-west-2' 
});

// Parameter Store configuration
const PARAMETER_NAME = process.env.AUTH0_TOKEN_PARAMETER_NAME || '/mrb/dev/auth0-token-cache';
const TOKEN_EXPIRATION_BUFFER_MS = 5 * 60 * 1000; // 5 minutes buffer before expiry

// Function to retrieve secrets from AWS Secrets Manager
async function getSecretsFromAWS() {
  if (secretsCache) {
    return secretsCache;
  }
  
  try {
    const secretName = process.env.AWS_SECRET_NAME || 'moms-recipe-secrets-dev';
    const region = process.env.AWS_REGION || 'us-west-2';
    
    console.log('🔐 Retrieving Auth0 secrets from AWS Secrets Manager...');
    
    const command = `aws secretsmanager get-secret-value --secret-id "${secretName}" --region "${region}" --query SecretString --output text`;
    const secretJson = execSync(command, { encoding: 'utf-8' }).trim();
    
    const secrets = JSON.parse(secretJson);
    console.log('✅ Auth0 secrets retrieved successfully from AWS');
    
    // Cache the secrets
    secretsCache = secrets;
    return secrets;
  } catch (error) {
    console.error('❌ Failed to retrieve Auth0 secrets from AWS:', error.message);
    throw error;
  }
}

// Function to get Auth0 configuration with fallback to environment variables
export async function getAuth0Config() {
  // Check if we have placeholder values that need AWS retrieval
  console.log('🔍 Checking Auth0 config - AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN);
  console.log('🔍 Checking Auth0 config - AUTH0_M2M_CLIENT_ID:', process.env.AUTH0_M2M_CLIENT_ID ? '[SET]' : '[MISSING]');
  console.log('🔍 Checking Auth0 config - AUTH0_M2M_CLIENT_SECRET:', process.env.AUTH0_M2M_CLIENT_SECRET ? '[SET]' : '[MISSING]');
  
  const needsAWSSecrets = !process.env.AUTH0_DOMAIN || 
                         process.env.AUTH0_DOMAIN.includes('${') ||
                         !process.env.AUTH0_M2M_CLIENT_ID ||
                         process.env.AUTH0_M2M_CLIENT_ID.includes('${') ||
                         !process.env.AUTH0_M2M_CLIENT_SECRET ||
                         process.env.AUTH0_M2M_CLIENT_SECRET.includes('${');
  
  console.log('🔍 needsAWSSecrets:', needsAWSSecrets);
  
  if (needsAWSSecrets) {
    const secrets = await getSecretsFromAWS();
    return {
      AUTH0_DOMAIN: secrets.AUTH0_DOMAIN,
      AUTH0_M2M_CLIENT_ID: secrets.AUTH0_M2M_CLIENT_ID,
      AUTH0_M2M_CLIENT_SECRET: secrets.AUTH0_M2M_CLIENT_SECRET,
      AUTH0_API_AUDIENCE: secrets.AUTH0_API_AUDIENCE || `https://${secrets.AUTH0_DOMAIN}/api/v2/`,
      AUTH0_MRB_CLIENT_ID: secrets.AUTH0_MRB_CLIENT_ID,
      AUTH0_MANAGEMENT_AUDIENCE: `https://${secrets.AUTH0_DOMAIN}/api/v2/`
    };
  }
  
  // Use environment variables if they're already resolved
  return {
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
    AUTH0_M2M_CLIENT_ID: process.env.AUTH0_M2M_CLIENT_ID,
    AUTH0_M2M_CLIENT_SECRET: process.env.AUTH0_M2M_CLIENT_SECRET,
    AUTH0_API_AUDIENCE: process.env.AUTH0_API_AUDIENCE,
    AUTH0_MRB_CLIENT_ID: process.env.AUTH0_MRB_CLIENT_ID,
    AUTH0_MANAGEMENT_AUDIENCE: `https://${process.env.AUTH0_DOMAIN}/api/v2/`
  };
}

// Token cache - stores token and expiration (Tier 1: Memory cache)
let tokenCache = {
  token: null,
  expiresAt: null
};

/**
 * Get cached token from Parameter Store (Tier 2: Shared cache)
 * @returns {Promise<{token: string, expiresAt: number}|null>}
 */
async function getTokenFromParameterStore() {
  try {
    console.log('🗄️  Checking Parameter Store for cached token...');
    
    const command = new GetParameterCommand({
      Name: PARAMETER_NAME,
      WithDecryption: false // Token is not sensitive data (expires in 24h)
    });
    
    const response = await ssmClient.send(command);
    
    if (!response.Parameter?.Value) {
      console.log('ℹ️  No cached token found in Parameter Store');
      return null;
    }
    
    // Parse token data from JSON
    let tokenData;
    try {
      tokenData = JSON.parse(response.Parameter.Value);
    } catch (parseError) {
      console.log('ℹ️  Invalid token format in Parameter Store');
      return null;
    }
    
    const { token, expiresAt } = tokenData;
    if (!token || !expiresAt) {
      console.log('ℹ️  Incomplete token data in Parameter Store');
      return null;
    }
    
    const now = Date.now();
    
    // Validate token is not expired (with buffer)
    if (expiresAt <= now + TOKEN_EXPIRATION_BUFFER_MS) {
      console.log(`⏰ Parameter Store token expired or expiring soon (${new Date(expiresAt).toISOString()})`);
      return null;
    }
    
    console.log(`✅ Retrieved valid token from Parameter Store (expires: ${new Date(expiresAt).toISOString()})`);
    return {
      token: token,
      expiresAt: expiresAt
    };
    
  } catch (error) {
    if (error.name === 'ParameterNotFound') {
      console.log('ℹ️  Parameter not found in Parameter Store (first run)');
      return null;
    }
    console.warn('⚠️  Error retrieving token from Parameter Store:', error.message);
    return null; // Fail gracefully, will fetch from Auth0
  }
}

/**
 * Save token to Parameter Store (Tier 2: Shared cache)
 * @param {string} token - The Auth0 access token
 * @param {number} expiresAt - Expiration timestamp (milliseconds)
 */
async function saveTokenToParameterStore(token, expiresAt) {
  try {
    console.log('💾 Saving token to Parameter Store...');
    
    // Store token and expiration as JSON
    const tokenData = JSON.stringify({ token, expiresAt });
    
    const command = new PutParameterCommand({
      Name: PARAMETER_NAME,
      Value: tokenData,
      Type: 'String',
      Description: `Auth0 Management API token cache`,
      Overwrite: true,
      Tier: 'Standard' // Free tier
    });
    
    await ssmClient.send(command);
    console.log(`✅ Token saved to Parameter Store (expires: ${new Date(expiresAt).toISOString()})`);
    
  } catch (error) {
    console.warn('⚠️  Error saving token to Parameter Store:', error.message);
    // Non-fatal error - token is still cached in memory
  }
}

/**
 * Fetch a fresh token from Auth0 (Tier 3: Most expensive)
 * @param {object} config - Auth0 configuration
 * @returns {Promise<{token: string, expiresAt: number}>}
 */
async function fetchNewTokenFromAuth0(config) {
  console.log('🔑 Fetching new M2M token from Auth0 API...');
  
  const url = `https://${config.AUTH0_DOMAIN}/oauth/token`;
  const body = {
    grant_type: 'client_credentials',
    client_id: config.AUTH0_M2M_CLIENT_ID,
    client_secret: config.AUTH0_M2M_CLIENT_SECRET,
    audience: config.AUTH0_MANAGEMENT_AUDIENCE
  };
  
  try {
    const response = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = response.data;
    const expiresIn = data.expires_in || 86400; // Default 24 hours in seconds
    const expiresAt = Date.now() + (expiresIn * 1000) - 60000; // Subtract 1 minute for safety
    
    console.log(`✅ New token fetched from Auth0 (expires: ${new Date(expiresAt).toISOString()})`);
    
    return {
      token: data.access_token,
      expiresAt: expiresAt
    };
    
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    throw new Error(`Failed to get Auth0 M2M token: ${error.response?.status || 'Unknown'} ${errorMsg}`);
  }
}

/**
 * Get Auth0 Management API token with three-tier caching
 * 
 * Tier 1: Memory cache (0-1ms) - Fastest, but lost on Lambda cold start
 * Tier 2: Parameter Store (50-100ms) - Shared across all Lambda containers
 * Tier 3: Auth0 API (500-1000ms) - Most expensive, only when token expired
 * 
 * @returns {Promise<string>} Auth0 Management API access token
 */
export async function getManagementToken() {
  const now = Date.now();
  
  // Tier 1: Check memory cache (fastest)
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt > now + TOKEN_EXPIRATION_BUFFER_MS) {
    console.log('⚡ Using memory-cached token (Tier 1)');
    return tokenCache.token;
  }
  
  // Tier 2: Check Parameter Store (shared across Lambda containers)
  const cachedToken = await getTokenFromParameterStore();
  if (cachedToken) {
    // Update memory cache
    tokenCache.token = cachedToken.token;
    tokenCache.expiresAt = cachedToken.expiresAt;
    console.log('🗄️  Using Parameter Store cached token (Tier 2)');
    return cachedToken.token;
  }
  
  // Tier 3: Fetch fresh token from Auth0 (most expensive)
  console.log('🌐 No valid cached token - fetching from Auth0 (Tier 3)');
  
  // Get Auth0 configuration (from AWS or environment)
  const config = await getAuth0Config();
  
  // Fetch new token
  const newToken = await fetchNewTokenFromAuth0(config);
  
  // Update memory cache
  tokenCache.token = newToken.token;
  tokenCache.expiresAt = newToken.expiresAt;
  
  // Save to Parameter Store for other Lambda containers
  await saveTokenToParameterStore(newToken.token, newToken.expiresAt);
  
  return newToken.token;
}

/**
 * Clear token cache (for testing purposes)
 * Clears memory cache but NOT Parameter Store
 */
export function clearAuth0TokenCache() {
  console.log('🧹 Clearing memory token cache');
  tokenCache.token = null;
  tokenCache.expiresAt = null;
}

export async function listAuth0Users() {
  const token = await getManagementToken();
  const config = await getAuth0Config();
  const url = `https://${config.AUTH0_DOMAIN}/api/v2/users?include_totals=true&search_engine=v3`;
  
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    throw new Error(`Failed to fetch users: ${error.response?.status || 'Unknown'} ${errorMsg}`);
  }
}

export async function getAuth0UserDetails(userId) {
  const token = await getManagementToken();
  const config = await getAuth0Config();
  const url = `https://${config.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`;
  
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    throw new Error(`Failed to fetch user details: ${error.response?.status || 'Unknown'} ${errorMsg}`);
  }
}

export async function getAuth0UserByEmail(email) {
  const token = await getManagementToken();
  const config = await getAuth0Config();
  const encodedEmail = encodeURIComponent(email);
  const url = `https://${config.AUTH0_DOMAIN}/api/v2/users-by-email?email=${encodedEmail}`;
  
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const users = response.data;
    if (!users || users.length === 0) {
      return null; // User not found
    }
    
    // Return the first user (should be only one for unique email)
    return users[0];
  } catch (error) {
    if (error.response?.status === 404) {
      return null; // User not found
    }
    const errorMsg = error.response?.data || error.message;
    throw new Error(`Failed to fetch user by email: ${error.response?.status || 'Unknown'} ${errorMsg}`);
  }
}

export async function inviteAuth0User(email, firstName, lastName, roles = []) {
  const token = await getManagementToken();
  const config = await getAuth0Config();
  
  // Step 1: Create user with random password (Auth0 requirement)
  const userUrl = `https://${config.AUTH0_DOMAIN}/api/v2/users`;
  const userData = {
    email,
    email_verified: false,
    given_name: firstName,
    family_name: lastName,
    name: `${firstName} ${lastName}`,
    connection: 'Username-Password-Authentication',
    password: generateTempPassword(),
    verify_email: false, // Don't send verification email - we'll send password reset instead
    app_metadata: {
      roles: roles
    }
  };
  
  try {
    // Create the user
    const createResponse = await axios.post(userUrl, userData, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const newUser = createResponse.data;
    
    // Step 2: Send password reset email (becomes "Set Password" for new users)
    // Use the same approach as Cruise Viewer Python code - this actually sends emails!
    const resetUrl = `https://${config.AUTH0_DOMAIN}/dbconnections/change_password`;
    const resetData = {
      client_id: process.env.REACT_APP_AUTH0_CLIENT_ID || process.env.AUTH0_MRB_CLIENT_ID,  // Use WEB client, not M2M
      email: email,
      connection: 'Username-Password-Authentication'
    };
    
    try {
      const resetResponse = await axios.post(resetUrl, resetData, {
        headers: { 
          'Content-Type': 'application/json'
          // No Authorization header needed - this is a public endpoint
        }
      });
      
      // Return user data with invite status
      return {
        ...newUser,
        inviteEmailSent: true,
        resetEmailResponse: resetResponse.data
      };
      
    } catch (emailError) {
      // User was created but email failed - return user with error info
      console.error('Failed to send invite email:', emailError.response?.data || emailError.message);
      return {
        ...newUser,
        inviteEmailSent: false,
        inviteEmailError: emailError.response?.data || emailError.message
      };
    }
    
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    throw new Error(`Failed to create user: ${error.response?.status || 'Unknown'} ${errorMsg}`);
  }
}

export async function deleteAuth0User(userId) {
  const token = await getManagementToken();
  const config = await getAuth0Config();
  const url = `https://${config.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`;
  
  try {
    const response = await axios.delete(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.status === 204;
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    throw new Error(`Failed to delete user: ${error.response?.status || 'Unknown'} ${errorMsg}`);
  }
}

// Utility function to generate temporary password
function generateTempPassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Enhanced user listing with app statistics
export async function listUsersWithStats(db) {
  try {
    // Get Auth0 users
    const auth0Response = await listAuth0Users();
    const auth0Users = auth0Response.users || [];
    
    // Get user statistics from MongoDB
    const recipesCollection = db.collection('recipes');
    const favoritesCollection = db.collection('favorites');
    const commentsCollection = db.collection('comments');
    
    // Build user stats map
    const userStatsMap = new Map();
    
    // Get favorite counts per user
    const favoriteCounts = await favoritesCollection.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]).toArray();
    
    favoriteCounts.forEach(stat => {
      if (!userStatsMap.has(stat._id)) userStatsMap.set(stat._id, {});
      userStatsMap.get(stat._id).favoriteCount = stat.count;
    });
    
    // Get comment counts per user
    const commentCounts = await commentsCollection.aggregate([
      { $group: { _id: '$user_id', count: { $sum: 1 } } }
    ]).toArray();
    
    commentCounts.forEach(stat => {
      if (!userStatsMap.has(stat._id)) userStatsMap.set(stat._id, {});
      userStatsMap.get(stat._id).commentCount = stat.count;
    });
    
    // Combine Auth0 data with app statistics
    const enrichedUsers = auth0Users.map(user => {
      const stats = userStatsMap.get(user.user_id) || {};
      
      return {
        user_id: user.user_id,
        email: user.email,
        firstName: user.given_name || '',
        lastName: user.family_name || '',
        loginCount: user.logins_count || 0,
        lastLogin: user.last_login || null,
        userImage: user.picture || null,
        favoriteCount: stats.favoriteCount || 0,
        commentCount: stats.commentCount || 0,
        emailVerified: user.email_verified || false,
        createdAt: user.created_at,
        lastUpdated: user.updated_at
      };
    });
    
    return {
      users: enrichedUsers,
      total: auth0Response.total || enrichedUsers.length
    };
    
  } catch (error) {
    console.error('Error listing users with stats:', error);
    throw error;
  }
}
