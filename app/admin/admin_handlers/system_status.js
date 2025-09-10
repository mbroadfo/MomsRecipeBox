// File: admin_handlers/system_status.js
import AWS from 'aws-sdk';

const s3 = new AWS.S3();

/**
 * Test S3 connectivity and permissions
 */
async function testS3Connectivity() {
  try {
    const bucketName = process.env.RECIPE_IMAGES_BUCKET;
    
    if (!bucketName) {
      return {
        status: 'error',
        message: 'S3 bucket name not configured'
      };
    }

    // Test basic S3 connectivity by listing bucket contents (limited)
    const params = {
      Bucket: bucketName,
      MaxKeys: 1
    };

    await s3.listObjectsV2(params).promise();
    
    return {
      status: 'success',
      message: `S3 bucket '${bucketName}' accessible`
    };
  } catch (error) {
    console.error('S3 connectivity test failed:', error);
    
    // Provide more specific error messages
    if (error.code === 'NoSuchBucket') {
      return {
        status: 'error',
        message: 'S3 bucket does not exist'
      };
    } else if (error.code === 'AccessDenied') {
      return {
        status: 'error',
        message: 'S3 access denied - check IAM permissions'
      };
    } else if (error.code === 'CredentialsError') {
      return {
        status: 'error',
        message: 'S3 credentials not configured'
      };
    } else {
      return {
        status: 'error',
        message: `S3 error: ${error.message}`
      };
    }
  }
}

/**
 * Admin endpoint to test system connectivity (excluding AI services)
 * AI services have their own dedicated endpoint: /admin/ai-services-status
 */
export async function handler(event) {
  try {
    // Run connectivity tests
    const s3Test = await testS3Connectivity();

    // Overall system status (excluding AI services)
    const systemOperational = s3Test.status === 'success';

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
        overall_status: systemOperational ? 'operational' : 'degraded',
        services: {
          s3: s3Test
        },
        note: 'AI services status available at /admin/ai-services-status'
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
