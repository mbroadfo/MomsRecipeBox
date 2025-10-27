/**
 * Test Environment Setup
 * 
 * Sets up environment variables for testing JWT authentication
 * This is a template - update with real Auth0 credentials
 */

// Auth0 Configuration (UPDATE THESE WITH REAL VALUES)
process.env.AUTH0_DOMAIN = 'momsrecipebox.us.auth0.com';
process.env.AUTH0_AUDIENCE = 'https://momsrecipebox.com/api';

// These need to be set to real values from Auth0 M2M application
// process.env.AUTH0_M2M_CLIENT_ID = 'your_real_client_id_here';
// process.env.AUTH0_M2M_CLIENT_SECRET = 'your_real_client_secret_here';

// For testing, you can use these placeholder values but they won't work
// You MUST create an Auth0 Machine-to-Machine application and get real credentials
if (!process.env.AUTH0_M2M_CLIENT_ID) {
    console.warn('⚠️  AUTH0_M2M_CLIENT_ID not set. Please configure Auth0 M2M credentials.');
    console.warn('📚 See app/tests/AUTH0_SETUP.md for setup instructions.');
}

if (!process.env.AUTH0_M2M_CLIENT_SECRET) {
    console.warn('⚠️  AUTH0_M2M_CLIENT_SECRET not set. Please configure Auth0 M2M credentials.');
    console.warn('📚 See app/tests/AUTH0_SETUP.md for setup instructions.');
}

console.log('🔧 Test environment configured');
console.log(`   Domain: ${process.env.AUTH0_DOMAIN}`);
console.log(`   Audience: ${process.env.AUTH0_AUDIENCE}`);
console.log(`   Client ID: ${process.env.AUTH0_M2M_CLIENT_ID ? 'Set' : 'Not Set'}`);
console.log(`   Client Secret: ${process.env.AUTH0_M2M_CLIENT_SECRET ? 'Set' : 'Not Set'}`);

module.exports = {
    // Export configuration for use in tests
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
    AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
    AUTH0_M2M_CLIENT_ID: process.env.AUTH0_M2M_CLIENT_ID,
    AUTH0_M2M_CLIENT_SECRET: process.env.AUTH0_M2M_CLIENT_SECRET
};