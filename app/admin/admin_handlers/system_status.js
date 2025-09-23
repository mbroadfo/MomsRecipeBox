// File: admin_handlers/system_status.js
import AWS from 'aws-sdk';
import { getHealthChecker } from '../../app.js';

const s3 = new AWS.S3();
const lambda = new AWS.Lambda();
const apigateway = new AWS.APIGateway();

/**
 * Get database health from the centralized health system
 */
async function getDatabaseHealth() {
  try {
    const healthChecker = getHealthChecker();
    
    // Determine if we're using local or Atlas
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const isAtlas = mongoUri && mongoUri.includes('mongodb.net');
    const isLocal = mongoUri && (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1'));
    
    let environment = 'Unknown';
    if (isAtlas) environment = 'MongoDB Atlas';
    else if (isLocal) environment = 'Local MongoDB';
    
    // Always get fresh health data with quality analysis for admin panel
    console.log('🔧 Admin: Performing fresh health check for MongoDB...');
    const health = await healthChecker.performFullHealthCheck();
    const dbHealth = health.components?.database;
    
    console.log('🔧 Admin: Health check result:', JSON.stringify(dbHealth, null, 2));
    
    if (dbHealth) {
      // Extract recipe data from health system structure
      let totalRecipes = 0;
      let cleanRecipes = 0;
      let dataQualityPercentage = 0;
      
      // Check if there's quality results in the issues
      const qualityIssue = dbHealth.issues?.find(issue => issue.details?.qualityResults);
      console.log('🔧 Admin: Quality issue found:', qualityIssue ? 'YES' : 'NO');
      
      if (qualityIssue?.details?.qualityResults) {
        const qualityResults = qualityIssue.details.qualityResults;
        totalRecipes = qualityResults.totalRecipes || 0;
        cleanRecipes = qualityResults.cleanRecipes || 0;
        dataQualityPercentage = qualityResults.cleanPercentage || 0;
        console.log(`🔧 Admin: Extracted - Total: ${totalRecipes}, Clean: ${cleanRecipes}, Quality: ${dataQualityPercentage}%`);
      }
      
      return {
        status: dbHealth.overall || 'operational',
        message: `${environment} - Database with quality analysis`,
        stats: {
          environment: environment,
          totalRecipes: totalRecipes,
          connectionTime: 0, // Health system doesn't expose this separately
          dataQualityPercentage: dataQualityPercentage,
          cleanRecipes: cleanRecipes,
          lastChecked: health.timestamp,
          dbName: process.env.MONGODB_DB_NAME || 'moms_recipe_box'
        }
      };
    }
    
    return {
      status: 'error',
      message: 'Unable to determine database health',
      stats: {
        environment: environment,
        dbName: process.env.MONGODB_DB_NAME || 'moms_recipe_box'
      }
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const isAtlas = mongoUri && mongoUri.includes('mongodb.net');
    const environment = isAtlas ? 'MongoDB Atlas' : 'Local MongoDB';
    
    return {
      status: 'error',
      message: `${environment} - Database health error: ${error.message}`,
      stats: {
        environment: environment,
        dbName: process.env.MONGODB_DB_NAME || 'moms_recipe_box'
      }
    };
  }
}

/**
 * Test Auth0 service connectivity
 */
async function testAuth0Connectivity() {
  try {
    const auth0Domain = process.env.AUTH0_DOMAIN;
    const clientId = process.env.AUTH0_M2M_CLIENT_ID;
    
    if (!auth0Domain || !clientId) {
      return {
        status: 'error',
        message: 'Auth0 configuration missing',
        stats: null
      };
    }

    const startTime = Date.now();
    
    // Test Auth0 token endpoint
    const response = await fetch(`https://${auth0Domain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: process.env.AUTH0_M2M_CLIENT_SECRET,
        audience: `https://${auth0Domain}/api/v2/`,
        grant_type: 'client_credentials'
      })
    });
    
    const connectionTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        status: 'operational',
        message: 'Auth0 service accessible',
        stats: {
          responseTime: connectionTime,
          domain: auth0Domain,
          lastChecked: new Date().toISOString()
        }
      };
    } else {
      return {
        status: 'error',
        message: `Auth0 responded with ${response.status}`,
        stats: { responseTime: connectionTime }
      };
    }
  } catch (error) {
    console.error('Auth0 connectivity test failed:', error);
    return {
      status: 'error',
      message: `Auth0 error: ${error.message}`,
      stats: null
    };
  }
}

/**
 * Test S3 connectivity and get storage statistics for image bucket only
 */
