#!/usr/bin/env node

/**
 * Debug Auth0 Email Template Configuration
 * 
 * This script checks the email template configuration to see why
 * tickets are created but emails aren't being sent.
 */

import { getManagementToken, getAuth0Config } from '../auth0_utils.js';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../config/current-profile.env'), override: true });

async function debugEmailTemplates() {
  console.log('📧 Debug Auth0 Email Template Configuration');
  console.log('==========================================\n');

  try {
    // Get Auth0 management token and config
    console.log('1️⃣ Getting Auth0 management token...');
    const token = await getManagementToken();
    const config = await getAuth0Config();
    console.log('   ✅ Auth0 connection established');

    // Check email templates
    console.log('\n2️⃣ Checking email templates...');
    const templatesUrl = `https://${config.AUTH0_DOMAIN}/api/v2/email-templates`;
    
    try {
      const templatesResponse = await axios.get(templatesUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('   ✅ Email templates retrieved');
      console.log(`   📊 Found ${templatesResponse.data.length} templates:`);
      
      templatesResponse.data.forEach(template => {
        console.log(`      📋 ${template.template} - Enabled: ${template.enabled}`);
        if (template.template === 'change_password') {
          console.log(`         🔧 Subject: ${template.subject || 'Not set'}`);
          console.log(`         📧 From: ${template.from || 'Default'}`);
        }
      });
      
    } catch (templateError) {
      console.log('   ❌ Failed to get email templates');
      console.log(`      Error: ${templateError.response?.data?.message || templateError.message}`);
    }

    // Check change password template specifically
    console.log('\n3️⃣ Checking change password template...');
    const changePasswordUrl = `https://${config.AUTH0_DOMAIN}/api/v2/email-templates/change_password`;
    
    try {
      const changePasswordResponse = await axios.get(changePasswordUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const template = changePasswordResponse.data;
      console.log('   ✅ Change password template found');
      console.log(`      🔛 Enabled: ${template.enabled}`);
      console.log(`      📧 From: ${template.from || 'Default from address'}`);
      console.log(`      📝 Subject: ${template.subject || 'Default subject'}`);
      console.log(`      🎨 Custom body: ${template.body ? 'Yes (custom)' : 'No (default)'}`);
      
      if (!template.enabled) {
        console.log('   ⚠️  WARNING: Change password template is DISABLED!');
        console.log('      💡 This explains why tickets are created but no emails are sent');
      }
      
    } catch (templateError) {
      if (templateError.response?.status === 404) {
        console.log('   ❌ Change password template not configured');
        console.log('      💡 This explains why no emails are being sent');
      } else {
        console.log('   ❌ Failed to get change password template');
        console.log(`      Error: ${templateError.response?.data?.message || templateError.message}`);
      }
    }

    // Check email provider configuration
    console.log('\n4️⃣ Checking email provider configuration...');
    const providerUrl = `https://${config.AUTH0_DOMAIN}/api/v2/emails/provider`;
    
    try {
      const providerResponse = await axios.get(providerUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const provider = providerResponse.data;
      console.log('   ✅ Email provider configured');
      console.log(`      📮 Provider: ${provider.name}`);
      console.log(`      🔛 Enabled: ${provider.enabled}`);
      console.log(`      📧 Default from: ${provider.settings?.default_from_address || 'Not set'}`);
      
      if (!provider.enabled) {
        console.log('   ⚠️  WARNING: Email provider is DISABLED!');
      }
      
    } catch (providerError) {
      if (providerError.response?.status === 404) {
        console.log('   ❌ No email provider configured');
        console.log('      💡 Auth0 is using default email service (limited)');
      } else {
        console.log('   ❌ Failed to get email provider');
        console.log(`      Error: ${providerError.response?.data?.message || providerError.message}`);
      }
    }

    console.log('\n📋 SUMMARY:');
    console.log('===========');
    console.log('✅ Tickets API working correctly (creates password reset URLs)');
    console.log('🔍 Check the items above for email configuration issues:');
    console.log('   • Change password template must be ENABLED');
    console.log('   • Email provider must be ENABLED');
    console.log('   • SMTP settings must be correct');
    console.log('\n💡 Try the "Send Test Email" button in Auth0 Dashboard to verify SMTP');

  } catch (error) {
    console.error('❌ Failed to debug email configuration:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the debug
debugEmailTemplates();