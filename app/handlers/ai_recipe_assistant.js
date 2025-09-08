// File: handlers/ai_recipe_assistant.js
import { getDb } from '../app.js';
import axios from 'axios';
import { AIProviderFactory } from '../ai_providers/index.js';

// Helper function for logging API requests and responses
function logApiOperation(stage, provider, details) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${provider}] [${stage}] ${details}`);
}/**
 * Helper function to optimize image URLs from known sources
 * Attempts to get higher resolution or better quality versions of images
 */
function optimizeImageUrl(url, recipeTitle = '') {
  // Handle Cloudinary URLs (as seen in your example)
  if (url.includes('cloudinary.com')) {
    // Extract the base parts and image ID
    const parts = url.split('/');
    let transformIndex = -1;
    let baseUrl = '';
    let imageId = '';
    
    // Find the transformation section in the URL
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].includes('upload')) {
        transformIndex = i + 1;
        baseUrl = parts.slice(0, i+1).join('/');
        break;
      }
    }
    
    if (transformIndex > 0 && transformIndex < parts.length) {
      // Extract the image ID (last part of the URL)
      imageId = parts[parts.length - 1];
      
      // Create a new optimized URL with better quality parameters
      // Use: larger dimensions, better quality, no cropping
      return `${baseUrl}/c_fill,dpr_2.0,f_auto,fl_lossy.progressive.strip_profile,g_faces:auto,h_800,q_auto:good,w_1200/${imageId}`;
    }
  }
  
  // Handle image URLs with common compression or resizing parameters
  if (url.includes('resize=') || url.includes('quality=') || url.includes('width=') || url.includes('size=')) {
    // Try to identify and remove size-limiting parameters
    const urlObj = new URL(url);
    urlObj.searchParams.delete('resize');
    urlObj.searchParams.delete('quality');
    urlObj.searchParams.delete('w'); // Common width parameter
    urlObj.searchParams.delete('h'); // Common height parameter
    urlObj.searchParams.delete('width');
    urlObj.searchParams.delete('height');
    urlObj.searchParams.delete('size');
    
    // Sometimes add a quality parameter
    if (!urlObj.searchParams.has('q')) {
      urlObj.searchParams.set('q', '95'); // Request high quality
    }
    
    return urlObj.toString();
  }
  
  // Handle common CDN patterns
  if (url.match(/\d+x\d+/) || url.match(/w\d+/) || url.match(/small|medium|thumbnail/i)) {
    // Try to replace size limitations with larger sizes
    return url
      .replace(/\d+x\d+/, '1200x800') // Replace dimensions like 300x200
      .replace(/w\d+/, 'w1200') // Replace width designators like w300
      .replace(/small|medium|thumbnail/i, 'large'); // Replace size indicators
  }
  
  // Return the original URL if no optimizations were applied
  return url;
}

/**
 * Handler for AI recipe chat and URL extraction
 * This handler connects to the LLM API to provide recipe creation assistance
 */
export async function handler(event) {
  try {
    // Parse the request body
    const body = JSON.parse(event.body);
    const { message, messages = [], url = null, user_id = null, model = 'auto' } = body;
    
    // Initialize AI provider based on selected model (or auto-select)
    let aiProvider;
    try {
      // Check if the explicitly requested provider is rate limited
      let wasExplicitlyRequested = model !== 'auto';
      let selectedAltProvider = false;
      
      aiProvider = AIProviderFactory.getProvider(model);
      
      // If the provider is different from what was requested, note it in the logs
      if (wasExplicitlyRequested && aiProvider.getConfig().name.toLowerCase() !== model) {
        console.log(`Note: User requested ${model} but using ${aiProvider.getConfig().name} due to rate limits`);
        selectedAltProvider = true;
      }
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          message: "No language model API key configured. Please add at least one API key to the .env file." 
        })
      };
    }

    // Determine which endpoint is being called
    const pathOnly = event.path.split('?')[0];
    
    if (pathOnly === '/ai/extract') {
      // Extract endpoint - requires URL
      if (!url) {
        return {
          statusCode: 400,
          body: JSON.stringify({ success: false, message: "URL is required for extraction" })
        };
      }
      return await handleUrlExtraction(url, aiProvider);
    } else if (pathOnly === '/ai/chat') {
      // Chat endpoint - requires message
      if (!message) {
        return {
          statusCode: 400,
          body: JSON.stringify({ success: false, message: "Message is required for chat" })
        };
      }
      
      // If a URL is detected in the message, suggest using the extract endpoint
      const urlMatch = message.match(/https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/i);
      if (urlMatch && message.trim().startsWith('http')) {
        const extractedUrl = urlMatch[0];
        // Special case: automatically handle URL extraction in chat if user sends a URL directly
        return await handleUrlExtraction(extractedUrl, aiProvider);
      }
      
      // Check if this appears to be pasted recipe content
      const looksLikeRecipe = 
        (message.includes('Ingredients') && message.includes('Instructions')) ||
        (message.includes('Ingredients') && (message.includes('Directions') || message.includes('Steps'))) ||
        (message.match(/\d+\s+(?:minute|hour)/) && message.match(/\d+\s+(?:tablespoon|teaspoon|cup|pound|ounce|gram)/i));
      
      if (looksLikeRecipe) {
        return await handlePastedRecipeContent(message, aiProvider);
      }
      
      return await handleChatMessage(message, messages || [], aiProvider);
    } else {
      // Unknown endpoint
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, message: "Endpoint not found" })
      };
    }
  } catch (error) {
    console.error("Error in AI recipe assistant:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Failed to process request",
        error: error.message
      })
    };
  }
}

/**
 * Process URL extraction requests
 * Fetches a web page and extracts recipe information using LLM
 */
async function handleUrlExtraction(url, aiProvider) {
  let imageUrl = null; // Declare at function level for outer catch block access
  
  try {
    // Fetch the page content
    const response = await axios.get(url);
    const htmlContent = response.data;
    
    // First, extract potential image URLs from the HTML
    let allImageCandidates = [];
    
    // Look for schema.org recipe markup with image (often the most reliable)
    const schemaMatches = Array.from(htmlContent.matchAll(/"image"\s*:\s*"([^"]+)"/g));
    if (schemaMatches.length > 0) {
      // Collect all schema image URLs
      schemaMatches.forEach(match => {
        allImageCandidates.push({
          url: match[1],
          priority: 90, // High priority
          source: 'schema',
          size: 0 // Will be calculated later
        });
      });
    }
    
    // Look for Open Graph image tags (also very reliable)
    const ogImageMatches = Array.from(htmlContent.matchAll(/<meta\s+property="og:image"\s+content="([^"]+)"/ig));
    if (ogImageMatches.length > 0) {
      ogImageMatches.forEach(match => {
        allImageCandidates.push({
          url: match[1],
          priority: 85, // High priority, but slightly below schema
          source: 'og',
          size: 0
        });
      });
    }
    
    // Look for Twitter image tags
    const twitterImageMatches = Array.from(htmlContent.matchAll(/<meta\s+name="twitter:image"\s+content="([^"]+)"/ig));
    if (twitterImageMatches.length > 0) {
      twitterImageMatches.forEach(match => {
        allImageCandidates.push({
          url: match[1],
          priority: 80,
          source: 'twitter',
          size: 0
        });
      });
    }
    
    // Look for regular image tags with recipe-related classes or IDs
    const imgMatches = Array.from(htmlContent.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/gi));
    
    // Extract the recipe title for better image matching
    let recipeTitle = "";
    const titleMatch = htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/i) || 
                       htmlContent.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      recipeTitle = titleMatch[1].toLowerCase().trim();
      console.log(`Extracted recipe title for image matching: "${recipeTitle}"`);
    }
    
    for (const match of imgMatches) {
      const imgTag = match[0].toLowerCase();
      const imgSrc = match[1];
      
      // Skip tiny images, icons, avatars, and common non-recipe images
      if (imgSrc.includes('icon') || imgSrc.includes('logo') || imgSrc.includes('avatar') || 
          imgSrc.includes('badge') || imgSrc.includes('button') || imgSrc.includes('banner') ||
          imgSrc.includes('ad-') || imgSrc.includes('pixel') || imgSrc.includes('tracker')) {
        continue;
      }
      
      // Calculate priority based on image attributes
      let priority = 50; // Base priority
      
      // Extract width and height if available
      const widthMatch = imgTag.match(/width=["']?(\d+)/);
      const heightMatch = imgTag.match(/height=["']?(\d+)/);
      let width = widthMatch ? parseInt(widthMatch[1]) : 0;
      let height = heightMatch ? parseInt(heightMatch[1]) : 0;
      
      // Extract image size from style attribute
      if (!width || !height) {
        const styleWidth = imgTag.match(/style=["'][^"']*width\s*:\s*(\d+)/i);
        const styleHeight = imgTag.match(/style=["'][^"']*height\s*:\s*(\d+)/i);
        if (styleWidth) width = parseInt(styleWidth[1]);
        if (styleHeight) height = parseInt(styleHeight[1]);
      }
      
      // Calculate image size factor (larger images are more likely to be the main dish)
      const size = width * height || 0;
      
      // Detect key image indicators in the image tag
      if (imgTag.includes('hero') || imgTag.includes('main-image') || imgTag.includes('primary')) priority += 25;
      if (imgTag.includes('recipe-image') || imgTag.includes('recipeimage')) priority += 30;
      if (imgTag.includes('featured') || imgTag.includes('feature-img')) priority += 20;
      if (imgTag.includes('header') || imgTag.includes('banner')) priority += 15;
      
      // Avoid equipment images
      if (imgTag.includes('equipment') || imgTag.includes('tool')) priority -= 30;
      if (imgTag.includes('measuring') || imgTag.includes('spoon')) priority -= 25;
      if (imgTag.includes('product') || imgTag.includes('affiliate')) priority -= 20;
      
      // Check for alt text that indicates it's the main recipe image
      const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
      if (altMatch) {
        const altText = altMatch[1].toLowerCase();
        // Boost priority if alt text contains the recipe name or key terms
        if (recipeTitle && altText.includes(recipeTitle)) priority += 40;
        if (altText.includes('recipe') || altText.includes('dish') || altText.includes('food')) priority += 15;
        // Penalize non-food images
        if (altText.includes('equipment') || altText.includes('tool') || altText.includes('utensil')) priority -= 25;
      }
      
      // Check image filename for clues
      const filename = imgSrc.split('/').pop()?.toLowerCase() || '';
      if (filename.includes('recipe') || filename.includes('dish') || filename.includes('food')) priority += 10;
      if (filename.includes('hero') || filename.includes('main') || filename.includes('feature')) priority += 10;
      
      // Size-based priority adjustments
      if (size > 100000) priority += 30; // Very large images are likely hero images
      else if (size > 40000) priority += 15; // Medium-large images
      else if (size < 10000 && size > 0) priority -= 10; // Small images are less likely to be the main dish
      
      // Add to candidates list
      allImageCandidates.push({
        url: imgSrc,
        priority: priority,
        source: 'img',
        size: size,
        altText: altMatch ? altMatch[1] : ''
      });
    }
    
    console.log(`Found ${allImageCandidates.length} image candidates`);
    
    // Sort candidates by priority (highest first)
    allImageCandidates.sort((a, b) => b.priority - a.priority);
    
    // Log the top candidates for debugging
    if (allImageCandidates.length > 0) {
      console.log('Top 3 image candidates:');
      for (let i = 0; i < Math.min(3, allImageCandidates.length); i++) {
        const candidate = allImageCandidates[i];
        console.log(`${i+1}. URL: ${candidate.url.substring(0, 100)}${candidate.url.length > 100 ? '...' : ''}`);
        console.log(`   Priority: ${candidate.priority}, Source: ${candidate.source}, Size: ${candidate.size}`);
        if (candidate.altText) console.log(`   Alt text: ${candidate.altText}`);
      }
      
      // Select the highest priority image
      imageUrl = allImageCandidates[0].url;
    } else {
      console.log('No suitable images found on the page');
    }
    
    // If image URL is relative, convert to absolute
    if (imageUrl && !imageUrl.startsWith('http')) {
      const urlObj = new URL(url);
      if (imageUrl.startsWith('/')) {
        imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
      } else {
        const path = urlObj.pathname.split('/').slice(0, -1).join('/');
        imageUrl = `${urlObj.protocol}//${urlObj.host}${path}/${imageUrl}`;
      }
    }
    
    // Try to optimize the image URL if it's from a known source
    if (imageUrl) {
      imageUrl = optimizeImageUrl(imageUrl, recipeTitle);
    }
    
    // Extract text content from HTML to reduce payload size
    const textContent = htmlContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Use our provider to handle URL extraction
    try {
      // Add retry logic with exponential backoff for API calls
      let retries = 3;
      let delay = 1000; // Start with 1 second delay
      let lastError = null;
      
      // Retry loop for handling rate limits and API errors
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          console.log(`LLM API attempt ${attempt + 1}/${retries + 1}`);
          
          // Use the provider to handle URL extraction
          const aiResponse = await aiProvider.handleUrlExtraction(url, textContent);
          
          // Log the AI response for debugging
          console.log("AI Response from provider:", aiProvider.getConfig().name);
          console.log("Response sample (first 200 chars):", aiResponse.substring(0, 200));
          
          // Parse the text response into a structured recipe object
          const recipeData = parseRecipeFromText(aiResponse);
          
          // Log the parsed recipe data for debugging
          console.log("Parsed Recipe Data:", JSON.stringify(recipeData, null, 2));
          
          // Add the image URL to the recipe data if we found one
          if (imageUrl) {
            recipeData.imageUrl = imageUrl;
          }
          
          // Add the source URL to the recipe
          if (!recipeData.source) {
            // Extract domain name for the source
            const domain = new URL(url).hostname.replace('www.', '');
            recipeData.source = domain;
          }
          
          return {
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              message: `I've extracted the recipe from ${url}. Here's what I found:

${aiResponse}

${imageUrl ? "I also found an image that I'll include with your recipe." : ""}
Would you like me to apply this to your recipe form? You'll be able to make additional edits afterward.`,
              recipeData,
              imageUrl
            })
          };
        } catch (error) {
          lastError = error;
          
          // Check if this is a rate limit error (429) or other temporary error
          if (error.response && (error.response.status === 429 || 
              error.response.status === 500 || 
              error.response.status === 502 || 
              error.response.status === 503)) {
            
            // Log the error details for debugging
            console.error(`API error (${error.response.status}): Rate limit or server error`);
            console.error(`Error details:`, error.response.data);
            
            // For rate limit errors (429), record the rate limit but don't switch providers
            if (error.response.status === 429) {
              // Import AIProviderFactory dynamically to avoid circular dependencies
              const { AIProviderFactory } = await import('../ai_providers/index.js');
              
              // Get the current provider's key
              const currentProviderKey = Object.keys(AIProviderFactory.initializeProviders())
                .find(key => AIProviderFactory.initializeProviders()[key] === aiProvider);
              
              if (currentProviderKey) {
                // Get retry-after from headers or default to 60 seconds
                const retryAfter = error.response.headers?.['retry-after'] 
                  ? parseInt(error.response.headers['retry-after'], 10) 
                  : 60;
                
                // Record the rate limit
                AIProviderFactory.recordRateLimit(currentProviderKey, retryAfter);
                
                console.log(`Provider ${currentProviderKey} is rate limited. No fallback will be used.`);
                
                // Return a user-friendly error message
                return {
                  statusCode: 429,
                  body: JSON.stringify({
                    success: false,
                    message: `The ${aiProvider.getConfig().name} API is currently rate limited. Please try again in ${retryAfter} seconds or select a different model.`,
                    rateLimited: true,
                    retryAfter: retryAfter,
                    provider: currentProviderKey
                  })
                };
              }
            }
            
            // If we've used all our retries or couldn't find a fallback provider, give up
            if (attempt === retries) {
              console.error(`All ${retries + 1} attempts failed. Giving up.`);
              throw error;
            }
            
            // Calculate exponential backoff with jitter
            const jitter = Math.random() * 0.3 * delay;
            const waitTime = delay + jitter;
            console.log(`Waiting ${Math.round(waitTime / 1000)} seconds before retry ${attempt + 2}...`);
            
            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            // Increase delay for next attempt (exponential backoff)
            delay *= 2;
          } else {
            // For other errors (not rate-limiting related), don't retry
            console.error('Non-retryable API error:', error.message);
            throw error;
          }
        }
      }
      
      // If we get here, all retries failed
      throw lastError || new Error('API failed after multiple retries');
    } catch (error) {
      console.error("Error in provider URL extraction:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in URL extraction:", error);
    
    // Check for rate limit errors specifically
    if (error.response && error.response.status === 429) {
      console.error("API rate limit exceeded:", error.response.data);
      
      // Check if we managed to at least download the page and extract an image
      let fallbackMessage = "The AI recipe extraction service is temporarily unavailable due to rate limiting.";
      let fallbackData = null;
      
      if (imageUrl) {
        fallbackMessage += " However, I was able to extract an image from the page.";
        
        // Create minimal fallback data with just the image
        fallbackData = {
          imageUrl: imageUrl,
          title: "New Recipe", // Default title
          source: new URL(url).hostname.replace('www.', '') // Extract domain name
        };
      }
      
      return {
        statusCode: 429, // Return actual rate limit status
        body: JSON.stringify({
          success: false,
          message: fallbackMessage,
          recipeData: fallbackData,
          imageUrl: imageUrl,
          rateLimited: true,
          retryAfter: error.response.headers['retry-after'] || '60'
        })
      };
    }
    
    // For other errors
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: `I couldn't extract a recipe from the URL: ${error.message}. Please try a different URL or manually enter the recipe details.`,
      })
    };
  }
}

