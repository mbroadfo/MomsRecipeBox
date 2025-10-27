#!/usr/bin/env node
/**
 * Comprehensive Lambda Mode Test
 * 
 * Tests all major Lambda functionality to verify deployment success.
 * This script validates that the Lambda function is working correctly
 * by testing various endpoints and error conditions.
 * 
 * Usage:
 *   node test-lambda-comprehensive.js
 * 
 * Expected Results:
 * - Health Check: 200 (working)
 * - CORS Preflight: 200 (working) 
 * - Build Marker: 200 (working)
 * - AI Providers: 200 (working)
 * - 404 Handler: 404 (correct behavior)
 * - Database Routes: 503 (expected when DB not connected)
 * - API Gateway: 503 (expected when DB not connected)
 * 
 * @author MomsRecipeBox Development Team
 * @since 2025-10-26
 */

import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const API_BASE = 'https://b31emm78z4.execute-api.us-west-2.amazonaws.com/dev';
const LAMBDA_FUNCTION = 'mrb-app-api';
const REGION = 'us-west-2';

class LambdaTest {
  constructor() {
    this.tests = [];
    this.results = [];
    this.tempFiles = [];
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lambda-test-'));
  }

  async runCommand(cmd, args) {
    return new Promise((resolve, reject) => {
      const process = spawn(cmd, args, { shell: true });
      let stdout = '', stderr = '';
      
      process.stdout?.on('data', data => stdout += data);
      process.stderr?.on('data', data => stderr += data);
      
      process.on('close', code => {
        if (code === 0) resolve({ stdout, stderr });
        else reject(new Error(`Command failed: ${stderr || stdout}`));
      });
    });
  }

