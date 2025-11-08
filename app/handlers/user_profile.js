#!/usr/bin/env node

/**
 * User Profile Management API Handler
 * 
 * Handles user profile operations:
 * - Check if user profile exists
 * - Create new user profile
 * - Update existing user profile
 * - Get user profile information
 */

import { MongoClient, ObjectId } from 'mongodb';
import { getSecret } from '../utils/secrets_manager.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('user_profile');

/**
 * Connect to MongoDB Atlas
 */
async function connectToDatabase() {
  const mongoUri = await getSecret('MONGODB_ATLAS_URI');
  if (!mongoUri) {
    throw new Error('Failed to retrieve MongoDB Atlas URI from AWS Secrets Manager');
  }
  
  const client = new MongoClient(mongoUri);
  await client.connect();
  return { client, db: client.db('moms_recipe_box_dev') };
}

/**
 * Check if user profile exists and return profile status
 */
async function checkUserProfile(event) {
  let client;
  
  try {
    logger.info('Checking user profile', {}, event);
    const { client: dbClient, db } = await connectToDatabase();
    client = dbClient;
    
    // Extract user ID from JWT token (passed by API Gateway)
    const auth0UserId = event.requestContext?.authorizer?.principalId;
    logger.info('Extracted user ID from JWT', { auth0UserId }, event);
    
    if (!auth0UserId) {
      logger.warn('No user ID found in JWT token', {}, event);
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }
    
    // Check if user profile exists
    const userProfile = await db.collection('users').findOne({ auth0_id: auth0UserId });
    logger.info('User profile lookup result', { 
      exists: !!userProfile,
      profile_complete: userProfile?.profile_complete 
    }, event);
    
    const response = {
      exists: !!userProfile,
      profileComplete: userProfile?.profile_complete || false,
      needsSetup: !userProfile || !userProfile.profile_complete,
      user: userProfile ? {
        id: userProfile._id,
        auth0_id: userProfile.auth0_id,
        email: userProfile.email,
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
        phone: userProfile.phone,
        profile_image: userProfile.profile_image,
        preferences: userProfile.preferences,
        created_at: userProfile.created_at,
        updated_at: userProfile.updated_at
      } : null
    };
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify(response)
    };
    
  } catch (error) {
    logger.error('Error checking user profile', error, event);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Create or update user profile
 */
async function saveUserProfile(event) {
  let client;
  
  try {
    logger.info('Saving user profile', {}, event);
    const { client: dbClient, db } = await connectToDatabase();
    client = dbClient;
    
    // Extract user ID from JWT token
    const auth0UserId = event.requestContext?.authorizer?.principalId;
    const userEmail = event.requestContext?.authorizer?.claims?.email;
    logger.info('Profile save request', { 
      auth0UserId,
      hasRequestBody: !!event.body 
    }, event);
    
    if (!auth0UserId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }
    
    // Parse request body
    const profileData = JSON.parse(event.body || '{}');
    logger.info('Parsed profile data', { 
      email: profileData.email,
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      phone: profileData.phone,
      hasPreferences: !!profileData.preferences
    }, event);
    
    // Validate required fields (none are actually required, but validate format)
    const errors = [];
    if (profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.push('Invalid email format');
    }
    if (profileData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(profileData.phone.replace(/\s|-/g, ''))) {
      errors.push('Invalid phone number format');
    }
    
    if (errors.length > 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({ error: 'Validation failed', details: errors })
      };
    }
    
    // Prepare user document
    const now = new Date();
    const userDoc = {
      auth0_id: auth0UserId,
      email: profileData.email || userEmail || '',
      first_name: profileData.first_name || '',
      last_name: profileData.last_name || '',
      phone: profileData.phone || '',
      profile_image: profileData.profile_image || '',
      profile_complete: true, // Mark as complete when they save
      preferences: {
        visibility_default: profileData.preferences?.visibility_default || 'family',
        email_notifications: profileData.preferences?.email_notifications !== false,
        recipe_sharing: profileData.preferences?.recipe_sharing !== false,
        two_factor_enabled: !!profileData.phone // Enable 2FA if phone provided
      },
      updated_at: now
    };
    
    // Upsert user document
    const result = await db.collection('users').updateOne(
      { auth0_id: auth0UserId },
      { 
        $set: userDoc,
        $setOnInsert: { created_at: now }
      },
      { upsert: true }
    );
    
    logger.info('Profile save result', {
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    }, event);
    
    // Get the updated/created user profile
    const savedProfile = await db.collection('users').findOne({ auth0_id: auth0UserId });
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        created: result.upsertedCount > 0,
        updated: result.modifiedCount > 0,
        user: {
          id: savedProfile._id,
          auth0_id: savedProfile.auth0_id,
          email: savedProfile.email,
          first_name: savedProfile.first_name,
          last_name: savedProfile.last_name,
          phone: savedProfile.phone,
          profile_image: savedProfile.profile_image,
          profile_complete: savedProfile.profile_complete,
          preferences: savedProfile.preferences,
          created_at: savedProfile.created_at,
          updated_at: savedProfile.updated_at
        }
      })
    };
    
  } catch (error) {
    logger.error('Error saving user profile', error, event);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Main Lambda handler
 */
export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: ''
    };
  }
  
  try {
    const path = event.path || event.rawPath || '';
    const method = event.httpMethod || event.requestContext?.http?.method || '';
    
    // Route to appropriate handler
    if (path === '/user/profile' && method === 'GET') {
      return await checkUserProfile(event);
    } else if (path === '/user/profile' && method === 'POST') {
      return await saveUserProfile(event);
    } else if (path === '/user/profile' && method === 'PUT') {
      return await saveUserProfile(event);
    } else {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({ error: 'Endpoint not found' })
      };
    }
    
  } catch (error) {
    logger.error('Unhandled error in user profile handler', error, event);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}