import React from 'react';
import { RecipeAIChat } from './RecipeAIChat';
import './AIAssistantPanel.css';

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
  imageUrl?: string;
}

interface AIAssistantPanelProps {
  isVisible: boolean;
  mode: 'new' | 'edit' | 'view';
  onToggleVisibility: () => void;
  onApplyRecipe: (recipe: ParsedRecipe) => void;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  isVisible,
  mode: _mode, // Available for future mode-specific behavior
  onToggleVisibility,
  onApplyRecipe,
}) => {
  // Available in all modes now (Phase 4)
  // No longer restricted to isNew only

  return (
    <>
      {/* Mobile backdrop - click to close */}
      {isVisible && (
        <div 
          className="ai-assistant-backdrop"
          onClick={onToggleVisibility}
          style={{
            display: 'none', // Hidden on desktop
          }}
        />
      )}
      
      <div className="ai-assistant-panel" style={{ marginBottom: '1rem' }}>
        {/* Toggle Button */}
        <button 
          className="recipe-ai-toggle" 
          onClick={onToggleVisibility}
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            background: '#f9fafb',
            cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: '#374151',
          width: '100%',
          marginBottom: isVisible ? '1rem' : '0',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f3f4f6';
          e.currentTarget.style.borderColor = '#d1d5db';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#f9fafb';
          e.currentTarget.style.borderColor = '#e5e7eb';
        }}
      >
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          {isVisible ? (
            <>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </>
          ) : (
            <>
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </>
          )}
        </svg>
        {isVisible ? "Hide Recipe AI Assistant" : "Show Recipe AI Assistant"}
      </button>

      {/* AI Chat Container */}
      {isVisible && (
        <div 
          className="recipe-ai-container"
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            background: '#ffffff',
            overflow: 'hidden',
          }}
        >
          <RecipeAIChat 
            isVisible={isVisible} 
            onApplyRecipe={onApplyRecipe}
          />
        </div>
      )}
    </div>
    </>
  );
};