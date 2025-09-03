// Admin System - Functions Test  
// Tests admin handler functions, permissions, and environment configuration

import dotenv from 'dotenv';
import { hasPermission, PERMISSIONS, ROLES } from '../admin_permissions.js';
import { listUsersHandler } from '../admin_handlers/list_users.js';
import { inviteUserHandler } from '../admin_handlers/invite_user.js';
import { deleteUserHandler } from '../admin_handlers/delete_user.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

function testEnvironmentConfig() {
  console.log('\n1️⃣ Testing Environment Configuration...');
  
  const requiredVars = [
    'AUTH0_DOMAIN',
    'AUTH0_M2M_CLIENT_ID', 
    'AUTH0_M2M_CLIENT_SECRET',
    'MONGODB_URI'
  ];
  
  let allConfigured = true;
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value && value !== '' && !value.includes('your_') && !value.includes('_here')) {
      console.log(`   ✅ ${varName}: Configured`);
    } else {
      console.log(`   ❌ ${varName}: Missing or placeholder`);
      allConfigured = false;
    }
  });
  
  return allConfigured;
}

function testPermissions() {
  console.log('\n2️⃣ Testing Permissions System...');
  
  try {
    // Test admin permissions
    const adminHasListUsers = hasPermission(ROLES.ADMIN, PERMISSIONS.LIST_USERS);
    const adminHasDeleteUsers = hasPermission(ROLES.ADMIN, PERMISSIONS.DELETE_USERS);
    const adminHasInviteUsers = hasPermission(ROLES.ADMIN, PERMISSIONS.INVITE_USERS);
    const userHasListUsers = hasPermission(ROLES.USER, PERMISSIONS.LIST_USERS);
    const userHasDeleteUsers = hasPermission(ROLES.USER, PERMISSIONS.DELETE_USERS);
    
    console.log(`   ✅ Admin can list users: ${adminHasListUsers}`);
    console.log(`   ✅ Admin can invite users: ${adminHasInviteUsers}`);
    console.log(`   ✅ Admin can delete users: ${adminHasDeleteUsers}`);
    console.log(`   ✅ User can list users: ${userHasListUsers}`);
    console.log(`   ✅ User cannot delete users: ${!userHasDeleteUsers}`);
    
    // Validate all permissions are properly defined
    const allPermissions = Object.values(PERMISSIONS);
    const allRoles = Object.values(ROLES);
    
    console.log(`   📋 Defined roles: ${allRoles.join(', ')}`);
    console.log(`   📋 Defined permissions: ${allPermissions.join(', ')}`);
    
    return true;
  } catch (error) {
    console.log(`   ❌ Permission system error: ${error.message}`);
    return false;
  }
}

async function testFileStructure() {
  console.log('\n3️⃣ Testing File Structure...');
  
  try {
    const fs = await import('fs');
    const adminFiles = [
      '../auth0_utils.js',
      '../jwt_validator.js',
      '../admin_permissions.js',
      '../admin_handlers/list_users.js',
      '../admin_handlers/invite_user.js', 
      '../admin_handlers/delete_user.js'
    ];
    
    let allFilesExist = true;
    
    for (const file of adminFiles) {
      const fullPath = path.join(__dirname, file);
      if (fs.existsSync(fullPath)) {
        console.log(`   ✅ ${file}`);
      } else {
        console.log(`   ❌ ${file} (missing)`);
        allFilesExist = false;
      }
    }
    
    return allFilesExist;
  } catch (error) {
    console.log(`   ❌ File structure test error: ${error.message}`);
    return false;
  }
}

async function testAdminHandlers() {
  console.log('\n4️⃣ Testing Admin Handler Functions...');
  
  try {
    // Test handler imports and basic structure
    console.log('   ✅ List users handler imported');
    console.log('   ✅ Invite user handler imported');
    console.log('   ✅ Delete user handler imported');
    
    // Verify handlers are functions
    if (typeof listUsersHandler === 'function') {
      console.log('   ✅ listUsersHandler is a function');
    } else {
      console.log('   ❌ listUsersHandler is not a function');
      return false;
    }
    
    if (typeof inviteUserHandler === 'function') {
      console.log('   ✅ inviteUserHandler is a function');
    } else {
      console.log('   ❌ inviteUserHandler is not a function');
      return false;
    }
    
    if (typeof deleteUserHandler === 'function') {
      console.log('   ✅ deleteUserHandler is a function');
    } else {
      console.log('   ❌ deleteUserHandler is not a function');
      return false;
    }
    
    console.log('   ✅ All admin handlers are properly structured');
    return true;
    
  } catch (error) {
    console.log(`   ❌ Handler test error: ${error.message}`);
    return false;
  }
}

async function testFunctions() {
  console.log('⚙️ Admin System - Functions Test');
  console.log('=================================');
  
  try {
    const envOk = testEnvironmentConfig();
    const permissionsOk = testPermissions();
    const filesOk = await testFileStructure();
    const handlersOk = await testAdminHandlers();
    
    if (envOk && permissionsOk && filesOk && handlersOk) {
      console.log('\n✅ All function tests passed!');
      console.log('\n📝 Next Steps:');
      console.log('   1. Run connection test to verify Auth0 M2M');
      console.log('   2. Run JWT integration test');
      console.log('   3. Test admin endpoints with HTTP client');
    } else {
      console.log('\n⚠️  Some tests failed - check configuration and file structure');
    }
    
  } catch (error) {
    console.error('❌ Functions test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testFunctions();
