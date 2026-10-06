'use client';

import { useRef, useState, FormEvent, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Send, Mic, Paperclip, Sparkles, Loader2 } from 'lucide-react';

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
    <div className="border-t border-border bg-background/50 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4">
        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 animate-fade-in" role="listbox" aria-label="Suggested questions">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 border border-border/50 rounded-lg hover:bg-muted hover:text-foreground transition-colors"
                role="option"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div className="relative">
          <div className="relative flex items-end gap-2">
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
                'flex-1 min-h-[44px] max-h-[200px] pr-16 py-3 px-4',
                'bg-background border border-border rounded-xl',
                'text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                'resize-none transition-colors',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              aria-label="Question input"
              aria-describedby="input-hint"
            />
            <div className="flex items-center gap-1 p-1.5">
              <button
                type="button"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Attach file"
                disabled={disabled}
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Voice input"
                disabled={disabled}
              >
                <Mic className="h-5 w-5" />
              </button>
              <button
                type="submit"
                disabled={!value.trim() || disabled}
                className={cn(
                  'p-2 rounded-lg transition-colors flex items-center justify-center',
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  value.trim() && !disabled && 'animate-pulse-soft'
                )}
                aria-label="Send question"
              >
                {disabled ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
          </div>
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