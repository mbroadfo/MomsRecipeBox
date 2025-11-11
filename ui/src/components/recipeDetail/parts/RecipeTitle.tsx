import React, { useRef, useEffect } from 'react';

interface Props {
  title: string;
  editing: boolean;
  onTitleChange: (v: string) => void;
}

export const RecipeTitle: React.FC<Props> = ({ 
  title, 
  editing, 
  onTitleChange
}) => {
  const h1Ref = useRef<HTMLHeadingElement | null>(null);
  
  // Reset the ref when editing changes
  useEffect(() => {
    if (!editing) {
      // Clear the ref when not editing so it will reinitialize on next edit
      h1Ref.current = null;
    }
  }, [editing]);

  return (
    <>
      <style>{`
        h1[data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          font-style: italic;
        }
      `}</style>
      
      {!editing ? (
        <h1 
          className="recipe-title"
          style={{ 
            textAlign: 'center',
            marginBottom: '0.5rem',
            fontSize: 'clamp(1.5rem, 4vw + 0.5rem, 2.25rem)',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            lineHeight: 1.1,
            background: 'linear-gradient(90deg,#1e3a8a,#1d4ed8,#2563eb)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            wordWrap: 'break-word',
            hyphens: 'auto'
          }}
        >
          {title}
        </h1>
      ) : (
        <div
          ref={(el) => {
            if (el && !h1Ref.current) {
              h1Ref.current = el;
              
              // Initialize the content of the element when first rendered
              el.textContent = title || '';
              
              // Focus and set cursor at the beginning if empty or at the end if there's content
              el.focus();
              const range = document.createRange();
              range.selectNodeContents(el);
              // If title is empty, collapse to start position for easier typing
              range.collapse(!title);
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
          }}
          className="recipe-title-edit"
          style={{ 
            margin: '0 0 0.5rem 0',
            textAlign: 'center',
            fontSize: 'clamp(1.5rem, 4vw + 0.5rem, 2.25rem)',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            lineHeight: 1.1,
            outline: 'none',
            cursor: 'text', 
            userSelect: 'text', 
            border: '2px dashed rgba(37, 99, 235, 0.5)', 
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#1e3a8a',
            background: 'rgba(255, 255, 255, 0.9)',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)',
            wordWrap: 'break-word',
            hyphens: 'auto'
          }}
          contentEditable={true}
          suppressContentEditableWarning
          data-placeholder="Enter recipe title"
          data-no-autofill="true"
          data-form-type="other"
          data-lpignore="true"
          onInput={(e) => {
            // Simply update the title value without messing with the DOM
            onTitleChange((e.target as HTMLElement).innerText);
          }}
          aria-label="Recipe Title"
        />
      )}
    </>
  );
};