/**
 * Process chat messages for recipe creation/modification
 */
async function handleChatMessage(message, history, aiProvider) {
  try {
    // Add retry logic with exponential backoff for API calls
    let retries = 3;
    let delay = 1000; // Start with 1 second delay
    let lastError = null;
    
    // Retry loop for handling rate limits and API errors
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`LLM API attempt ${attempt + 1}/${retries + 1}`);
        
        // Use the provider to handle the chat message
        const aiResponse = await aiProvider.handleChatMessage(message, history);
        
        // Log the AI response for debugging
        console.log("Chat AI Response from provider:", aiProvider.getConfig().name);
        console.log("Chat Response sample (first 200 chars):", aiResponse.substring(0, 200));
        
        // Check if response contains a complete recipe
        const containsCompleteRecipe = 
          aiResponse.includes("Title:") && 
          aiResponse.includes("Ingredients:") && 
          (aiResponse.includes("Instructions:") || aiResponse.includes("Steps:"));
        
        console.log("Contains complete recipe:", containsCompleteRecipe);
        
        let recipeData = null;
        if (containsCompleteRecipe) {
          // Parse the response to extract structured recipe data
          recipeData = parseRecipeFromText(aiResponse);
          
          // Log the parsed recipe data for debugging
          console.log("Chat Parsed Recipe Data:", JSON.stringify(recipeData, null, 2));
        }
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            message: aiResponse,
            recipeData
          })
        };
      } catch (error) {
        lastError = error;
        
        // Check if this is a rate limit error (429) or other temporary error
        if (error.response && (error.response.status === 429 || 
            error.response.status === 500 || 
            error.response.status === 502 || 
            error.response.status === 503)) {
          
          // Log the error details for debugging
          console.error(`API error (${error.response.status}): Rate limit or server error`);
          console.error(`Error details:`, error.response.data);
          
          // For rate limit errors (429), try to switch to another provider
          if (error.response.status === 429) {
            // Import AIProviderFactory dynamically to avoid circular dependencies
            const { AIProviderFactory } = await import('../ai_providers/index.js');
            
            // Get the current provider's key
            const currentProviderKey = Object.keys(AIProviderFactory.initializeProviders())
              .find(key => AIProviderFactory.initializeProviders()[key] === aiProvider);
            
            if (currentProviderKey) {
              // Get retry-after from headers or default to 60 seconds
              const retryAfter = error.response.headers?.['retry-after'] 
                ? parseInt(error.response.headers['retry-after'], 10) 
                : 60;
              
              // Record the rate limit
              AIProviderFactory.recordRateLimit(currentProviderKey, retryAfter);
              
              console.log(`Provider ${currentProviderKey} is rate limited. No fallback will be used.`);
              
              // Return a user-friendly error message
              return {
                statusCode: 429,
                body: JSON.stringify({
                  success: false,
                  message: `The ${aiProvider.getConfig().name} API is currently rate limited. Please try again in ${retryAfter} seconds or select a different model.`,
                  rateLimited: true,
                  retryAfter: retryAfter,
                  provider: currentProviderKey
                })
              };
            }
          }
          
          // If we've used all our retries or couldn't find a fallback provider, give up
          if (attempt === retries) {
            console.error(`All ${retries + 1} attempts failed. Giving up.`);
            throw error;
          }
          
          // Calculate exponential backoff with jitter
          const jitter = Math.random() * 0.3 * delay;
          const waitTime = delay + jitter;
          console.log(`Waiting ${Math.round(waitTime / 1000)} seconds before retry ${attempt + 2}...`);
          
          // Wait before next attempt
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Increase delay for next attempt (exponential backoff)
          delay *= 2;
        } else {
          // For other errors (not rate-limiting related), don't retry
          console.error('Non-retryable API error:', error.message);
          throw error;
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error('API failed after multiple retries');
  } catch (error) {
    console.error("Error in chat handling:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: `I'm sorry, but I encountered an error while processing your request: ${error.message}. Please try again.`
      })
    };
  }
}

