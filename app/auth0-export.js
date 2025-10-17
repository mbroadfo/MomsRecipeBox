#!/usr/bin/env node

/**
 * Auth0 Configuration Export Script
 * 
 * This script helps export your current Auth0 configuration for analysis
 * Run this script to get a complete picture of your current setup
 */

import { getManagementToken, listAuth0Users } from './admin/auth0_utils.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

// Environment variables
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_M2M_CLIENT_ID = process.env.AUTH0_M2M_CLIENT_ID;

async function exportAuth0Configuration() {
  console.log('🔍 Starting Auth0 Configuration Export...\n');

  try {
    // Get Management API token
    console.log('1️⃣ Getting Management API token...');
    const token = await getManagementToken();
    console.log('   ✅ Token obtained successfully\n');

    const baseUrl = `https://${AUTH0_DOMAIN}/api/v2`;
    const headers = { Authorization: `Bearer ${token}` };

    // Create export directory
    const exportDir = path.join(__dirname, 'auth0_export');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }

    const exportData = {
      tenant_info: {
        domain: AUTH0_DOMAIN,
        export_date: new Date().toISOString(),
        exported_by: 'auth0-discovery-script'
      }
    };

    // 1. Export Applications
    console.log('2️⃣ Exporting Applications...');
    try {
      const appsResponse = await axios.get(`${baseUrl}/clients`, { headers });
      exportData.applications = appsResponse.data;
      console.log(`   ✅ Found ${appsResponse.data.length} applications\n`);

      // Save detailed application info
      fs.writeFileSync(
        path.join(exportDir, 'applications.json'),
        JSON.stringify(appsResponse.data, null, 2)
      );
    } catch (error) {
      console.log(`   ❌ Error exporting applications: ${error.message}\n`);
    }

    // 2. Export APIs (Resource Servers)
    console.log('3️⃣ Exporting APIs/Resource Servers...');
    try {
      const apisResponse = await axios.get(`${baseUrl}/resource-servers`, { headers });
      exportData.apis = apisResponse.data;
      console.log(`   ✅ Found ${apisResponse.data.length} APIs\n`);

      fs.writeFileSync(
        path.join(exportDir, 'apis.json'),
        JSON.stringify(apisResponse.data, null, 2)
      );
    } catch (error) {
      console.log(`   ❌ Error exporting APIs: ${error.message}\n`);
    }

    // 3. Export Connections
    console.log('4️⃣ Exporting Connections...');
    try {
      const connectionsResponse = await axios.get(`${baseUrl}/connections`, { headers });
      exportData.connections = connectionsResponse.data;
      console.log(`   ✅ Found ${connectionsResponse.data.length} connections\n`);

      fs.writeFileSync(
        path.join(exportDir, 'connections.json'),
        JSON.stringify(connectionsResponse.data, null, 2)
      );
    } catch (error) {
      console.log(`   ❌ Error exporting connections: ${error.message}\n`);
    }

    // 4. Export Tenant Settings (what we can access)
    console.log('5️⃣ Exporting Tenant Settings...');
    try {
      const tenantResponse = await axios.get(`${baseUrl}/tenants/settings`, { headers });
      exportData.tenant_settings = tenantResponse.data;
      console.log(`   ✅ Tenant settings exported\n`);

      fs.writeFileSync(
        path.join(exportDir, 'tenant_settings.json'),
        JSON.stringify(tenantResponse.data, null, 2)
      );
    } catch (error) {
      console.log(`   ❌ Error exporting tenant settings: ${error.message}\n`);
    }

    // 5. Export User Statistics (sample)
    console.log('6️⃣ Getting User Statistics...');
    try {
      const usersResponse = await listAuth0Users();
      exportData.user_stats = {
        total_users: usersResponse.total || usersResponse.users.length,
        sample_users: usersResponse.users.slice(0, 3) // First 3 users for structure analysis
      };
      console.log(`   ✅ Found ${exportData.user_stats.total_users} total users\n`);

      fs.writeFileSync(
        path.join(exportDir, 'user_stats.json'),
        JSON.stringify(exportData.user_stats, null, 2)
      );
    } catch (error) {
      console.log(`   ❌ Error getting user statistics: ${error.message}\n`);
    }

    // 6. Generate Summary Report
    console.log('7️⃣ Generating Summary Report...');
    
    const summary = generateSummaryReport(exportData);
    
    fs.writeFileSync(
      path.join(exportDir, 'SUMMARY_REPORT.md'),
      summary
    );

    // Save complete export
    fs.writeFileSync(
      path.join(exportDir, 'complete_export.json'),
      JSON.stringify(exportData, null, 2)
    );

    console.log('✅ Export Complete!');
    console.log(`\n📁 Files exported to: ${exportDir}`);
    console.log('\n📋 Generated files:');
    console.log('   • applications.json - All Auth0 applications');
    console.log('   • apis.json - All APIs/Resource Servers');
    console.log('   • connections.json - All user connections');
    console.log('   • tenant_settings.json - Tenant configuration');
    console.log('   • user_stats.json - User statistics');
    console.log('   • SUMMARY_REPORT.md - Human-readable summary');
    console.log('   • complete_export.json - Complete export data');

  } catch (error) {
    console.error('❌ Export failed:', error.message);
    process.exit(1);
  }
}

function generateSummaryReport(data) {
  const summary = `# Auth0 Configuration Summary Report

**Export Date**: ${data.tenant_info.export_date}
**Domain**: ${data.tenant_info.domain}

## Applications Summary

${data.applications ? data.applications.map(app => `
### ${app.name}
- **Type**: ${app.app_type}
- **Client ID**: ${app.client_id}
- **Callbacks**: ${app.callbacks ? app.callbacks.join(', ') : 'None'}
- **Allowed Origins**: ${app.allowed_origins ? app.allowed_origins.join(', ') : 'None'}
- **Grants**: ${app.grant_types ? app.grant_types.join(', ') : 'None'}
`).join('\n') : 'No applications found'}

## APIs Summary

${data.apis ? data.apis.map(api => `
### ${api.name}
- **Identifier**: ${api.identifier}
- **Signing Algorithm**: ${api.signing_alg}
- **Scopes**: ${api.scopes ? api.scopes.map(s => s.value).join(', ') : 'None'}
`).join('\n') : 'No APIs found'}

## Connections Summary

${data.connections ? data.connections.map(conn => `
### ${conn.name}
- **Strategy**: ${conn.strategy}
- **Enabled Clients**: ${conn.enabled_clients ? conn.enabled_clients.length : 0}
`).join('\n') : 'No connections found'}

## User Statistics

${data.user_stats ? `
- **Total Users**: ${data.user_stats.total_users}
- **Sample User Structure**: Available in user_stats.json
` : 'User statistics not available'}

## Next Steps for Mom's Recipe Box Integration

Based on this export, review the following:

1. **Existing Applications**: Determine if we can extend existing apps or need new ones
2. **API Configuration**: Check if current APIs can support Mom's Recipe Box scopes
3. **Branding**: Review tenant settings for current branding configuration
4. **Users**: Plan migration strategy for existing users

---

*This report was generated automatically. Please review the individual JSON files for complete details.*
`;

  return summary;
}

// Check if Auth0 is configured
if (!AUTH0_DOMAIN || !AUTH0_M2M_CLIENT_ID) {
  console.log('❌ Auth0 not configured. Please set the following environment variables:');
  console.log('   - AUTH0_DOMAIN');
  console.log('   - AUTH0_M2M_CLIENT_ID');
  console.log('   - AUTH0_M2M_CLIENT_SECRET');
  process.exit(1);
}

// Run the export
exportAuth0Configuration();