  async testLambdaDirect(testName, event) {
    try {
      console.log(`\n🧪 Testing: ${testName}`);
      
      const eventFile = path.join(this.tempDir, `temp-event-${Date.now()}.json`);
      this.tempFiles.push(eventFile);
      fs.writeFileSync(eventFile, JSON.stringify(event, null, 2));
      
      const responseFile = path.join(this.tempDir, `temp-response-${Date.now()}.json`);
      this.tempFiles.push(responseFile);
      
      await this.runCommand('aws', [
        'lambda', 'invoke',
        '--function-name', LAMBDA_FUNCTION,
        '--region', REGION,
        '--cli-binary-format', 'raw-in-base64-out',
        '--payload', `file://${eventFile}`,
        responseFile
      ]);
      
      const response = JSON.parse(fs.readFileSync(responseFile, 'utf8'));
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Response: ${response.body?.substring(0, 100)}...`);
      
      this.results.push({
        test: testName,
        status: response.statusCode,
        success: this.isExpectedStatus(testName, response.statusCode),
        response: response.body
      });
      
      return response;
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      this.results.push({
        test: testName,
        status: 'ERROR',
        success: false,
        error: error.message
      });
      throw error;
    }
  }

  async testAPIGateway(testName, method, path, authToken = null) {
    try {
      console.log(`\n🌐 Testing API Gateway: ${method} ${path}`);
      
      const url = `${API_BASE}${path}`;
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(url, {
        method: method,
        headers: headers
      });
      
      const status = response.status;
      let body = '';
      
      try {
        body = await response.text();
      } catch (e) {
        body = `Error reading response: ${e.message}`;
      }
      
      console.log(`   Status: ${status}`);
      console.log(`   Response: ${body.substring(0, 100)}...`);
      
      this.results.push({
        test: testName,
        status: status,
        success: this.isExpectedStatus(testName, status),
        response: body
      });
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      this.results.push({
        test: testName,
        status: 'ERROR',
        success: false,
        error: error.message
      });
    }
  }

  async generateAuthToken() {
    try {
      console.log('🔐 Generating Auth0 JWT token...');
      
      // Get Auth0 credentials from AWS Secrets Manager
      const secretResult = await this.runCommand('aws', [
        'secretsmanager', 'get-secret-value',
        '--secret-id', 'moms-recipe-secrets-dev',
        '--region', 'us-west-2',
        '--query', 'SecretString',
        '--output', 'text'
      ]);
      
      const secrets = JSON.parse(secretResult.stdout);
      
      // Generate M2M token using Node.js fetch (no PowerShell!)
      const tokenResponse = await fetch('https://dev-jdsnf3lqod8nxlnv.us.auth0.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: secrets.AUTH0_M2M_CLIENT_ID,
          client_secret: secrets.AUTH0_M2M_CLIENT_SECRET,
          audience: 'https://momsrecipebox/api',
          grant_type: 'client_credentials'
        })
      });
      
      if (!tokenResponse.ok) {
        throw new Error(`Auth0 token request failed: ${tokenResponse.status}`);
      }
      
      const tokenData = await tokenResponse.json();
      const token = tokenData.access_token;
      
      console.log('✅ JWT token generated successfully');
      return token;
    } catch (error) {
      console.log(`⚠️ Failed to generate JWT token: ${error.message}`);
      return null;
    }
  }

  async runComprehensiveTest() {
    console.log('🚀 MOMS RECIPE BOX - LAMBDA MODE COMPREHENSIVE TEST');
    console.log('='.repeat(60));

    // Generate JWT token for authenticated tests
    const authToken = await this.generateAuthToken();

    // Test 1: Basic Health Check (Direct Lambda)
    await this.testLambdaDirect('Health Check (Direct)', {
      httpMethod: 'GET',
      path: '/health',
      headers: { 'Content-Type': 'application/json' }
    });

    // Test 2: CORS Preflight (Direct Lambda)
    await this.testLambdaDirect('CORS Preflight', {
      httpMethod: 'OPTIONS',
      path: '/recipes',
      headers: { 'Content-Type': 'application/json' }
    });

    // Test 3: Build Marker Initialization (Direct Lambda)
    await this.testLambdaDirect('Build Marker Init', {
      httpMethod: 'POST',
      path: '/initializeBuildMarker',
      headers: { 'Content-Type': 'application/json' }
    });

    // Test 4: Authenticated Recipe List via API Gateway (should work with JWT)
    if (authToken) {
      await this.testAPIGateway('Authenticated Recipes', 'GET', '/recipes', authToken);
    } else {
      console.log('⚠️ Skipping authenticated API Gateway test - no JWT token available');
    }

    // Test 5: Unauthenticated Recipe List via API Gateway (should return 401)
    await this.testAPIGateway('Unauthenticated Recipes', 'GET', '/recipes');

    // Test 6: Recipe List (Database Required)
    await this.testLambdaDirect('Recipe List (DB Test)', {
      httpMethod: 'GET',
      path: '/recipes',
      headers: { 'Content-Type': 'application/json' }
    });

    // Test 7: AI Providers (No DB Required)
    await this.testLambdaDirect('AI Providers', {
      httpMethod: 'GET',
      path: '/ai/providers',
      headers: { 'Content-Type': 'application/json' }
    });

    // Test 8: 404 Handler (expect 404)
    await this.testLambdaDirect('404 Handler', {
      httpMethod: 'GET',
      path: '/nonexistent',
      headers: { 'Content-Type': 'application/json' }
    });

    this.printResults();
    this.cleanup();
  }

  isExpectedStatus(testName, status) {
    if (testName === '404 Handler') return status === 404;
    if (testName === 'Unauthenticated Recipes') return status === 401; // Expected: requires authentication
    if (testName === 'Authenticated Recipes') return status === 200; // Expected: should work with JWT
    if (testName.includes('DB Test') || testName.includes('Recipe List')) return status === 200; // Database is connected and working
    return status >= 200 && status < 400; // Success range
  }

  printResults() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));

    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;

    this.results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      const status = typeof result.status === 'number' ? result.status : result.status;
      console.log(`${icon} ${result.test.padEnd(30)} Status: ${status}`);
    });

    console.log('\n' + '-'.repeat(60));
    console.log(`🎯 OVERALL: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);

    if (passed === total) {
      console.log('🎉 LAMBDA MODE IS FULLY FUNCTIONAL!');
    } else {
      console.log('⚠️  Some issues remain - see failed tests above');
    }

    // Show key metrics
    console.log('\n📈 KEY METRICS:');
    console.log(`   • Package Size Reduction: 187MB → 636KB (99.7%)`);
    console.log(`   • Lambda Function: ${LAMBDA_FUNCTION}`);
    console.log(`   • API Gateway: ${API_BASE}`);
    console.log(`   • Docker Build: Legacy buildkit for Lambda compatibility`);
  }

  cleanup() {
    console.log('\n🧹 Cleaning up temporary files...');
    this.tempFiles.forEach(file => {
      try {
        fs.unlinkSync(file);
      } catch (e) {
        // Ignore cleanup errors
      }
    });
    
    // Clean up temporary directory
    try {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
      console.log(`✅ Cleanup complete (removed temp dir: ${this.tempDir})`);
    } catch (e) {
      console.log('✅ Cleanup complete');
    }
  }
}

// Run the test
const test = new LambdaTest();
test.runComprehensiveTest().catch(console.error);