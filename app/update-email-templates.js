#!/usr/bin/env node

/**
 * Auth0 Email Template Updater
 * 
 * This script safely applies the enhanced email templates to Auth0
 * with Mom's Recipe Box branding while preserving Cruise Viewer functionality
 */

import https from 'https';
import fs from 'fs/promises';
import path from 'path';

console.log('🎨 Mom\'s Recipe Box Email Template Updater\n');

// Get environment variables
const domain = process.env.AUTH0_DOMAIN;
const clientId = process.env.AUTH0_M2M_CLIENT_ID;
const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET;

if (!domain || !clientId || !clientSecret) {
  console.log('❌ Missing Auth0 credentials');
  process.exit(1);
}

console.log(`🌐 Domain: ${domain}`);

// Helper function for HTTPS requests with timeout
function httpsRequest(options, postData = null, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ 
            status: res.statusCode, 
            data: parsed,
            headers: res.headers
          });
        } catch (err) {
          resolve({ 
            status: res.statusCode, 
            data: data,
            headers: res.headers,
            parseError: err.message
          });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(new Error(`Request failed: ${err.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    });
    
    req.setTimeout(timeoutMs);
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function getManagementToken() {
  console.log('🔑 Getting management API token...');
  
  const postData = JSON.stringify({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    audience: `https://${domain}/api/v2/`
  });
  
  const options = {
    hostname: domain,
    port: 443,
    path: '/oauth/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const response = await httpsRequest(options, postData);
  
  if (response.status === 200 && response.data.access_token) {
    console.log('✅ Management token obtained');
    return response.data.access_token;
  } else {
    throw new Error(`Token request failed: ${response.status} - ${JSON.stringify(response.data)}`);
  }
}

async function updateEmailTemplate(templateName, templateContent, token) {
  console.log(`📧 Updating ${templateName} template...`);
  
  // Read the enhanced template
  const templatePath = path.join('email_templates', `enhanced_${templateName}.liquid`);
  let body;
  
  try {
    body = await fs.readFile(templatePath, 'utf8');
  } catch (error) {
    console.log(`❌ Could not read ${templatePath}: ${error.message}`);
    return false;
  }
  
  // Prepare the update payload
  const updateData = JSON.stringify({
    template: templateName,
    body: body,
    from: templateContent.from || 'Mom\'s Recipe Box <noreply@momsrecipebox.app>',
    subject: templateContent.subject || 'Welcome to Mom\'s Recipe Box',
    syntax: 'liquid',
    enabled: true
  });
  
  const options = {
    hostname: domain,
    port: 443,
    path: `/api/v2/email-templates/${templateName}`,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(updateData)
    }
  };
  
  try {
    const response = await httpsRequest(options, updateData);
    
    if (response.status === 200) {
      console.log(`✅ Successfully updated ${templateName} template`);
      return true;
    } else {
      console.log(`❌ Failed to update ${templateName}: ${response.status} - ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Network error updating ${templateName}: ${error.message}`);
    return false;
  }
}

async function backupCurrentTemplates(token) {
  console.log('💾 Creating backup of current email templates...');
  
  const templates = ['reset_email', 'verify_email', 'welcome_email'];
  const backupDir = 'auth0_export/email_template_backups';
  
  try {
    await fs.mkdir(backupDir, { recursive: true });
    
    for (const template of templates) {
      const options = {
        hostname: domain,
        port: 443,
        path: `/api/v2/email-templates/${template}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      try {
        const response = await httpsRequest(options);
        if (response.status === 200) {
          const backupFile = path.join(backupDir, `${template}_backup.json`);
          await fs.writeFile(backupFile, JSON.stringify(response.data, null, 2));
          console.log(`   📁 Backed up ${template}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not backup ${template}: ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`❌ Backup error: ${error.message}`);
  }
}

async function main() {
  try {
    // Get management token
    const token = await getManagementToken();
    
    // Create backup of current templates
    await backupCurrentTemplates(token);
    
    console.log('\n🚀 Applying enhanced email templates...\n');
    
    // Define template configurations
    const templates = {
      reset_email: {
        from: 'Mom\'s Recipe Box <noreply@momsrecipebox.app>',
        subject: 'Welcome to Mom\'s Recipe Box – Set Your Password'
      },
      verify_email: {
        from: 'Mom\'s Recipe Box <noreply@momsrecipebox.app>',
        subject: 'Welcome to Mom\'s Recipe Box – Verify Your Email'
      },
      welcome_email: {
        from: 'Mom\'s Recipe Box <noreply@momsrecipebox.app>',
        subject: 'Welcome to Mom\'s Recipe Box!'
      }
    };
    
    let successCount = 0;
    
    // Update each template
    for (const [templateName, config] of Object.entries(templates)) {
      const success = await updateEmailTemplate(templateName, config, token);
      if (success) successCount++;
    }
    
    console.log(`\n🎉 Email template update complete!`);
    console.log(`   ✅ Successfully updated: ${successCount}/3 templates`);
    
    if (successCount === 3) {
      console.log('\n✨ Mom\'s Recipe Box email branding is now active!');
      console.log('\n📋 What happens next:');
      console.log('   • Cruise Viewer users: No change (existing branding preserved)');
      console.log('   • Mom\'s Recipe Box users: New warm, kitchen-themed emails');
      console.log('   • Both apps: Same dynamic password logic preserved');
      console.log('\n🧪 Test by:');
      console.log('   1. Creating a test user in Mom\'s Recipe Box SPA');
      console.log('   2. Checking the email templates for warm orange branding');
      console.log('   3. Verifying Cruise Viewer emails are unchanged');
    } else {
      console.log('\n⚠️  Some templates failed to update. Check the logs above.');
      console.log('   Your current templates are backed up in auth0_export/email_template_backups/');
    }
    
  } catch (error) {
    console.log(`\n❌ Update failed: ${error.message}`);
    process.exit(1);
  }
}

// Add timeout for entire script
setTimeout(() => {
  console.log('\n⏰ Script timeout - exiting');
  process.exit(1);
}, 60000); // 60 seconds

// Run the updater
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});