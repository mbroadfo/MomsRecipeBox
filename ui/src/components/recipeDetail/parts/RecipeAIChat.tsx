import React, { useState, useEffect, useRef } from 'react';
// Importing types from useRecipe is unnecessary for this component

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ParsedRecipe {
  title?: string;
  subtitle?: string;
  description?: string;
  author?: string;
  source?: string;
  yield?: string;
  time?: any;
  ingredients?: any[];
  steps?: string[];
  tags?: string[];
  notes?: string;
  imageUrl?: string; // Added for image URL support
}

interface RecipeAIChatProps {
  onApplyRecipe: (recipe: ParsedRecipe) => void;
  isVisible: boolean;
}

export const RecipeAIChat: React.FC<RecipeAIChatProps> = ({ onApplyRecipe, isVisible }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Add initial greeting when the component mounts
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `Hello! I'm your recipe creation assistant. I can help you:

1. Build a recipe from scratch by describing what you want to make
2. Extract a recipe from a URL you paste
3. Process recipe content you copy/paste directly from a website
4. Create a recipe based on ingredients you have
5. Adapt existing recipes with modifications

Simply type your request or paste a recipe or URL to get started!`
      }
    ]);
  }, []);

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
      
      // All requests now go to the chat endpoint which handles URLs automatically
      const endpoint = '/api/ai/chat';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          messages: messages,  // The backend expects 'messages' instead of 'history'
          user_id: (window as any).currentUser?.id || (window as any).currentUserId || 'demo-user'
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
      
      // For other non-OK responses
      if (!response.ok) {
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

  // Handle example prompts
  const handleExampleClick = (example: string) => {
    setUserInput(example);
  };

  // Show example prompts for users
  const examplePrompts = [
    "https://www.example.com/my-recipe",
    "Create a recipe for chocolate chip cookies",
    "I have chicken, rice, and broccoli. What can I make?",
    "Paste your recipe content here"
  ];

  if (!isVisible) return null;

  return (
    <div className="recipe-ai-chat">
      <div className="recipe-ai-header">
        <h2>Recipe AI Assistant</h2>
        <p className="recipe-ai-subtitle">
          Let me help you create a recipe by chatting or extracting from a URL
        </p>
      </div>

      <div className="recipe-ai-chat-container">
        <div className="recipe-ai-messages">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`recipe-ai-message ${message.role === 'assistant' ? 'recipe-ai-assistant' : 'recipe-ai-user'}`}
            >
              {message.content.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
            </div>
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
            placeholder="Ask me to create a recipe or paste a URL..."
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

        <div className="recipe-ai-examples">
          <p className="recipe-ai-examples-title">Try asking:</p>
          <div className="recipe-ai-example-chips">
            {examplePrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(prompt)}
                className="recipe-ai-example-chip"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
