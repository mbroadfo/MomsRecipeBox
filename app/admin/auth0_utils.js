// Auth0 utility functions for Management API
import axios from 'axios';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '../../.env') });
config({ path: path.join(__dirname, '../../config/current-profile.env'), override: true });

// Cache for AWS secrets to avoid repeated calls
let secretsCache = null;

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
  const needsAWSSecrets = !process.env.AUTH0_DOMAIN || 
                         process.env.AUTH0_DOMAIN.includes('${') ||
                         !process.env.AUTH0_M2M_CLIENT_ID ||
                         process.env.AUTH0_M2M_CLIENT_ID.includes('${') ||
                         !process.env.AUTH0_M2M_CLIENT_SECRET ||
                         process.env.AUTH0_M2M_CLIENT_SECRET.includes('${');
  
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

// Token cache - stores token and expiration
let tokenCache = {
  token: null,
  expiresAt: null
};

export async function getManagementToken() {
  // Check if we have a valid cached token
  if (tokenCache.token && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt) {
    console.log('🔄 Using cached M2M token');
    return tokenCache.token;
  }

  console.log('🔑 Fetching new M2M token from Auth0');
  
  // Get Auth0 configuration (from AWS or environment)
  const config = await getAuth0Config();
  
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
    
    // Cache the token with 24-hour expiration (or use expires_in from response)
    const expiresIn = data.expires_in || 86400; // Default 24 hours in seconds
    tokenCache.token = data.access_token;
    tokenCache.expiresAt = Date.now() + (expiresIn * 1000) - 60000; // Subtract 1 minute for safety
    
    console.log(`✅ M2M token cached until ${new Date(tokenCache.expiresAt).toISOString()}`);
    return tokenCache.token;
    
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    throw new Error(`Failed to get Auth0 M2M token: ${error.response?.status || 'Unknown'} ${errorMsg}`);
  }
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

export async function inviteAuth0User(email, firstName, lastName, roles = []) {
  const token = await getManagementToken();
  const config = await getAuth0Config();
  const url = `https://${config.AUTH0_DOMAIN}/api/v2/users`;
  
  const userData = {
    email,
    email_verified: false,
    given_name: firstName,
    family_name: lastName,
    name: `${firstName} ${lastName}`,
    connection: 'Username-Password-Authentication', // Adjust based on your connection
    password: generateTempPassword(),
    verify_email: true,
    app_metadata: {
      roles: roles
    }
  };
  
  try {
    const response = await axios.post(url, userData, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    throw new Error(`Failed to invite user: ${error.response?.status || 'Unknown'} ${errorMsg}`);
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
