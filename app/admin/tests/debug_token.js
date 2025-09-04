// Debug script to decode the JWT token and see what's inside
import jwt from 'jsonwebtoken';

// Get token from environment (set this manually for testing)
const token = process.env.JWT_TOKEN || 'your_token_here';

if (token === 'your_token_here') {
  console.log('❌ Please set JWT_TOKEN environment variable');
  console.log('Usage: $env:JWT_TOKEN="your_jwt_here"; node debug_token.js');
  process.exit(1);
}

try {
  // Decode without verification to see contents
  const decoded = jwt.decode(token, { complete: true });
  
  console.log('🔍 JWT TOKEN ANALYSIS');
  console.log('=====================');
  console.log('');
  console.log('📋 HEADER:');
  console.log(JSON.stringify(decoded.header, null, 2));
  console.log('');
  console.log('📋 PAYLOAD:');
  console.log(JSON.stringify(decoded.payload, null, 2));
  console.log('');
  console.log('🎯 KEY CLAIMS:');
  console.log(`   Audience (aud): ${JSON.stringify(decoded.payload.aud)}`);
  console.log(`   Grant Type (gty): ${decoded.payload.gty || 'NOT SET'}`);
  console.log(`   Scope: ${decoded.payload.scope || 'NOT SET'}`);
  console.log(`   Permissions: ${JSON.stringify(decoded.payload.permissions) || 'NOT SET'}`);
  console.log(`   Subject (sub): ${decoded.payload.sub}`);
  console.log(`   Issuer (iss): ${decoded.payload.iss}`);
  console.log(`   Expires (exp): ${new Date(decoded.payload.exp * 1000).toISOString()}`);
  
  // Check for custom claims
  console.log('');
  console.log('🔍 CUSTOM CLAIMS:');
  const customClaims = Object.keys(decoded.payload).filter(key => 
    key.startsWith('https://') || key.includes('roles') || key.includes('permissions')
  );
  
  if (customClaims.length > 0) {
    customClaims.forEach(claim => {
      console.log(`   ${claim}: ${JSON.stringify(decoded.payload[claim])}`);
    });
  } else {
    console.log('   No custom claims found');
  }
  
} catch (error) {
  console.error('❌ Error decoding token:', error.message);
}
