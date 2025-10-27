import axios from 'axios';

const API_URL = 'https://b31emm78z4.execute-api.us-west-2.amazonaws.com/dev';

async function testErrorScenarios() {
    console.log('🔒 Testing JWT Authentication Error Scenarios\n');

    // Test 1: Missing Authorization header
    console.log('1. Testing missing Authorization header...');
    try {
        const response = await axios.get(`${API_URL}/recipes`);
        console.log('❌ Unexpected success:', response.status);
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ Expected 401 Unauthorized:', error.response.data?.message || 'Unauthorized');
        } else {
            console.log('⚠️ Unexpected error:', error.response?.status, error.response?.data);
        }
    }

    // Test 2: Invalid JWT token
    console.log('\n2. Testing invalid JWT token...');
    try {
        const response = await axios.get(`${API_URL}/recipes`, {
            headers: {
                Authorization: 'Bearer invalid.jwt.token'
            }
        });
        console.log('❌ Unexpected success:', response.status);
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ Expected 401 Unauthorized:', error.response.data?.message || 'Unauthorized');
        } else {
            console.log('⚠️ Unexpected error:', error.response?.status, error.response?.data);
        }
    }

    // Test 3: Malformed Authorization header
    console.log('\n3. Testing malformed Authorization header...');
    try {
        const response = await axios.get(`${API_URL}/recipes`, {
            headers: {
                Authorization: 'NotBearer sometoken'
            }
        });
        console.log('❌ Unexpected success:', response.status);
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ Expected 401 Unauthorized:', error.response.data?.message || 'Unauthorized');
        } else {
            console.log('⚠️ Unexpected error:', error.response?.status, error.response?.data);
        }
    }

    console.log('\n🎉 Error scenario testing complete!');
}

testErrorScenarios().catch(console.error);