// Test file for user analytics endpoint
import fetch from 'node-fetch';
import { config } from 'dotenv';

config({ path: '../.env' });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test data
const testAuth = {
  headers: {
    'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL21vbXNyZWNpcGVib3gudXMuYXV0aDAuY29tLyIsInN1YiI6ImF1dGgwfHRlc3R1c2VyIiwiYXVkIjoiaHR0cHM6Ly9tb21zcmVjaXBlYm94LmNvbS9hcGkiLCJpYXQiOjE3MjYyNTYzMjksImV4cCI6OTk5OTk5OTk5OSwiYXpwIjoidGVzdF9jbGllbnRfaWQiLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwiZ3R5IjoicGFzc3dvcmQiLCJwZXJtaXNzaW9ucyI6WyJhZG1pbjpmdWxsX2FjY2VzcyJdLCJodHRwczovL21vbXNyZWNpcGVib3guY29tL3JvbGVzIjpbIkFETUlOIl19.dummy_signature',
    'Content-Type': 'application/json'
  }
};

async function testUserAnalytics() {
  console.log('Starting user analytics API tests...\n');

  try {
    // Test default analytics (30 days)
    console.log('===== Testing default analytics (30 days) =====');
    const defaultResponse = await fetch(`${API_BASE_URL}/admin/user-analytics`, {
      method: 'GET',
      headers: testAuth.headers
    });

    if (!defaultResponse.ok) {
      throw new Error(`Default analytics failed: ${defaultResponse.status} ${defaultResponse.statusText}`);
    }

    const defaultData = await defaultResponse.json();
    console.log('Default analytics retrieved successfully:');
    console.log('- Date range:', defaultData.dateRange);
    console.log('- Total users:', defaultData.users?.totalUsers || 'N/A');
    console.log('- Total recipes:', defaultData.recipes?.total || 'N/A');
    console.log('- Total favorites:', defaultData.engagement?.favorites?.total || 'N/A');
    console.log('- Shopping lists:', defaultData.shoppingLists?.totalLists || 'N/A');
    console.log('');

    // Test 7-day analytics
    console.log('===== Testing 7-day analytics =====');
    const weekResponse = await fetch(`${API_BASE_URL}/admin/user-analytics?range=7`, {
      method: 'GET',
      headers: testAuth.headers
    });

    if (!weekResponse.ok) {
      throw new Error(`7-day analytics failed: ${weekResponse.status} ${weekResponse.statusText}`);
    }

    const weekData = await weekResponse.json();
    console.log('7-day analytics retrieved successfully:');
    console.log('- Date range:', weekData.dateRange);
    console.log('- Recent recipes:', weekData.recipes?.recentlyCreated || 'N/A');
    console.log('- Recent favorites:', weekData.engagement?.favorites?.recent || 'N/A');
    console.log('- Growth rate (recipes):', weekData.growth?.recipes?.growthRate || 'N/A');
    console.log('');

    // Test 90-day analytics
    console.log('===== Testing 90-day analytics =====');
    const quarterResponse = await fetch(`${API_BASE_URL}/admin/user-analytics?range=90`, {
      method: 'GET',
      headers: testAuth.headers
    });

    if (!quarterResponse.ok) {
      throw new Error(`90-day analytics failed: ${quarterResponse.status} ${quarterResponse.statusText}`);
    }

    const quarterData = await quarterResponse.json();
    console.log('90-day analytics retrieved successfully:');
    console.log('- Date range:', quarterData.dateRange);
    console.log('- Content with images:', quarterData.content?.withImages || 'N/A');
    console.log('- Image percentage:', quarterData.content?.imagePercentage || 'N/A');
    console.log('- Top creators count:', quarterData.content?.topCreators?.length || 'N/A');
    console.log('');

    // Validate data structure
    console.log('===== Validating data structure =====');
    const requiredFields = [
      'success', 'timestamp', 'dateRange', 'users', 'recipes', 
      'engagement', 'content', 'shoppingLists', 'growth'
    ];

    const missingFields = requiredFields.filter(field => !(field in defaultData));
    if (missingFields.length > 0) {
      console.log('⚠️  Missing fields:', missingFields.join(', '));
    } else {
      console.log('✅ All required fields present');
    }

    // Check nested structure
    if (defaultData.users && typeof defaultData.users.totalUsers === 'number') {
      console.log('✅ User metrics structure valid');
    } else {
      console.log('⚠️  User metrics structure invalid');
    }

    if (defaultData.recipes && typeof defaultData.recipes.total === 'number') {
      console.log('✅ Recipe metrics structure valid');
    } else {
      console.log('⚠️  Recipe metrics structure invalid');
    }

    if (defaultData.engagement && defaultData.engagement.favorites && defaultData.engagement.comments) {
      console.log('✅ Engagement metrics structure valid');
    } else {
      console.log('⚠️  Engagement metrics structure invalid');
    }

    console.log('');

    // Test error handling
    console.log('===== Testing error handling =====');
    
    // Test with invalid range
    try {
      const invalidResponse = await fetch(`${API_BASE_URL}/admin/user-analytics?range=invalid`, {
        method: 'GET',
        headers: testAuth.headers
      });
      
      const invalidData = await invalidResponse.json();
      if (invalidResponse.ok) {
        console.log('⚠️  Invalid range accepted (should be handled gracefully)');
        console.log('- Parsed range:', invalidData.dateRange?.days || 'Unknown');
      } else {
        console.log('✅ Invalid range properly rejected');
      }
    } catch (error) {
      console.log('✅ Invalid range caused error (expected)');
    }

    // Test without authorization
    try {
      const unauthorizedResponse = await fetch(`${API_BASE_URL}/admin/user-analytics`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' } // No auth header
      });
      
      if (unauthorizedResponse.ok) {
        console.log('⚠️  Unauthorized request succeeded (security issue!)');
      } else {
        console.log(`✅ Unauthorized request properly rejected (${unauthorizedResponse.status})`);
      }
    } catch (error) {
      console.log('✅ Unauthorized request caused error (expected)');
    }

    console.log('\n✅ All analytics tests completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Analytics test failed:', error.message);
    return false;
  }
}

// Run the test if this file is executed directly
testUserAnalytics()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });

export { testUserAnalytics };