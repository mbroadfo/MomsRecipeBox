import React, { useState, useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { getApiUrl } from '../../../config/environment.js';
// Importing types from useRecipe is unnecessary for this component

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Simple Markdown to HTML converter for chat messages
function renderMarkdown(text: string): string {
  return text
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Lists: * item or - item
    .replace(/^[*-]\s+(.+)$/gm, '<li>$1</li>')
    // Code: `code`
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Line breaks
    .replace(/\n/g, '<br/>');
}

interface AIProvider {
  name: string;
  key: string;
  status: 'available' | 'rate-limited' | 'unavailable';
  rateLimitExpiry?: number | null;
}

interface ParsedRecipe {
  title?: string;
  subtitle?: string;
  description?: string;
  author?: string;
  source?: string;
  yield?: string;
  time?: { prep?: string; cook?: string; total?: string };
  ingredients?: { quantity?: string; name?: string }[];
  steps?: string[];
  tags?: string[];
  notes?: string;
  imageUrl?: string; // Added for image URL support
}

interface RecipeAIChatProps {
  onApplyRecipe: (recipe: ParsedRecipe) => void;
  isVisible: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentRecipe?: Record<string, any> | null;
  mode?: 'view' | 'edit' | 'new';
  onClose?: () => void; // Optional close button handler
}

export const RecipeAIChat: React.FC<RecipeAIChatProps> = ({ onApplyRecipe, isVisible, currentRecipe, mode = 'new', onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('auto');
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Auth0 hook for authentication
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  
  // Start with clean conversation - no initial greeting
  // User can start chatting immediately

  // Fetch available AI providers
  useEffect(() => {
    const fetchProviders = async () => {
      if (!isAuthenticated) return;
      
      try {
        setProvidersLoading(true);
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: 'https://momsrecipebox/api',
          },
        });
        
        const response = await fetch(getApiUrl('ai/providers'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.providers) {
            setAvailableProviders(data.providers);
            
            // If the currently selected model is not available, reset to auto
            const selectedProviderAvailable = data.providers.some(
              (p: AIProvider) => p.key === selectedModel && p.status === 'available'
            );
            
            if (selectedModel !== 'auto' && !selectedProviderAvailable) {
              setSelectedModel('auto');
            }
          }
        } else {
          console.error('Failed to fetch AI providers');
        }
      } catch (error) {
        console.error('Error fetching AI providers:', error);
      } finally {
        setProvidersLoading(false);
      }
    };

    if (isVisible) {
      fetchProviders();
    }
  }, [isVisible, selectedModel, isAuthenticated, getAccessTokenSilently]);

  // Scroll to bottom of chat when messages update
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle user sending a message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!userInput.trim()) return;
    
    // Add user message to chat
    const newMessage: Message = { role: 'user', content: userInput };
    setMessages(prev => [...prev, newMessage]);
    
    // Clear input field
    setUserInput('');
    
    try {
      setIsLoading(true);
      setError(null);
      
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: 'https://momsrecipebox/api',
        },
      });
      
      // All requests now go to the chat endpoint which handles URLs automatically
      const endpoint = getApiUrl('ai/chat');
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          messages: messages,  // The backend expects 'messages' instead of 'history'
          user_id: 'demo-user', // Simplified user ID for demo purposes
          model: selectedModel, // Send the selected model to the backend
          currentRecipe: currentRecipe || undefined, // Include current recipe for context
          mode: mode // Include mode to guide AI behavior
        }),
      });
      
      const data = await response.json();
      
      // Special handling for rate limiting (429)
      if (response.status === 429) {
        console.log('Rate limit reached:', data);
        
        // Display a user-friendly message about rate limiting
        const rateLimitMessage = `The AI service is currently rate limited. ${
          data.retryAfter ? `Please try again in ${data.retryAfter} seconds.` : 'Please try again later.'
        }`;
        
        setMessages(prev => [
          ...prev, 
          { role: 'assistant', content: rateLimitMessage }
        ]);
        
        // If we still have some partial data (like an image), we can use it
        if (data.recipeData || data.imageUrl) {
          setMessages(prev => [
            ...prev, 
            { 
              role: 'assistant', 
              content: `However, I was able to extract some information. Would you like to continue with what I have?` 
            }
          ]);
          
          // If we have partial recipe data, offer to apply it
          if (data.recipeData) {
            // Wait a moment before showing the apply option to ensure messages are read in order
            setTimeout(() => {
              setMessages(prev => [
                ...prev,
                {
                  role: 'assistant',
                  content: 'Would you like to create a basic recipe with the information I was able to gather?'
                }
              ]);
              
              // Auto-apply the partial recipe data to create a new recipe after a short delay
              setTimeout(() => handleApplyRecipe(data.recipeData), 2000);
            }, 1500);
          }
        }
        
        return; // Exit early, we've handled the rate limit case
      }
      
      // For other non-OK responses - but check if we still got recipe data
      if (!response.ok) {
        // If we got recipe data despite the error, use it
        if (data.recipeData) {
          console.warn(`⚠️ API returned ${response.status} but included recipe data, proceeding with creation`);
          setMessages(prev => [
            ...prev, 
            { 
              role: 'assistant', 
              content: `I've extracted the recipe. Creating it now...` 
            }
          ]);
          handleApplyRecipe(data.recipeData);
          return; // Exit early, we handled it
        }
        
        // Otherwise throw the error
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      // Continue with normal processing for successful responses
      
      // Add AI response to chat
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      
      // If the AI detected a complete recipe, auto-apply it to create a new recipe
      if (data.recipeData) {
        setMessages(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            content: `I've created a recipe based on your request. Creating the recipe now...` 
          }
        ]);
        
        // Auto-apply the recipe data to create a new recipe
        handleApplyRecipe(data.recipeData);
      }
    } catch (err) {
      console.error('Error in AI chat:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request. Please try again.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle applying a recipe from the AI response
  const handleApplyRecipe = (recipeData: ParsedRecipe) => {
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: 'Creating your recipe now... You will be redirected to the recipe page when it is ready.'
      }
    ]);
    
    // Call the parent component's handler to create the recipe
    onApplyRecipe(recipeData);
  };

  if (!isVisible) return null;

  return (
    <div className="recipe-ai-chat">
      <div className="recipe-ai-header-compact">
        {onClose && (
          <button 
            className="recipe-ai-close-btn"
            onClick={onClose}
            aria-label="Close AI Assistant"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
        <h3>AI Assistant</h3>
        <select 
          className="recipe-ai-model-select-compact"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={providersLoading}
          title="Select AI Model"
        >
          <option value="auto">Auto</option>
          {providersLoading ? (
            <option value="">Loading...</option>
          ) : (
            availableProviders
              .filter(provider => provider.status === 'available')
              .map(provider => (
                <option key={provider.key} value={provider.key}>
                  {provider.name}
                </option>
              ))
          )}
        </select>
      </div>

      <div className="recipe-ai-chat-container">
        <div className="recipe-ai-messages">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`recipe-ai-message ${message.role === 'assistant' ? 'recipe-ai-assistant' : 'recipe-ai-user'}`}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
            />
          ))}
          {isLoading && (
            <div className="recipe-ai-message recipe-ai-assistant recipe-ai-loading">
              <div className="recipe-ai-typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div style={{ marginLeft: "10px", fontSize: "0.9rem" }}>
                {messages.length > 0 && messages[messages.length - 1].content.includes("Creating your recipe") 
                  ? "Creating recipe..." 
                  : "Thinking..."}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {error && <div className="recipe-ai-error">{error}</div>}

        <form onSubmit={handleSendMessage} className="recipe-ai-input-form">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type a recipe idea, paste a URL, or describe ingredients..."
            className="recipe-ai-input"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="recipe-ai-send-button"
            disabled={isLoading || !userInput.trim()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};
