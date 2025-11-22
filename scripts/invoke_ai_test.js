// Quick test: import the AI handler and call it with a Food Network URL
// Ensures our handler returns the user-friendly message for blocked sites.

// Automatically set AWS profile to mrb-api for Parameter Store access
process.env.AWS_PROFILE = 'mrb-api';
console.log('🔧 AWS Profile automatically set to: mrb-api');

// Get secrets from Parameter Store (pattern used by other scripts)
const { getSecret } = await import('../app/utils/secrets_manager.js');

// Load required API keys
const openaiKey = await getSecret('OPENAI_API_KEY');
const googleKey = await getSecret('GOOGLE_GEMINI_API_KEY');

if (openaiKey) process.env.OPENAI_API_KEY = openaiKey;
if (googleKey) process.env.GOOGLE_GEMINI_API_KEY = googleKey;

console.log('✅ API keys loaded from Parameter Store');

const { handler } = await import('../app/handlers/ai_recipe_assistant.js');

const event = {
  path: '/ai/chat',
  body: JSON.stringify({
    message: 'https://www.foodnetwork.com/recipes/alton-brown/southern-biscuits-recipe-2041990'
  })
};

console.log('Invoking handler with Food Network URL...');

try {
  const res = await handler(event);
  console.log('--- Handler response ---');
  console.log('statusCode:', res.statusCode);
  console.log('body:', res.body);
} catch (err) {
  console.error('Handler threw an error:', err);
}

// Exit so CI/terminal doesn't hang
process.exit(0);
