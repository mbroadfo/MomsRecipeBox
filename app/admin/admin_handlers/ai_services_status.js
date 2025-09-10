// File: admin_handlers/ai_services_status.js
import { AIProviderFactory } from '../../ai_providers/index.js';

/**
 * Test connectivity to a specific AI provider
 */
async function testProviderConnectivity(providerKey, provider) {
  const startTime = Date.now();
  
  try {
    // Create a simple test prompt
    const testPrompt = "Respond with exactly: 'AI connectivity test successful'";
    
    // Use the provider's chat functionality for a minimal test
    const response = await provider.handleChatMessage(testPrompt, []);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Check if we got a reasonable response
    if (response && response.length > 0) {
      return {
        status: 'operational',
        message: `${provider.getConfig().name} service operational`,
        provider: provider.getConfig().name,
        responseTime: `${responseTime}ms`
      };
    } else {
      return {
        status: 'error',
        message: `${provider.getConfig().name} returned empty response`,
        provider: provider.getConfig().name,
        error: 'Empty response',
        responseTime: `${responseTime}ms`
      };
    }
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.error(`${provider.getConfig().name} test failed:`, error.message);
    
    // Determine error type for better user feedback
    let errorType = 'unknown';
    let userMessage = error.message;
    
    if (error.response?.status === 401) {
      errorType = 'authentication';
      userMessage = 'Invalid API key or authentication failed';
    } else if (error.response?.status === 403) {
      errorType = 'authorization';
      userMessage = 'Access denied - check API key permissions';
    } else if (error.response?.status === 429) {
      errorType = 'rate_limit';
      userMessage = 'Rate limit exceeded';
      // Mark as rate limited in the factory
      AIProviderFactory.markRateLimited(providerKey, 60);
    } else if (error.response?.status >= 500) {
      errorType = 'service_error';
      userMessage = 'Service temporarily unavailable';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorType = 'network';
      userMessage = 'Network connection failed';
    } else if (error.code === 'ETIMEDOUT') {
      errorType = 'timeout';
      userMessage = 'Request timed out';
    }
    
    return {
      status: 'error',
      message: userMessage,
      provider: provider.getConfig().name,
      error: errorType,
      details: error.message,
      responseTime: `${responseTime}ms`
    };
  }
}

/**
 * Get the availability status for all AI providers
 */
function getAllProviderStatus() {
  const providers = AIProviderFactory.initializeProviders();
  const statusList = [];
  
  for (const [key, provider] of Object.entries(providers)) {
    const isAvailable = provider.isAvailable();
    const isRateLimited = AIProviderFactory.isRateLimited(key);
    const config = provider.getConfig();
    
    let status = 'unavailable';
    let message = 'API key not configured or invalid';
    
    if (isAvailable) {
      if (isRateLimited) {
        status = 'rate_limited';
        const expiresAt = AIProviderFactory.rateLimitedProviders.get(key);
        const timeUntilExpiry = Math.ceil((expiresAt - Date.now()) / 1000);
        message = `Rate limited (${timeUntilExpiry}s remaining)`;
      } else {
        status = 'configured';
        message = 'API key configured, ready for testing';
      }
    }
    
    statusList.push({
      key,
      name: config.name,
      status,
      message,
      endpoint: config.endpoint || 'N/A',
      model: config.model || 'Default',
      responseTime: 'N/A',
      rateLimitExpiry: isRateLimited ? AIProviderFactory.rateLimitedProviders.get(key) : null
    });
  }
  
  return statusList;
}

/**
 * Test connectivity to all available AI providers
 */