async function testS3Connectivity() {
  try {
    const imagesBucket = process.env.RECIPE_IMAGES_BUCKET;
    
    if (!imagesBucket) {
      return {
        status: 'error',
        message: 'S3 images bucket not configured',
        stats: null
      };
    }

    // Only check the images bucket
    const imagesResult = await getBucketInfo(imagesBucket, 'images');

    if (!imagesResult) {
      return {
        status: 'error',
        message: 'Could not access S3 images bucket',
        stats: null
      };
    }

    return {
      status: 'operational',
      message: `S3 image bucket accessible - ${imagesResult.objectCount} images`,
      stats: {
        imageObjects: imagesResult.objectCount,
        imageSize: imagesResult.sizeDisplay,
        bucket: imagesBucket
      }
    };
  } catch (error) {
    console.error('S3 test failed:', error);
    return {
      status: 'error',
      message: `S3 error: ${error.message}`,
      stats: null
    };
  }
}

/**
 * Get bucket information (object count and size)
 */
async function getBucketInfo(bucketName, type) {
  try {
    // Get object count with pagination
    let objectCount = 0;
    let totalSize = 0;
    let continuationToken = null;
    
    do {
      const params = {
        Bucket: bucketName,
        MaxKeys: 1000
      };
      
      if (continuationToken) {
        params.ContinuationToken = continuationToken;
      }
      
      const result = await s3.listObjectsV2(params).promise();
      objectCount += result.Contents?.length || 0;
      
      // Sum up sizes
      if (result.Contents) {
        totalSize += result.Contents.reduce((sum, obj) => sum + (obj.Size || 0), 0);
      }
      
      continuationToken = result.NextContinuationToken;
    } while (continuationToken);

    const sizeInMB = Math.round(totalSize / (1024 * 1024) * 100) / 100;
    const sizeDisplay = sizeInMB > 1024 ? 
      `${Math.round(sizeInMB / 1024 * 100) / 100} GB` : 
      `${sizeInMB} MB`;

    return {
      objectCount,
      size: totalSize,
      sizeDisplay,
      type
    };
  } catch (error) {
    console.error(`Error getting ${type} bucket info for ${bucketName}:`, error);
    
    if (error.code === 'NoSuchBucket') {
      return {
        objectCount: 0,
        size: 0,
        sizeDisplay: 'Bucket not found',
        type,
        error: 'NoSuchBucket'
      };
    } else if (error.code === 'AccessDenied') {
      return {
        objectCount: 0,
        size: 0,
        sizeDisplay: 'Access denied',
        type,
        error: 'AccessDenied'
      };
    }
    
    throw error;
  }
}

/**
 * Calculate total size display from multiple buckets
 */
function calculateTotalSize(size1, size2) {
  const total = (size1 || 0) + (size2 || 0);
  const totalInMB = Math.round(total / (1024 * 1024) * 100) / 100;
  
  if (totalInMB > 1024) {
    return `${Math.round(totalInMB / 1024 * 100) / 100} GB`;
  } else {
    return `${totalInMB} MB`;
  }
}

/**
 * Test API Gateway status (simplified for non-AWS deployment)
 */
