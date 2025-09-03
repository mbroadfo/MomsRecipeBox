// Auth0 utility functions for Management API
import axios from 'axios';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '../../.env') });

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_M2M_CLIENT_ID = process.env.AUTH0_M2M_CLIENT_ID;
const AUTH0_M2M_CLIENT_SECRET = process.env.AUTH0_M2M_CLIENT_SECRET;
const AUTH0_MANAGEMENT_AUDIENCE = `https://${AUTH0_DOMAIN}/api/v2/`;

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
  const url = `https://${AUTH0_DOMAIN}/oauth/token`;
  const body = {
    grant_type: 'client_credentials',
    client_id: AUTH0_M2M_CLIENT_ID,
    client_secret: AUTH0_M2M_CLIENT_SECRET,
    audience: AUTH0_MANAGEMENT_AUDIENCE
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
  const url = `https://${AUTH0_DOMAIN}/api/v2/users?include_totals=true&search_engine=v3`;
  
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
  const url = `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`;
  
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
  const url = `https://${AUTH0_DOMAIN}/api/v2/users`;
  
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
  const url = `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`;
  
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
