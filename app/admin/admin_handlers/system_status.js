// File: admin_handlers/system_status.js
import AWS from 'aws-sdk';
import axios from 'axios';

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
 * Test AI Recipe Assistant connectivity
 */
async function testAIConnectivity() {
  try {
    // Test the most available AI service
    let testResult = null;
    
    // Try Google Gemini first (usually most reliable)
    if (process.env.GOOGLE_API_KEY) {
      try {
        const response = await axios.post(
          'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent',
          {
            contents: [{
              parts: [{
                text: "Say 'AI connectivity test successful' in exactly those words."
              }]
            }],
            generationConfig: {
              maxOutputTokens: 20
            }
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            params: {
              key: process.env.GOOGLE_API_KEY
            },
            timeout: 10000 // 10 second timeout
          }
        );

        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          return {
            status: 'success',
            message: 'Google Gemini AI service operational',
            provider: 'Google Gemini'
          };
        }
      } catch (googleError) {
        console.log('Google Gemini test failed, trying next provider:', googleError.message);
      }
    }

    // Try Groq if Google failed
    if (process.env.GROQ_API_KEY) {
      try {
        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama3-70b-8192',
            messages: [{
              role: 'user',
              content: "Say 'AI connectivity test successful' in exactly those words."
            }],
            max_tokens: 20
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        if (response.data?.choices?.[0]?.message?.content) {
          return {
            status: 'success',
            message: 'Groq AI service operational',
            provider: 'Groq'
          };
        }
      } catch (groqError) {
        console.log('Groq test failed, trying next provider:', groqError.message);
      }
    }

    // Try DeepSeek if others failed
    if (process.env.DEEPSEEK_API_KEY) {
      try {
        const response = await axios.post(
          'https://api.deepseek.com/v1/chat/completions',
          {
            model: 'deepseek-chat',
            messages: [{
              role: 'user',
              content: "Say 'AI connectivity test successful' in exactly those words."
            }],
            max_tokens: 20
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        if (response.data?.choices?.[0]?.message?.content) {
          return {
            status: 'success',
            message: 'DeepSeek AI service operational',
            provider: 'DeepSeek'
          };
        }
      } catch (deepseekError) {
        console.log('DeepSeek test failed, trying next provider:', deepseekError.message);
      }
    }

    // Try OpenAI as last resort
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: [{
              role: 'user',
              content: "Say 'AI connectivity test successful' in exactly those words."
            }],
            max_tokens: 20
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        if (response.data?.choices?.[0]?.message?.content) {
          return {
            status: 'success',
            message: 'OpenAI service operational',
            provider: 'OpenAI'
          };
        }
      } catch (openaiError) {
        console.log('OpenAI test failed:', openaiError.message);
      }
    }

    // If we get here, no AI services are working
    return {
      status: 'error',
      message: 'No AI services available or configured'
    };

  } catch (error) {
    console.error('AI connectivity test failed:', error);
    return {
      status: 'error',
      message: `AI service error: ${error.message}`
    };
  }
}

/**
 * Admin endpoint to test system connectivity
 */
export async function handler(event) {
  try {
    // Run all connectivity tests in parallel
    const [s3Test, aiTest] = await Promise.all([
      testS3Connectivity(),
      testAIConnectivity()
    ]);

    // Overall system status
    const allSystemsOperational = s3Test.status === 'success' && aiTest.status === 'success';

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
        overall_status: allSystemsOperational ? 'operational' : 'degraded',
        services: {
          s3: s3Test,
          ai: aiTest
        }
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