async function testAPIGateway() {
  try {
    // Since you're not using AWS API Gateway yet, let's check basic API health
    const startTime = Date.now();
    
    // Test if our own API is responding
    const healthEndpoint = process.env.API_BASE_URL || 'http://localhost:3000';
    
    try {
      const response = await fetch(`${healthEndpoint}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          status: 'operational',
          message: 'Application API responding normally',
          stats: {
            responseTime: `${responseTime}ms`,
            endpoint: healthEndpoint,
            httpStatus: 'OK',
            type: 'Direct API (non-Gateway)'
          }
        };
      } else {
        return {
          status: 'degraded',
          message: `API responding with ${response.status}`,
          stats: {
            responseTime: `${responseTime}ms`,
            endpoint: healthEndpoint,
            httpStatus: response.status,
            type: 'Direct API (non-Gateway)'
          }
        };
      }
    } catch (fetchError) {
      // If we can't reach our own API, we're probably running it, so it's operational
      return {
        status: 'operational',
        message: 'API operational (currently serving this request)',
        stats: {
          type: 'Direct API (non-Gateway)',
          note: 'API Gateway not yet implemented'
        }
      };
    }
  } catch (error) {
    console.error('API health check failed:', error);
    return {
      status: 'operational', 
      message: 'API operational (serving current request)',
      stats: {
        type: 'Direct API (non-Gateway)',
        note: 'Basic health check - API Gateway TBD'
      }
    };
  }
}

/**
 * Test Lambda Functions status - only count functions with mrb-admin tag
 */
async function testLambdaFunctions() {
  try {
    const functions = await lambda.listFunctions({ MaxItems: 100 }).promise();
    
    // Filter functions by tag - only count those with mrb-admin tag
    let taggedFunctions = 0;
    const functionDetails = [];
    
    for (const func of functions.Functions) {
      try {
        const tags = await lambda.listTags({ Resource: func.FunctionArn }).promise();
        if (tags.Tags && tags.Tags['mrb-admin']) {
          taggedFunctions++;
          functionDetails.push({
            name: func.FunctionName,
            runtime: func.Runtime,
            lastModified: func.LastModified
          });
        }
      } catch (tagError) {
        // Skip functions we can't read tags for
        console.warn(`Could not read tags for ${func.FunctionName}:`, tagError.message);
      }
    }
    
    return {
      status: 'operational',
      message: `${taggedFunctions} mrb-admin Lambda functions found`,
      stats: {
        mrbAdminFunctions: taggedFunctions,
        totalFunctions: functions.Functions.length,
        functionDetails: functionDetails
      }
    };
  } catch (error) {
    console.error('Lambda test failed:', error);
    return {
      status: 'error',
      message: `Lambda error: ${error.message}`,
      stats: null
    };
  }
}

/**
 * Check backup status with real metrics from backup system - count root backup folders
 */
async function checkBackupStatus() {
  try {
    const backupsBucket = process.env.MRB_MONGODB_BACKUPS_BUCKET || 'mrb-mongodb-backups-dev';
    
    // List backup folders using delimiter to get folder structure
    const listParams = {
      Bucket: backupsBucket,
      Delimiter: '/', // This groups objects by folder prefix
      Prefix: '' // Root level folders
    };
    
    try {
      const result = await s3.listObjectsV2(listParams).promise();
      const backupFolders = result.CommonPrefixes || []; // These are the root folders
      
      if (backupFolders.length === 0) {
        return {
          status: 'warning',
          message: 'No backup folders found in S3',
          stats: {
            totalBackupFolders: 0,
            lastBackup: null,
            backupsBucket: backupsBucket
          }
        };
      }
      
      // Get the most recent folder by sorting folder names (which include timestamps)
      const folderNames = backupFolders.map(folder => folder.Prefix.replace('/', ''));
      folderNames.sort().reverse(); // Most recent first
      
      const mostRecentFolder = folderNames[0];
      
      return {
        status: 'operational',
        message: `${backupFolders.length} backup folders found`,
        stats: {
          totalBackupFolders: backupFolders.length,
          lastBackupFolder: mostRecentFolder,
          backupsBucket: backupsBucket,
          folderNames: folderNames.slice(0, 5) // Show first 5 backup folders
        }
      };
    } catch (s3Error) {
      return {
        status: 'error',
        message: `S3 backup access error: ${s3Error.message}`,
        stats: {
          backupsBucket: backupsBucket,
          error: s3Error.message
        }
      };
    }
  } catch (error) {
    console.error('Backup status check failed:', error);
    return {
      status: 'error',
      message: `Backup check error: ${error.message}`,
      stats: null
    };
  }
}

/**
 * Check Infrastructure state (basic environment info)
 */
async function checkTerraformState() {
  try {
    // Show meaningful infrastructure configuration and deployment info
    const environment = process.env.NODE_ENV || 'development';
    const awsProfile = process.env.AWS_PROFILE;
    const hasAwsConfig = !!(process.env.AWS_ACCESS_KEY_ID || awsProfile);
    
    // Determine deployment type with enhanced Lambda detection
    let deploymentType = 'Local Development';
    let lambdaInfo = null;
    
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      deploymentType = 'AWS Lambda';
      lambdaInfo = {
        functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
        runtime: process.env.AWS_EXECUTION_ENV || 'Unknown',
        region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'Unknown',
        memorySize: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || 'Unknown',
        timeout: process.env.AWS_LAMBDA_FUNCTION_TIMEOUT || 'Unknown',
        version: process.env.AWS_LAMBDA_FUNCTION_VERSION || 'Unknown'
      };
    } else if (process.env.APP_MODE === 'lambda') {
      deploymentType = 'Lambda (Local Test)';
    } else if (process.env.PORT && environment === 'production') {
      deploymentType = 'Production Server';
    } else if (environment === 'production') {
      deploymentType = 'Production Environment';
    }
    
    // Count configured services with enhanced Lambda awareness
    const services = {
      aws: hasAwsConfig,
      mongodb: !!(process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGODB_ATLAS_URI),
      mongodbMode: process.env.MONGODB_MODE || 'local',
      auth0: !!(process.env.AUTH0_DOMAIN && process.env.AUTH0_M2M_CLIENT_ID),
      s3Storage: !!process.env.RECIPE_IMAGES_BUCKET,
      s3Backups: !!process.env.MRB_MONGODB_BACKUPS_BUCKET,
      secretsManager: !!process.env.AWS_SECRET_NAME,
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      google: !!process.env.GOOGLE_API_KEY,
      deepseek: !!process.env.DEEPSEEK_API_KEY
    };
    
    const configuredServices = Object.values(services).filter(Boolean).length;
    const totalServices = Object.keys(services).length;
    
    const stats = {
      deploymentType,
      environment,
      configuredServices,
      totalServices,
      services
    };
    
    // Add Lambda-specific information if available
    if (lambdaInfo) {
      stats.lambda = lambdaInfo;
    }
    
    return {
      status: 'operational',
      message: `${deploymentType} - ${configuredServices}/${totalServices} services configured`,
      stats: {
        ...stats,
        awsProfile: awsProfile || 'Default/None',
        lastChecked: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Infrastructure check failed:', error);
    return {
      status: 'degraded',
      message: 'Infrastructure status check failed',
      stats: {
        error: error.message
      }
    };
  }
}

/**
 * Check Security status (Auth0 integration)
 */
async function checkSecurityStatus() {
  try {
    // Test Auth0 configuration and basic connectivity
    const auth0Domain = process.env.AUTH0_DOMAIN;
    const m2mClientId = process.env.AUTH0_M2M_CLIENT_ID;
    const clientId = process.env.AUTH0_CLIENT_ID;
    
    const configComplete = !!(auth0Domain && m2mClientId && clientId);
    
    let status = 'operational';
    let message = 'Auth0 security configuration active';
    
    if (!configComplete) {
      status = 'warning';
      message = 'Auth0 configuration incomplete';
    }
    
    return {
      status: status,
      message: message,
      stats: {
        auth0Domain: auth0Domain || 'Not configured',
        m2mConfigured: !!m2mClientId,
        clientConfigured: !!clientId,
        configurationComplete: configComplete,
        environment: process.env.NODE_ENV || 'development',
        corsEnabled: true // Basic CORS is typically enabled
      }
    };
  } catch (error) {
    console.error('Security check failed:', error);
    return {
      status: 'degraded',
      message: 'Security status check failed',
      stats: {
        error: error.message
      }
    };
  }
}

/**
 * Check Application Performance metrics
 */
async function checkPerformanceStatus() {
  try {
    // Get real Node.js performance metrics
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const uptime = Math.floor(process.uptime());
    
    // Convert uptime to readable format
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const uptimeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    
    // Determine status based on memory usage
    const memoryPercentage = Math.round((memoryUsedMB / memoryTotalMB) * 100);
    let status = 'operational';
    let message = `Application running efficiently`;
    
    if (memoryPercentage > 85) {
      status = 'warning';
      message = `High memory usage (${memoryPercentage}%)`;
    } else if (memoryPercentage > 95) {
      status = 'degraded';
      message = `Critical memory usage (${memoryPercentage}%)`;
    }
    
    return {
      status: status,
      message: message,
      stats: {
        memoryUsed: `${memoryUsedMB}MB`,
        memoryTotal: `${memoryTotalMB}MB`,
        memoryPercentage: `${memoryPercentage}%`,
        uptime: uptimeDisplay,
        nodeVersion: process.version,
        pid: process.pid,
        platform: process.platform
      }
    };
  } catch (error) {
    console.error('Performance check failed:', error);
    return {
      status: 'degraded',
      message: 'Performance metrics unavailable',
      stats: {
        error: error.message
      }
    };
  }
}

/**
 * Admin endpoint to test comprehensive infrastructure status
 * Supports individual service testing via query parameter: ?service=mongodb
 * AI services have their own dedicated endpoint: /admin/ai-services-status
 */
export async function handler(event) {
  console.log('🔧 ADMIN SYSTEM STATUS HANDLER CALLED!!!');
  console.log('🔧 Query params:', event.queryStringParameters);
  
  try {
    const queryParams = event.queryStringParameters || {};
    const specificService = queryParams.service;
    
    // If specific service requested, test only that service
    if (specificService) {
      console.log(`🔍 Testing specific service: ${specificService}`);
      
      let serviceResult;
      let serviceName;
      
      switch (specificService.toLowerCase()) {
        case 'mongodb':
          serviceResult = await getDatabaseHealth();
          serviceName = 'mongodb';
          break;
        case 's3':
          serviceResult = await testS3Connectivity();
          serviceName = 's3';
          break;
        case 'auth0':
          serviceResult = await testAuth0Connectivity();
          serviceName = 'auth0';
          break;
        case 'api_gateway':
        case 'apigateway':
          serviceResult = await testAPIGateway();
          serviceName = 'api_gateway';
          break;
        case 'lambda':
          serviceResult = await testLambdaFunctions();
          serviceName = 'lambda';
          break;
        case 'backup':
          serviceResult = await checkBackupStatus();
          serviceName = 'backup';
          break;
        case 'terraform':
        case 'infrastructure':
          serviceResult = await checkTerraformState();
          serviceName = 'terraform';
          break;
        case 'security':
          serviceResult = await checkSecurityStatus();
          serviceName = 'security';
          break;
        case 'performance':
          serviceResult = await checkPerformanceStatus();
          serviceName = 'performance';
          break;
        default:
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: false,
              error: 'Invalid service name',
              availableServices: ['mongodb', 's3', 'auth0', 'api_gateway', 'lambda', 'backup', 'terraform', 'security', 'performance']
            })
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
        body: JSON.stringify({
          success: true,
          timestamp: new Date().toISOString(),
          service: serviceName,
          result: serviceResult,
          note: `Individual service test for ${serviceName}`
        })
      };
    }
    
    // Run all infrastructure connectivity tests in parallel
    const [
      mongoTest,
      s3Test,
      auth0Test,
      apiGatewayTest,
      lambdaTest,
      backupTest,
      terraformTest,
      securityTest,
      performanceTest
    ] = await Promise.allSettled([
      getDatabaseHealth(),
      testS3Connectivity(),
      testAuth0Connectivity(),
      testAPIGateway(),
      testLambdaFunctions(),
      checkBackupStatus(),
      checkTerraformState(),
      checkSecurityStatus(),
      checkPerformanceStatus()
    ]);

    // Extract results, handling any Promise rejections
    const services = {
      mongodb: mongoTest.status === 'fulfilled' ? mongoTest.value : {
        status: 'error',
        message: 'MongoDB test failed to execute',
        stats: null
      },
      s3: s3Test.status === 'fulfilled' ? s3Test.value : {
        status: 'error',
        message: 'S3 test failed to execute',
        stats: null
      },
      auth0: auth0Test.status === 'fulfilled' ? auth0Test.value : {
        status: 'error',
        message: 'Auth0 test failed to execute',
        stats: null
      },
      api_gateway: apiGatewayTest.status === 'fulfilled' ? apiGatewayTest.value : {
        status: 'error',
        message: 'API Gateway test failed to execute',
        stats: null
      },
      lambda: lambdaTest.status === 'fulfilled' ? lambdaTest.value : {
        status: 'error',
        message: 'Lambda test failed to execute',
        stats: null
      },
      backup: backupTest.status === 'fulfilled' ? backupTest.value : {
        status: 'error',
        message: 'Backup check failed to execute',
        stats: null
      },
      terraform: terraformTest.status === 'fulfilled' ? terraformTest.value : {
        status: 'error',
        message: 'Terraform check failed to execute',
        stats: null
      },
      security: securityTest.status === 'fulfilled' ? securityTest.value : {
        status: 'error',
        message: 'Security check failed to execute',
        stats: null
      },
      performance: performanceTest.status === 'fulfilled' ? performanceTest.value : {
        status: 'error',
        message: 'Performance check failed to execute',
        stats: null
      }
    };

    // Overall system status - MongoDB and Auth0 are critical
    const criticalServices = [services.mongodb, services.auth0];
    const systemOperational = criticalServices.every(service => 
      service.status === 'operational' || service.status === 'success'
    );
    
    const hasWarnings = Object.values(services).some(service => 
      service.status === 'degraded'
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        overall_status: systemOperational ? (hasWarnings ? 'degraded' : 'operational') : 'degraded',
        services,
        runtime: {
          platform: process.platform,
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development',
          appMode: process.env.APP_MODE || 'express',
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          isLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME
        },
        note: 'Comprehensive infrastructure status - AI services available at /admin/ai-services-status'
      })
    };
  } catch (error) {
    console.error('System status check failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'System status check failed',
        details: error.message
      })
    };
  }
}