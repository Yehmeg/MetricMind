'use client';

import { useRef, useState, FormEvent, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Send, Loader2 } from 'lucide-react';

interface ConversationInputProps {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  placeholder?: string;
  suggestions?: string[];
}

export function ConversationInput({
  onSubmit,
  disabled = false,
  placeholder = 'Ask a business question...',
  suggestions = [],
}: ConversationInputProps) {
  const [value, setValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [height, setHeight] = useState(44);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSubmit(value.trim());
    setValue('');
    setShowSuggestions(false);
    setHeight(44);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    setShowSuggestions(newValue.length === 0);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 44), 200);
    setHeight(newHeight);
    textarea.style.height = `${newHeight}px`;
  };

  const handleSuggestionClick = (suggestion: string) => {
    setValue(suggestion);
    textareaRef.current?.focus();
    setShowSuggestions(false);
  };

  return (
    <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-4xl px-4 py-4 md:px-6">
        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 animate-fade-in" aria-label="Suggested questions">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 border border-border/50 rounded-lg hover:bg-muted hover:text-foreground transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div className="relative flex items-end">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            style={{ height: `${height}px` }}
            className={cn(
              'flex-1 min-h-[44px] max-h-[200px] py-3 pl-4 pr-14',
              'bg-background border border-border rounded-xl',
              'text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
              'resize-none transition-colors',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            aria-label="Question input"
            aria-describedby="input-hint"
          />
          <button
            type="submit"
            disabled={!value.trim() || disabled}
            className={cn(
              'absolute bottom-1.5 right-1.5 p-2 rounded-lg transition-colors flex items-center justify-center',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="Send question"
          >
            {disabled ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>

        <p id="input-hint" className="mt-2 text-center text-xs text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Enter</kbd> to send,{' '}
          <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Shift+Enter</kbd> for new line
          {suggestions.length > 0 && ' • Click a suggestion to start'}
        </p>
      </form>
    </div>
  );
}