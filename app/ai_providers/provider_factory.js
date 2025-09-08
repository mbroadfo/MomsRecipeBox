import { OpenAIProvider } from './openai_provider.js';
import { GoogleGeminiProvider } from './google_provider.js';
import { GroqProvider } from './groq_provider.js';
import { AnthropicProvider } from './anthropic_provider.js';
import { DeepSeekProvider } from './deepseek_provider.js';

/**
 * AI Provider Factory
 * Creates and returns the appropriate AI provider based on user selection
 * or availability of API keys
 */
export class AIProviderFactory {
  // Track rate-limited providers to avoid retrying them immediately
  static rateLimitedProviders = new Map();
  
  // Provider instances cache
  static providers = null;

  /**
   * Initialize all providers
   * @returns {Object} Map of provider key to provider instance
   */
  static initializeProviders() {
    if (!this.providers) {
      this.providers = {
        google: new GoogleGeminiProvider(),
        openai: new OpenAIProvider(),
        groq: new GroqProvider(),
        anthropic: new AnthropicProvider(),
        deepseek: new DeepSeekProvider(),
      };
    }
    return this.providers;
  }
  
  /**
   * Get a list of all available providers that aren't rate limited
   * @returns {Object[]} Array of provider information objects with name, key, and available status
   */
  static getAvailableProviders() {
    const providers = this.initializeProviders();
    const providerInfo = [];
    
    for (const [key, provider] of Object.entries(providers)) {
      const isAvailable = provider.isAvailable();
      const isRateLimited = this.isRateLimited(key);
      let status = 'unavailable';
      
      if (isAvailable) {
        status = isRateLimited ? 'rate-limited' : 'available';
      }
      
      providerInfo.push({
        name: provider.getConfig().name,
        key,
        status,
        rateLimitExpiry: isRateLimited ? this.rateLimitedProviders.get(key) : null
      });
    }
    
    return providerInfo;
  }

  /**
   * Mark a provider as rate limited
   * @param {string} providerKey - The provider key (e.g., 'google')
   * @param {number} retryAfter - Seconds to wait before retrying (default: 60)
   */
  static markRateLimited(providerKey, retryAfter = 60) {
    const expiresAt = Date.now() + (retryAfter * 1000);
    this.rateLimitedProviders.set(providerKey, expiresAt);
    console.log(`Provider ${providerKey} marked as rate-limited for ${retryAfter} seconds`);
  }

  /**
   * Check if a provider is currently rate limited
   * @param {string} providerKey - The provider key to check
   * @returns {boolean} True if the provider is rate limited
   */
  static isRateLimited(providerKey) {
    if (!this.rateLimitedProviders.has(providerKey)) {
      return false;
    }
    
    const expiresAt = this.rateLimitedProviders.get(providerKey);
    // If the rate limit has expired, remove it from the map
    if (Date.now() > expiresAt) {
      this.rateLimitedProviders.delete(providerKey);
      return false;
    }
    
    return true;
  }

  /**
   * Get a provider based on user selection or auto-select one
   * @param {string} selectedModel - The model selected by the user (or 'auto' for auto-selection)
   * @returns {BaseAIProvider} An instance of the selected AI provider
   * @throws {Error} If the selected provider is rate limited or no providers are available
   */
  static getProvider(selectedModel = 'auto') {
    // Initialize all providers
    const providers = this.initializeProviders();
    
    // Define the order of preference for auto selection
    const providerOrder = ['google', 'openai', 'groq', 'anthropic', 'deepseek'];

    // If a specific model is requested and it's available, check if it's rate limited
    if (selectedModel !== 'auto' && providers[selectedModel]?.isAvailable()) {
      if (this.isRateLimited(selectedModel)) {
        // Get time until rate limit expires
        const expiresAt = this.rateLimitedProviders.get(selectedModel);
        const timeUntilExpiry = Math.ceil((expiresAt - Date.now()) / 1000);
        
        // Throw an error with information about the rate limit
        throw new Error(`The selected model (${selectedModel}) is currently rate limited. Please try again in ${timeUntilExpiry} seconds or select a different model.`);
      }
      
      console.log(`Using explicitly selected model: ${selectedModel}`);
      return providers[selectedModel];
    }

    // For auto selection, find the first available non-rate-limited provider
    if (selectedModel === 'auto') {
      console.log('Auto-selecting model based on available API keys');
      
      // Collect all available non-rate-limited providers
      const availableProviders = [];
      for (const providerKey of providerOrder) {
        const provider = providers[providerKey];
        if (provider.isAvailable() && !this.isRateLimited(providerKey)) {
          availableProviders.push({ key: providerKey, provider });
        }
      }
      
      // If we found at least one available provider, use it
      if (availableProviders.length > 0) {
        const { key, provider } = availableProviders[0];
        console.log(`Auto-selected model: ${provider.getConfig().name}`);
        return provider;
      }
      
      // If all providers are rate limited, throw an error
      const rateLimitedProviders = providerOrder.filter(key => 
        providers[key].isAvailable() && this.isRateLimited(key)
      );
      
      if (rateLimitedProviders.length > 0) {
        throw new Error('All available AI providers are currently rate limited. Please try again later or select a specific model.');
      }
    }

    // If no providers are available or the selected model doesn't exist
    throw new Error('No AI providers available. Please check API keys in environment variables or select a valid model.');
  }
  
  /**
   * Record a rate limit for a provider without providing fallback
   * @param {string} providerKey - The key of the provider that hit a rate limit
   * @param {number} retryAfter - Seconds to wait before retrying (from response headers)
   */
  static recordRateLimit(providerKey, retryAfter = 60) {
    // Just mark the provider as rate limited
    this.markRateLimited(providerKey, retryAfter);
    console.log(`Provider ${providerKey} rate-limited for ${retryAfter} seconds. No fallback will be used.`);
  }
}
