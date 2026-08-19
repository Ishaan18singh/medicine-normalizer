import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Pill, Search, Copy, Check, BadgeCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import Sidebar from '../components/layout/Sidebar';
import MedicineAutocomplete from '../components/MedicineAutocomplete';
import useRecentSearches from '../hooks/useRecentSearches';
import useColdStartHint from '../hooks/useColdStartHint';
import { toast } from 'sonner';
import axios from 'axios';

function confidenceLabel(confidence) {
  if (confidence >= 0.95) return 'Exact match';
  if (confidence >= 0.8) return 'Likely match';
  if (confidence >= 0.6) return 'Possible match, please verify';
  return 'Uncertain, please verify';
}

function confidenceColor(confidence) {
  if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
  if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function confidenceBg(confidence) {
  if (confidence >= 0.8) return 'bg-green-600';
  if (confidence >= 0.6) return 'bg-yellow-600';
  return 'bg-red-600';
}

export default function Dashboard() {
  const location = useLocation();
  const [medicine, setMedicine] = useState(location.state?.demoInput || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const { recent, addSearch, clearSearches } = useRecentSearches();
  const showColdStartHint = useColdStartHint(loading);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const handleNormalize = React.useCallback(async (term) => {
    const query = (term ?? medicine).trim();
    if (!query) {
      toast.error('Please enter a medicine name');
      return;
    }

    setLoading(true);
    setCopied(false);
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/normalize`,
        { medicine: query },
        { withCredentials: true }
      );
      setResult(data);
      addSearch(query);
      if (data.type !== 'unknown') {
        toast.success('Medicine normalized successfully!');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to normalize medicine');
    } finally {
      setLoading(false);
    }
  }, [medicine, BACKEND_URL, addSearch]);

  useEffect(() => {
    if (location.state?.demoInput) {
      handleNormalize(location.state.demoInput);
    }
    if (location.state?.focusSearch) {
      document.getElementById('medicine-input')?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchFor = (term) => {
    setMedicine(term);
    handleNormalize(term);
  };

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.normalized).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentPage="/dashboard" />

      <main className="flex-1 p-4 md:p-6 lg:ml-0" data-testid="dashboard-main">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2" style={{ fontFamily: 'Outfit' }}>Medicine Normalization</h1>
            <p className="text-base text-secondary-foreground">Enter a medicine name to normalize and find alternatives</p>
          </div>

          {/* Input Section */}
          <Card className="bg-card border border-border shadow-sm rounded-lg p-6 mb-6" data-testid="normalize-input-card">
            <Label htmlFor="medicine-input" className="text-sm font-medium mb-3 block">Medicine Name</Label>
            <div className="flex gap-3">
              <MedicineAutocomplete
                value={medicine}
                onChange={setMedicine}
                onSubmit={(term) => handleNormalize(term)}
                placeholder="Enter medicine name (e.g., crocin, glucophage, lisinopril)..."
                className="bg-background border border-input focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-md"
              />
              <Button
                onClick={() => handleNormalize()}
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md px-6"
                data-testid="normalize-submit-button"
              >
                {loading ? 'Processing...' : 'Normalize'}
              </Button>
            </div>

            {showColdStartHint && (
              <p className="text-xs text-muted-foreground mt-3" data-testid="cold-start-hint">
                Still working — the server sleeps after inactivity and can take up to a minute to wake up.
              </p>
            )}

            {recent.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Recent searches</p>
                  <button
                    onClick={clearSearches}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="clear-recent-searches"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2" data-testid="recent-searches-list">
                  {recent.map((term) => (
                    <button
                      key={term}
                      onClick={() => searchFor(term)}
                      className="px-3 py-1 rounded-full text-xs bg-muted hover:bg-muted/70 text-foreground capitalize transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Results Section */}
          {result && result.type !== 'unknown' && (
            <div className="space-y-4" data-testid="results-section">
              {/* Main Result */}
              <Card className="bg-card border border-border shadow-sm rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Normalized Name</p>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-semibold text-primary capitalize" data-testid="normalized-result">{result.normalized}</h3>
                      <button
                        onClick={copyResult}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy normalized name"
                        data-testid="copy-result-button"
                      >
                        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Type</p>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-secondary/20 text-secondary-foreground capitalize">
                      {result.type}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-sm font-medium ${confidenceColor(result.confidence)}`}>{confidenceLabel(result.confidence)}</p>
                    <span className={`text-sm font-mono font-semibold ${confidenceColor(result.confidence)}`} data-testid="confidence-score-display">
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={result.confidence * 100} className="h-2" indicatorClassName={confidenceBg(result.confidence)} />
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Original Input</p>
                  <p className="text-sm font-medium capitalize">{result.input}</p>
                </div>
              </Card>

              {/* Alternatives */}
              {result.alternatives && result.alternatives.length > 0 && (
                <Card className="bg-card border border-border shadow-sm rounded-lg p-6">
                  <h4 className="text-lg font-medium mb-4">Alternative Brands</h4>
                  <div className="space-y-2" data-testid="alternatives-list">
                    {result.alternatives.map((alt, idx) => (
                      <button
                        key={idx}
                        onClick={() => searchFor(alt.name)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                        data-testid={`alternatives-list-item-${idx}`}
                      >
                        <p className="text-sm font-medium capitalize">{alt.name}</p>
                        {alt.curated && (
                          <span
                            className="flex items-center gap-1 text-xs text-primary shrink-0 ml-2"
                            title="Well-known brand"
                          >
                            <BadgeCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {result && result.type === 'unknown' && (
            <Card className="bg-card border border-border shadow-sm rounded-lg p-12 text-center" data-testid="not-found-state">
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" strokeWidth={1} />
              <p className="text-foreground font-medium mb-1">No match found for "{result.input}"</p>
              <p className="text-muted-foreground text-sm">
                Double-check the spelling, or try just the first few letters — the search box will suggest matches as you type.
              </p>
            </Card>
          )}

          {!result && (
            <Card className="bg-card border border-border shadow-sm rounded-lg p-12 text-center">
              <Pill className="h-16 w-16 text-muted-foreground mx-auto mb-4" strokeWidth={1} />
              <p className="text-muted-foreground">Enter a medicine name above to get started</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function Label({ htmlFor, children, className = '' }) {
  return (
    <label htmlFor={htmlFor} className={`text-sm font-medium ${className}`}>
      {children}
    </label>
  );
}