async function testAllProviderConnectivity(testUnavailable = false) {
  const providers = AIProviderFactory.initializeProviders();
  const results = [];
  const timingStats = {
    fastest: null,
    slowest: null,
    average: 0,
    total: 0,
    tested: 0
  };
  
  // Test each provider
  for (const [key, provider] of Object.entries(providers)) {
    const isAvailable = provider.isAvailable();
    const isRateLimited = AIProviderFactory.isRateLimited(key);
    
    // Skip unavailable providers unless specifically requested
    if (!isAvailable && !testUnavailable) {
      results.push({
        key,
        name: provider.getConfig().name,
        status: 'unavailable',
        message: 'API key not configured or invalid',
        responseTime: 'N/A',
        skipped: true
      });
      continue;
    }
    
    // Skip rate-limited providers
    if (isRateLimited) {
      const expiresAt = AIProviderFactory.rateLimitedProviders.get(key);
      const timeUntilExpiry = Math.ceil((expiresAt - Date.now()) / 1000);
      results.push({
        key,
        name: provider.getConfig().name,
        status: 'rate_limited',
        message: `Rate limited (${timeUntilExpiry}s remaining)`,
        responseTime: 'N/A',
        skipped: true
      });
      continue;
    }
    
    // Test the provider
    if (isAvailable) {
      const testResult = await testProviderConnectivity(key, provider);
      results.push({
        key,
        ...testResult,
        skipped: false
      });
      
      // Update timing statistics if we got a numeric response time
      if (testResult.responseTime && testResult.responseTime !== 'N/A') {
        const timeMs = parseInt(testResult.responseTime.replace('ms', ''));
        const providerName = testResult.provider || provider.getConfig().name;
        
        timingStats.tested++;
        timingStats.total += timeMs;
        
        if (timingStats.fastest === null || timeMs < timingStats.fastest.time) {
          timingStats.fastest = {
            time: timeMs,
            provider: providerName,
            key: key
          };
        }
        if (timingStats.slowest === null || timeMs > timingStats.slowest.time) {
          timingStats.slowest = {
            time: timeMs,
            provider: providerName,
            key: key
          };
        }
      }
    } else {
      results.push({
        key,
        name: provider.getConfig().name,
        status: 'unavailable',
        message: 'API key not configured or invalid',
        responseTime: 'N/A',
        skipped: true
      });
    }
  }
  
  // Calculate average
  if (timingStats.tested > 0) {
    timingStats.average = Math.round(timingStats.total / timingStats.tested);
  }
  
  return { results, timingStats };
}

/**
 * Admin endpoint to check AI services status
 */
export async function handler(event) {
  try {
    const queryParams = event.queryStringParameters || {};
    const testConnectivity = queryParams.test === 'true';
    const testUnavailable = queryParams.includeUnavailable === 'true';
    
    let aiResults = [];
    let timingStats = null;
    
    if (testConnectivity) {
      // Perform actual connectivity tests
      console.log('Testing AI provider connectivity...');
      const testData = await testAllProviderConnectivity(testUnavailable);
      aiResults = testData.results;
      timingStats = testData.timingStats;
    } else {
      // Just return configuration status
      aiResults = getAllProviderStatus();
    }
    
    // Calculate summary statistics
    const totalProviders = aiResults.length;
    const operational = aiResults.filter(r => r.status === 'operational').length;
    const configured = aiResults.filter(r => r.status === 'configured').length;
    const errors = aiResults.filter(r => r.status === 'error').length;
    const rateLimited = aiResults.filter(r => r.status === 'rate_limited').length;
    const unavailable = aiResults.filter(r => r.status === 'unavailable').length;
    
    // Determine overall status
    let overallStatus = 'degraded';
    if (operational > 0) {
      overallStatus = 'operational';
    } else if (configured > 0) {
      overallStatus = 'configured';
    } else if (rateLimited > 0) {
      overallStatus = 'rate_limited';
    } else {
      overallStatus = 'unavailable';
    }
    
    // Build response object
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      testPerformed: testConnectivity,
      overallStatus,
      summary: {
        total: totalProviders,
        operational,
        configured,
        errors,
        rateLimited,
        unavailable
      },
      providers: aiResults.sort((a, b) => {
        // Sort by status priority: operational > configured > rate_limited > error > unavailable
        const statusOrder = {
          operational: 1,
          configured: 2,
          rate_limited: 3,
          error: 4,
          unavailable: 5
        };
        return statusOrder[a.status] - statusOrder[b.status];
      })
    };
    
    // Add timing statistics if connectivity testing was performed
    if (testConnectivity && timingStats && timingStats.tested > 0) {
      responseData.timing = {
        tested: timingStats.tested,
        fastest: {
          time: `${timingStats.fastest.time}ms`,
          provider: timingStats.fastest.provider,
          key: timingStats.fastest.key
        },
        slowest: {
          time: `${timingStats.slowest.time}ms`,
          provider: timingStats.slowest.provider,
          key: timingStats.slowest.key
        },
        average: `${timingStats.average}ms`,
        totalTime: `${timingStats.total}ms`
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify(responseData)
    };
  } catch (error) {
    console.error('AI services status check failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'AI services status check failed',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}
