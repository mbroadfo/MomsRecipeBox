// File: handlers/ai_recipe_assistant.js
import { getDb } from '../app.js';
import axios from 'axios';

/**
 * Helper function to optimize image URLs from known sources
 * Attempts to get higher resolution or better quality versions of images
 */
function optimizeImageUrl(url, recipeTitle = '') {
  // Handle Cloudinary URLs (as seen in your example)
  if (url.includes('cloudinary.com')) {
    console.log('Optimizing Cloudinary URL');
    
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
 * This handler connects to the OpenAI API to provide recipe creation assistance
 */
export async function handler(event) {
  try {
    // Parse the request body
    const body = JSON.parse(event.body);
    const { message, messages = [], url = null, user_id = null } = body;
    
    // Check if we have API key
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          message: "OpenAI API key not configured. Please add your API key to the .env file." 
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
      return await handleUrlExtraction(url, OPENAI_API_KEY);
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
        return await handleUrlExtraction(extractedUrl, OPENAI_API_KEY);
      }
      
      // Check if this appears to be pasted recipe content
      const looksLikeRecipe = 
        (message.includes('Ingredients') && message.includes('Instructions')) ||
        (message.includes('Ingredients') && (message.includes('Directions') || message.includes('Steps'))) ||
        (message.match(/\d+\s+(?:minute|hour)/) && message.match(/\d+\s+(?:tablespoon|teaspoon|cup|pound|ounce|gram)/i));
      
      if (looksLikeRecipe) {
        return await handlePastedRecipeContent(message, OPENAI_API_KEY);
      }
      
      return await handleChatMessage(message, messages || [], OPENAI_API_KEY);
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
 * Fetches a web page and extracts recipe information using OpenAI
 */
async function handleUrlExtraction(url, apiKey) {
  try {
    // Fetch the page content
    const response = await axios.get(url);
    const htmlContent = response.data;
    
    // First, extract potential image URLs from the HTML
    let imageUrl = null;
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
    
    console.log(`Selected final image URL: ${imageUrl || 'None found'}`);
    
    // Try to optimize the image URL if it's from a known source
    if (imageUrl) {
      imageUrl = optimizeImageUrl(imageUrl, recipeTitle);
    }
    
    console.log("Extracted image URL:", imageUrl);
    
    // Create a prompt for the OpenAI API to extract recipe information from HTML
    const prompt = `
    You are a helpful recipe extraction assistant. Extract the complete recipe from the following HTML content.
    Format your response as a complete, detailed recipe with the following structure:
    
    Title: [Recipe Title]
    Subtitle: [Brief description or tagline, if present]
    Description: [Full description, if present]
    Author: [Recipe author, if present]
    Source: [Original source or website name]
    Yield: [Number of servings or quantity]
    Time: [Preparation time, cooking time, total time]
    Ingredients:
    - [List each ingredient with quantity and preparation method]
    
    Instructions:
    1. [Step 1]
    2. [Step 2]
    ...
    
    Notes: [Any additional notes or tips]
    Tags: [Comma-separated list of recipe categories or keywords]
    
    Don't include any field if there's no corresponding information in the HTML.
    
    HTML Content:
    ${htmlContent.substring(0, 100000)} // Limit to 100k characters to avoid token limits
    `;
    
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4-turbo", // Using powerful model for better extraction
        messages: [
          {
            role: "system",
            content: "You are a precise recipe extraction assistant that can parse recipes from HTML content. Extract only the recipe details in the exact format requested, with nothing else added."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3 // Lower temperature for more consistent results
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    const aiResponse = openaiResponse.data.choices[0].message.content;
    
    // Parse the text response into a structured recipe object
    const recipeData = parseRecipeFromText(aiResponse);
    
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
    console.error("Error in URL extraction:", error);
    
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
async function handleChatMessage(message, history, apiKey) {
  try {
    // Convert our internal history format to OpenAI format
    const messages = [
      {
        role: "system",
        content: `You are a helpful recipe creation assistant that helps users build recipes from scratch or modify existing ones. 
        Your goal is to help create complete, well-structured recipes with all necessary fields: 
        title, description, ingredients (with quantities), detailed instructions, cooking time, servings, etc.
        
        If the user asks for a specific recipe or provides ingredients, help them create a complete recipe.
        If they ask for modifications or substitutions, provide clear guidance.
        If you detect that a complete recipe can be created from the conversation, format it nicely and prepare it for saving.
        `
      }
    ];
    
    // Add conversation history
    history.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });
    
    // Add the current message
    messages.push({
      role: "user",
      content: message
    });
    
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4", // Using powerful model for better recipes
        messages,
        temperature: 0.7 // Slightly more creative for recipe generation
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    const aiResponse = openaiResponse.data.choices[0].message.content;
    
    // Check if response contains a complete recipe
    const containsCompleteRecipe = 
      aiResponse.includes("Title:") && 
      aiResponse.includes("Ingredients:") && 
      (aiResponse.includes("Instructions:") || aiResponse.includes("Steps:"));
    
    let recipeData = null;
    if (containsCompleteRecipe) {
      // Parse the response to extract structured recipe data
      recipeData = parseRecipeFromText(aiResponse);
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
  const recipe = {};
  
  // Extract title - clean any Markdown formatting
  const titleMatch = text.match(/Title:?\s*([^\n]+)/i);
  if (titleMatch) {
    recipe.title = titleMatch[1].trim()
      .replace(/\*\*/g, '')  // Remove bold formatting
      .replace(/\*/g, '')    // Remove italic formatting
      .replace(/^#+\s*/, '') // Remove heading markers
      .trim();
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
  if (descriptionMatch) {
    recipe.description = descriptionMatch[1].trim()
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();
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
  if (ingredientsMatch) {
    const ingredientsText = ingredientsMatch[1].trim();
    const ingredientItems = ingredientsText.split('\n')
      .map(line => line.trim())
      // Identify lines that look like list items or numbered items and exclude section headers
      .filter(line => {
        // Skip lines that look like headers (e.g. Instructions:, Steps:)
        if (line.match(/^[A-Z][a-z]+:$/)) return false;
        
        // Include lines that start with list markers or numbers
        return line.match(/^[-•*]|\d+\./) || line.length > 0;
      })
      .map(line => {
        // Remove list markers and clean formatting
        return line.replace(/^[-•*]\s*|\d+\.\s*/, '')
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .trim();
      }); 
    
    // Parse ingredients into structured format if possible
    recipe.ingredients = ingredientItems
      .filter(item => item.length > 0)
      .map(item => {
        // Try to extract quantity and name
        const matches = item.match(/^([\d\s\/\.\-,]+\s*(?:cups?|tablespoons?|tbsp|tbs|teaspoons?|tsp|pounds?|lbs?|ounces?|oz|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|pinch(?:es)?|dash(?:es)?|to taste|handful|[A-Za-z]+)?)\s+(.*)/i);
        
        if (matches) {
          return {
            quantity: matches[1].trim(),
            name: matches[2].trim()
          };
        } else {
          return {
            quantity: '',
            name: item
          };
        }
      });
  }
  
  // Extract instructions/steps
  let stepsText = '';
  const instructionsMatch = text.match(/Instructions:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*[A-Za-z]+:|$)/i);
  const stepsMatch = text.match(/Steps:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*[A-Za-z]+:|$)/i);
  
  if (instructionsMatch) {
    stepsText = instructionsMatch[1].trim();
  } else if (stepsMatch) {
    stepsText = stepsMatch[1].trim();
  }
  
  if (stepsText) {
    const stepLines = stepsText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Group step lines that belong together
    const stepItems = [];
    let currentStep = '';
    
    for (const line of stepLines) {
      // If the line starts with a number or list marker, it's likely a new step
      if (line.match(/^\d+\.|\d+\)|\*|-|•/)) {
        if (currentStep) {
          stepItems.push(currentStep.trim());
          currentStep = '';
        }
        // Remove the marker and add to current step
        currentStep = line.replace(/^\d+\.|\d+\)|\*|-|•\s*/, '');
      }
      // Exclude metadata lines like "Cooking time:" or "Servings:"
      else if (!line.match(/^\*\*(?:Cooking time|Servings|Prep time|Cook time):/)) {
        // If it's a continuation of a step
        if (currentStep) {
          currentStep += ' ' + line;
        } else {
          currentStep = line;
        }
      }
    }
    
    if (currentStep) {
      stepItems.push(currentStep.trim());
    }
    
    // Clean up formatting in steps
    recipe.steps = stepItems
      .map(step => step
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .trim())
      .filter(step => {
        // Final filtering to remove non-instruction content
        return !step.match(/Enjoy your meal|serving suggestion|bon appétit/i);
      });
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
  
  return recipe;
}

/**
 * Process pasted recipe content
 * Analyzes raw text (typically copy/pasted from a recipe website) and extracts recipe information
 */
async function handlePastedRecipeContent(content, apiKey) {
  try {
    console.log("Handling pasted recipe content...");
    
    // Create a prompt for the OpenAI API to extract recipe information from pasted content
    const prompt = `
    You are a recipe extraction assistant. Extract the complete recipe from the following content which was copy/pasted from a recipe website.
    Format your response as a complete, detailed recipe with the following structure:
    
    Title: [Recipe Title]
    Subtitle: [Brief description or tagline, if present]
    Description: [Full description, if present]
    Author: [Recipe author, if present]
    Source: [Original source or website name, if present]
    Yield: [Number of servings or quantity]
    Time: [Preparation time, cooking time, total time]
    Ingredients:
    - [List each ingredient with quantity and preparation method]
    
    Instructions:
    1. [Step 1]
    2. [Step 2]
    ...
    
    Notes: [Any additional notes or tips]
    Tags: [Comma-separated list of recipe categories or keywords]
    
    Don't include any field if there's no corresponding information in the content.
    
    Copy/pasted Content:
    ${content}
    `;
    
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are a precise recipe extraction assistant that can parse recipes from copy/pasted website content. Extract only the recipe details in the exact format requested, with nothing else added."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3 // Lower temperature for more consistent results
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    const aiResponse = openaiResponse.data.choices[0].message.content;
    
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