/**
 * Parse recipe text into a structured object
 */
function parseRecipeFromText(text) {
  console.log('===== PARSE RECIPE FROM TEXT =====');
  console.log('Recipe text length:', text?.length || 0);
  
  if (!text) {
    console.error('ERROR: Empty text passed to parseRecipeFromText');
    return {};
  }
  
  // Log the beginning of the text to verify format
  console.log('Text begins with:', text.substring(0, 100).replace(/\n/g, '\\n'));
  
  const recipe = {};
  
  // Extract title - clean any Markdown formatting
  const titleMatch = text.match(/Title:?\s*([^\n]+)/i);
  console.log('Title match:', titleMatch ? `Found: "${titleMatch[1]}"` : 'Not found');
  
  if (titleMatch) {
    recipe.title = titleMatch[1].trim()
      .replace(/\*\*/g, '')  // Remove bold formatting
      .replace(/\*/g, '')    // Remove italic formatting
      .replace(/^#+\s*/, '') // Remove heading markers
      .trim();
    console.log('Extracted title:', recipe.title);
  } else {
    console.error('Failed to extract title. Text format might be incorrect.');
    // Log a more detailed view of the text for debugging
    console.log('First 200 chars with newlines:', JSON.stringify(text.substring(0, 200)));
  }
  
  // Extract subtitle
  const subtitleMatch = text.match(/Subtitle:?\s*([^\n]+)/i);
  if (subtitleMatch) {
    recipe.subtitle = subtitleMatch[1].trim()
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();
  }
  
  // Extract description
  const descriptionMatch = text.match(/Description:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*[A-Za-z]+:|$)/i);
  console.log('Description match:', descriptionMatch ? 'Found' : 'Not found');
  
  if (descriptionMatch) {
    recipe.description = descriptionMatch[1].trim()
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();
    console.log('Extracted description:', recipe.description.substring(0, 50) + (recipe.description.length > 50 ? '...' : ''));
    console.log('Description length:', recipe.description.length);
  } else {
    console.error('Failed to extract description');
    // Check if there's any text resembling a description
    const possibleDesc = text.match(/([^\n]+(?:\n+[^#\n][^\n]*)*)/);
    if (possibleDesc) {
      console.log('Possible description found:', possibleDesc[1].substring(0, 50));
    }
  }
  
  // Extract author
  const authorMatch = text.match(/Author:?\s*([^\n]+)/i);
  if (authorMatch) {
    recipe.author = authorMatch[1].trim()
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();
  }
  
  // Extract source
  const sourceMatch = text.match(/Source:?\s*([^\n]+)/i);
  if (sourceMatch) {
    recipe.source = sourceMatch[1].trim()
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();
  }
  
  // Extract yield/servings
  const yieldMatch = text.match(/(?:Yield|Servings):?\s*([^\n]+)/i);
  if (yieldMatch) {
    recipe.yield = yieldMatch[1].trim()
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();
  }
  
  // Extract cooking time
  const cookingTimeMatch = text.match(/(?:Cooking time|Cook time|Time):?\s*([^\n]+)/i);
  if (cookingTimeMatch) {
    recipe.cookTime = cookingTimeMatch[1].trim()
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();
  }
  
  // Extract ingredients
  const ingredientsMatch = text.match(/Ingredients:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*[A-Za-z]+:|\n\s*\n|$)/i);
  console.log('Ingredients match:', ingredientsMatch ? 'Found' : 'Not found');
  
  if (ingredientsMatch) {
    const ingredientsText = ingredientsMatch[1].trim();
    console.log('Raw ingredients text sample:', ingredientsText.substring(0, 100));
    console.log('Raw ingredients text length:', ingredientsText.length);
    console.log('Raw ingredients lines:', ingredientsText.split('\n').length);
    
    // More detailed logging of the ingredients section
    console.log('Ingredients section full text:');
    console.log(JSON.stringify(ingredientsText));
    
    const ingredientItems = ingredientsText.split('\n')
      .map(line => line.trim())
      // Identify lines that look like list items or numbered items and exclude section headers
      .filter(line => {
        // Skip lines that look like headers (e.g. Instructions:, Steps:)
        if (line.match(/^[A-Z][a-z]+:$/)) {
          console.log('Skipping header-like line:', line);
          return false;
        }
        
        // Include lines that start with list markers or numbers
        const isValidLine = line.match(/^[-•*]|\d+\./) || line.length > 0;
        if (!isValidLine && line.length > 0) {
          console.log('Skipping non-ingredient line:', line);
        }
        return isValidLine;
      })
      .map(line => {
        // Remove list markers and clean formatting
        return line.replace(/^[-•*]\s*|\d+\.\s*/, '')
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .trim();
      }); 
    
    console.log('Found ingredient items count:', ingredientItems.length);
    if (ingredientItems.length > 0) {
      console.log('First 3 ingredient items:', ingredientItems.slice(0, 3));
    } else {
      console.error('No ingredient items found after processing');
    }
    
    // Parse ingredients into structured format if possible
    console.log('Processing ingredients into structured format');
    
    const filteredItems = ingredientItems.filter(item => item.length > 0);
    console.log(`After filtering empty items: ${filteredItems.length} ingredients remain`);
    
    recipe.ingredients = filteredItems
      .map(item => {
        // Try to extract quantity and name
        const matches = item.match(/^([\d\s\/\.\-,]+\s*(?:cups?|tablespoons?|tbsp|tbs|teaspoons?|tsp|pounds?|lbs?|ounces?|oz|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|pinch(?:es)?|dash(?:es)?|to taste|handful|[A-Za-z]+)?)\s+(.*)/i);
        
        if (matches) {
          console.log(`Structured ingredient: quantity="${matches[1].trim()}", name="${matches[2].trim()}"`);
          return {
            quantity: matches[1].trim(),
            name: matches[2].trim()
          };
        } else {
          console.log(`Unstructured ingredient: name="${item}"`);
          return {
            quantity: '',
            name: item
          };
        }
      });
    
    console.log(`Final ingredient count in recipe object: ${recipe.ingredients.length}`);
    if (recipe.ingredients.length === 0) {
      console.error('WARNING: No ingredients were extracted or all were filtered out');
    }
  }
  
  // Extract instructions/steps
  console.log('Looking for instructions/steps section');
  let stepsText = '';
  const instructionsMatch = text.match(/Instructions:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*[A-Za-z]+:|$)/i);
  const stepsMatch = text.match(/Steps:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*[A-Za-z]+:|$)/i);
  
  console.log('Instructions match:', instructionsMatch ? 'Found' : 'Not found');
  console.log('Steps match:', stepsMatch ? 'Found' : 'Not found');
  
  if (instructionsMatch) {
    stepsText = instructionsMatch[1].trim();
    console.log('Using Instructions section, length:', stepsText.length);
  } else if (stepsMatch) {
    stepsText = stepsMatch[1].trim();
    console.log('Using Steps section, length:', stepsText.length);
  } else {
    console.error('Failed to find Instructions or Steps section');
    // Look for other possible headings that might contain instructions
    const directionsMatch = text.match(/Directions:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*[A-Za-z]+:|$)/i);
    const methodMatch = text.match(/Method:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*[A-Za-z]+:|$)/i);
    
    if (directionsMatch) {
      console.log('Found alternative "Directions" section');
      stepsText = directionsMatch[1].trim();
    } else if (methodMatch) {
      console.log('Found alternative "Method" section');
      stepsText = methodMatch[1].trim();
    }
  }
  
  if (stepsText) {
    console.log('Processing steps text, sample:', stepsText.substring(0, 100));
    
    const stepLines = stepsText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    console.log(`Found ${stepLines.length} lines in steps section`);
    
    // Group step lines that belong together
    const stepItems = [];
    let currentStep = '';
    
    for (const line of stepLines) {
      // If the line starts with a number or list marker, it's likely a new step
      if (line.match(/^\d+\.|\d+\)|\*|-|•/)) {
        if (currentStep) {
          stepItems.push(currentStep.trim());
          console.log(`Added step: "${currentStep.substring(0, 40)}..."`);
          currentStep = '';
        }
        // Remove the marker and add to current step
        currentStep = line.replace(/^\d+\.|\d+\)|\*|-|•\s*/, '');
        console.log(`Started new step: "${currentStep.substring(0, 40)}..."`);
      }
      // Exclude metadata lines like "Cooking time:" or "Servings:"
      else if (!line.match(/^\*\*(?:Cooking time|Servings|Prep time|Cook time):/)) {
        // If it's a continuation of a step
        if (currentStep) {
          currentStep += ' ' + line;
          console.log(`Continued step: now ${currentStep.length} chars`);
        } else {
          currentStep = line;
          console.log(`Started step without marker: "${line.substring(0, 40)}..."`);
        }
      } else {
        console.log(`Skipping metadata line: "${line}"`);
      }
    }
    
    if (currentStep) {
      stepItems.push(currentStep.trim());
      console.log(`Added final step: "${currentStep.substring(0, 40)}..."`);
    }
    
    console.log(`Found ${stepItems.length} steps before cleanup`);
    
    // Clean up formatting in steps
    recipe.steps = stepItems
      .map(step => step
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .trim())
      .filter(step => {
        // Final filtering to remove non-instruction content
        const isValid = !step.match(/Enjoy your meal|serving suggestion|bon appétit/i);
        if (!isValid) {
          console.log(`Filtered out non-instruction step: "${step}"`);
        }
        return isValid;
      });
    
    console.log(`Final step count: ${recipe.steps.length}`);
    if (recipe.steps.length > 0) {
      console.log('First step:', recipe.steps[0]);
      console.log('Last step:', recipe.steps[recipe.steps.length - 1]);
    } else {
      console.error('WARNING: No steps were extracted or all were filtered out');
    }
  }
  
  // Extract notes
  const notesMatch = text.match(/Notes:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*[A-Za-z]+:|$)/i);
  if (notesMatch) {
    recipe.notes = notesMatch[1].trim()
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();
  }
  
  // Extract tags
  const tagsMatch = text.match(/Tags:?\s*([^\n]+)/i);
  if (tagsMatch) {
    recipe.tags = tagsMatch[1].split(',')
      .map(tag => tag
        .trim()
        .toLowerCase()
        .replace(/\*\*/g, '')
        .replace(/\*/g, ''))
      .filter(tag => tag.length > 0);
  }
  
  // Extract preparation time if available
  const prepTimeMatch = text.match(/(?:Preparation time|Prep time):?\s*([^\n]+)/i);
  if (prepTimeMatch) {
    if (!recipe.time) recipe.time = {};
    recipe.time.prep = prepTimeMatch[1].trim()
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();
  }
  
  // Log a summary of what we parsed
  console.log('===== RECIPE PARSING SUMMARY =====');
  console.log(`Title: ${recipe.title ? 'Found' : 'NOT FOUND!'}`);
  console.log(`Description: ${recipe.description ? 'Found' : 'NOT FOUND!'}`);
  console.log(`Ingredients: ${recipe.ingredients?.length || 0} items`);
  console.log(`Steps: ${recipe.steps?.length || 0} steps`);
  console.log(`Additional fields: ${Object.keys(recipe).filter(k => 
    !['title', 'description', 'ingredients', 'steps'].includes(k)
  ).join(', ')}`);
  
  if (!recipe.title || !recipe.ingredients || recipe.ingredients.length === 0 || 
      !recipe.steps || recipe.steps.length === 0) {
    console.error('WARNING: Recipe parsing incomplete - missing essential fields');
  } else {
    console.log('Recipe parsing complete - all essential fields found');
  }
  
  return recipe;
}

