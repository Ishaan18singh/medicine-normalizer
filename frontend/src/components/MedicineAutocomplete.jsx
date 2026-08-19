import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';
import { Input } from './ui/input';

const DEBOUNCE_MS = 200;

export default function MedicineAutocomplete({
  id = 'medicine-input',
  value,
  onChange,
  onSubmit,
  placeholder,
  className = '',
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const { data } = await axios.get(`${BACKEND_URL}/api/suggest`, {
          params: { q: value.trim() },
          withCredentials: true,
        });
        if (requestId !== requestIdRef.current) return; // stale response, ignore
        setSuggestions(data.suggestions || []);
        setOpen((data.suggestions || []).length > 0);
        setHighlighted(-1);
      } catch {
        // Suggestions are a nice-to-have; a failed fetch shouldn't disrupt typing.
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [value, BACKEND_URL]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectSuggestion = (s) => {
    onChange(s.query);
    setOpen(false);
    setSuggestions([]);
    onSubmit?.(s.query);
  };

  const handleKeyDown = (e) => {
    if (open && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlighted((h) => (h + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlighted((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key === 'Enter' && highlighted >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[highlighted]);
        return;
      }
    }
    if (e.key === 'Enter') {
      setOpen(false);
      onSubmit?.(value);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
        className={className}
        data-testid="medicine-search-input"
      />
      {open && suggestions.length > 0 && (
        <div
          className="absolute z-20 mt-1 w-full bg-popover border border-border rounded-md shadow-md overflow-hidden max-h-72 overflow-y-auto"
          data-testid="autocomplete-dropdown"
        >
          {suggestions.map((s, idx) => (
            <button
              key={`${s.query}-${idx}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectSuggestion(s)}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                idx === highlighted ? 'bg-muted' : 'hover:bg-muted/60'
              }`}
              data-testid={`autocomplete-item-${idx}`}
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
              <span className="capitalize truncate">{s.query}</span>
              {s.kind !== 'generic' && (
                <span className="ml-auto text-xs text-muted-foreground capitalize shrink-0">
                  → {s.generic}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
