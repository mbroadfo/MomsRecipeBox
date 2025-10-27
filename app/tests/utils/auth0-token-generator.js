/**
 * Auth0 JWT Token Generator for Testing
 * 
 * This utility generates JWT tokens using Auth0's Machine-to-Machine (M2M) client
 * credentials from AWS Secrets Manager for API testing purposes.
 */

import axios from 'axios';
import { execSync } from 'child_process';

// Cache for AWS secrets to avoid repeated calls
let secretsCache = null;

class Auth0TokenGenerator {
    constructor() {
        // Cache token and expiry
        this.cachedToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Retrieve Auth0 credentials from AWS Secrets Manager
     */
    async getAuth0Config() {
        if (secretsCache) {
            return secretsCache;
        }

        try {
            const secretName = process.env.AWS_SECRET_NAME || 'moms-recipe-secrets-dev';
            const region = process.env.AWS_REGION || 'us-west-2';
            
            console.log('🔐 Retrieving Auth0 credentials from AWS Secrets Manager...');
            
            const command = `aws secretsmanager get-secret-value --secret-id "${secretName}" --region "${region}" --query SecretString --output text`;
            const secretJson = execSync(command, { encoding: 'utf-8' }).trim();
            
            const secrets = JSON.parse(secretJson);
            console.log('✅ Auth0 credentials retrieved successfully from AWS');
            
            // Cache the secrets
            secretsCache = secrets;
            return secrets;
        } catch (error) {
            console.error('❌ Failed to retrieve Auth0 credentials from AWS:', error.message);
            throw error;
        }
    }

    /**
     * Get a valid JWT token, using cache if available
     */
    async getToken() {
        // Check if we have a valid cached token
        if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            console.log('Using cached Auth0 token');
            return this.cachedToken;
        }

        // Generate new token
        console.log('Generating new Auth0 token...');
        const token = await this.generateToken();
        
        // Cache the token (expires 5 minutes before actual expiry for safety)
        this.cachedToken = token.access_token;
        this.tokenExpiry = Date.now() + ((token.expires_in - 300) * 1000);
        
        console.log(`Token generated successfully. Expires in ${token.expires_in} seconds`);
        return this.cachedToken;
    }

    /**
     * Generate a new JWT token using Auth0 M2M client credentials from AWS Secrets Manager
     */
    async generateToken() {
        const config = await this.getAuth0Config();
        
        if (!config.AUTH0_M2M_CLIENT_ID || !config.AUTH0_M2M_CLIENT_SECRET) {
            throw new Error('Auth0 M2M credentials not found in AWS Secrets Manager. Please ensure AUTH0_M2M_CLIENT_ID and AUTH0_M2M_CLIENT_SECRET are stored in the secrets.');
        }

        const tokenUrl = `https://${config.AUTH0_DOMAIN}/oauth/token`;
        
        // Use the audience from AWS secrets
        const data = {
            client_id: config.AUTH0_M2M_CLIENT_ID,
            client_secret: config.AUTH0_M2M_CLIENT_SECRET,
            audience: config.AUTH0_API_AUDIENCE,
            grant_type: 'client_credentials'
        };

        try {
            const response = await axios.post(tokenUrl, data, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.data.access_token) {
                throw new Error('No access token in response from Auth0');
            }

            return response.data;
        } catch (error) {
            if (error.response) {
                console.error('Auth0 token generation failed:', error.response.data);
                throw new Error(`Auth0 API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            } else {
                console.error('Token generation request failed:', error.message);
                throw new Error(`Token generation failed: ${error.message}`);
            }
        }
    }

    /**
     * Get a bearer token formatted for Authorization header
     */
    async getBearerToken() {
        const token = await this.getToken();
        return `Bearer ${token}`;
    }

    /**
     * Clear cached token (force regeneration on next request)
     */
    clearCache() {
        this.cachedToken = null;
        this.tokenExpiry = null;
        console.log('Auth0 token cache cleared');
    }

    /**
     * Validate that Auth0 configuration is available from AWS Secrets Manager
     */
    async validateConfiguration() {
        try {
            const config = await this.getAuth0Config();
            const missing = [];
            
            if (!config.AUTH0_M2M_CLIENT_ID) missing.push('AUTH0_M2M_CLIENT_ID');
            if (!config.AUTH0_M2M_CLIENT_SECRET) missing.push('AUTH0_M2M_CLIENT_SECRET');
            if (!config.AUTH0_DOMAIN) missing.push('AUTH0_DOMAIN');

            if (missing.length > 0) {
                throw new Error(`Missing Auth0 configuration in AWS Secrets Manager: ${missing.join(', ')}`);
            }

            console.log('Auth0 configuration validated successfully');
            console.log(`Domain: ${config.AUTH0_DOMAIN}`);
            console.log(`Audience: ${config.AUTH0_API_AUDIENCE || 'https://momsrecipebox.com/api'}`);
            console.log(`Client ID: ${config.AUTH0_M2M_CLIENT_ID.substring(0, 8)}...`);
        } catch (error) {
            console.error('Auth0 configuration validation failed:', error.message);
            throw error;
        }
    }
}

// Export singleton instance
const tokenGenerator = new Auth0TokenGenerator();

export {
    Auth0TokenGenerator,
    tokenGenerator
};

// Convenience functions
export const getToken = () => tokenGenerator.getToken();
export const getBearerToken = () => tokenGenerator.getBearerToken();
export const clearCache = () => tokenGenerator.clearCache();
export const validateConfig = () => tokenGenerator.validateConfiguration();