/**
 * Process pasted recipe content
 * Analyzes raw text (typically copy/pasted from a recipe website) and extracts recipe information
 */
async function handlePastedRecipeContent(content, aiProvider) {
  try {
    // Add retry logic with exponential backoff for API calls
    let retries = 3;
    let delay = 1000; // Start with 1 second delay
    let lastError = null;
    
    // Retry loop for handling rate limits and API errors
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`LLM API attempt ${attempt + 1}/${retries + 1}`);
        
        // Use the provider to handle the pasted recipe content
        const aiResponse = await aiProvider.handlePastedRecipeContent(content);
        
        // Parse the text response into a structured recipe object
        const recipeData = parseRecipeFromText(aiResponse);
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            message: `I've extracted the recipe from your pasted content. Here's what I found:

${aiResponse}

Would you like me to apply this to your recipe form? You'll be able to make additional edits afterward.`,
            recipeData
          })
        };
      } catch (error) {
        lastError = error;
        
        // Check if this is a rate limit error (429) or other temporary error
        if (error.response && (error.response.status === 429 || 
            error.response.status === 500 || 
            error.response.status === 502 || 
            error.response.status === 503)) {
          
          // Log the error details for debugging
          console.error(`API error (${error.response.status}): Rate limit or server error`);
          console.error(`Error details:`, error.response.data);
          
          // For rate limit errors (429), try to switch to another provider
          if (error.response.status === 429) {
            // Import AIProviderFactory dynamically to avoid circular dependencies
            const { AIProviderFactory } = await import('../ai_providers/index.js');
            
            // Get the current provider's key
            const currentProviderKey = Object.keys(AIProviderFactory.initializeProviders())
              .find(key => AIProviderFactory.initializeProviders()[key] === aiProvider);
            
            if (currentProviderKey) {
              // Get retry-after from headers or default to 60 seconds
              const retryAfter = error.response.headers?.['retry-after'] 
                ? parseInt(error.response.headers['retry-after'], 10) 
                : 60;
              
              // Record the rate limit
              AIProviderFactory.recordRateLimit(currentProviderKey, retryAfter);
              
              console.log(`Provider ${currentProviderKey} is rate limited. No fallback will be used.`);
              
              // Return a user-friendly error message
              return {
                statusCode: 429,
                body: JSON.stringify({
                  success: false,
                  message: `The ${aiProvider.getConfig().name} API is currently rate limited. Please try again in ${retryAfter} seconds or select a different model.`,
                  rateLimited: true,
                  retryAfter: retryAfter,
                  provider: currentProviderKey
                })
              };
            }
          }
          
          // If we've used all our retries or couldn't find a fallback provider, give up
          if (attempt === retries) {
            console.error(`All ${retries + 1} attempts failed. Giving up.`);
            throw error;
          }
          
          // Calculate exponential backoff with jitter
          const jitter = Math.random() * 0.3 * delay;
          const waitTime = delay + jitter;
          console.log(`Waiting ${Math.round(waitTime / 1000)} seconds before retry ${attempt + 2}...`);
          
          // Wait before next attempt
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Increase delay for next attempt (exponential backoff)
          delay *= 2;
        } else {
          // For other errors (not rate-limiting related), don't retry
          console.error('Non-retryable API error:', error.message);
          throw error;
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error('API failed after multiple retries');
  } catch (error) {
    console.error("Error processing pasted content:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: `I couldn't extract a recipe from the pasted content: ${error.message}. Please try again with different content or manually enter the recipe details.`,
      })
    };
  }
}

export default handler;
