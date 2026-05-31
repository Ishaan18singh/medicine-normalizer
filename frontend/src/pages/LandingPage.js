import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pill, Search, FileText, BarChart3, Code, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [demoInput, setDemoInput] = useState('');

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="h-8 w-8 text-primary" strokeWidth={1.5} />
            <span className="text-2xl font-bold text-primary" style={{ fontFamily: 'Outfit' }}>MedNormalize AI</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Button onClick={() => navigate('/dashboard')} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md px-6 py-2" data-testid="dashboard-nav-button">
                Dashboard
              </Button>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" className="border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md px-6 py-2" data-testid="login-nav-button">Login</Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md px-6 py-2" data-testid="register-nav-button">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Bento Grid Style */}
      <section className="py-24 md:py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Left: Hero Text */}
            <div>
              <h1 className="text-5xl sm:text-6xl font-light tracking-tight leading-none text-foreground mb-6" style={{ fontFamily: 'Outfit' }} data-testid="hero-heading">
                Normalize & Find Medicine <span className="font-bold text-primary">Alternatives Instantly</span>
              </h1>
              <p className="text-base leading-relaxed text-secondary-foreground mb-8">
                AI-powered medicine name normalization using BioBERT. Handle typos, abbreviations, and brand names with confidence scoring.
              </p>
              
              {/* Live Demo Input */}
              <Card className="bg-card border border-border shadow-sm rounded-lg p-6" data-testid="demo-input-card">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Try It Now</p>
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter medicine name (e.g., crocin, glucophage)..."
                    value={demoInput}
                    onChange={(e) => setDemoInput(e.target.value)}
                    className="bg-background border border-input focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-md"
                    data-testid="demo-medicine-input"
                  />
                  <Button
                    onClick={() => {
                      if (user) {
                        navigate('/dashboard', { state: { demoInput } });
                      } else {
                        navigate('/register');
                      }
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md px-6"
                    data-testid="demo-try-button"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </Card>

              <div className="flex gap-4 mt-8">
                <Link to={user ? '/dashboard' : '/register'}>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md px-8 py-3 text-base" data-testid="get-started-cta">
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/api-playground">
                  <Button variant="outline" className="border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md px-8 py-3 text-base" data-testid="view-docs-button">
                    API Docs
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Hero Image */}
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1758691463610-3c2ecf5fb3fa?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzV8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBjbGluaWMlMjBkb2N0b3IlMjB0YWJsZXR8ZW58MHx8fHwxNzc2MjczNTEzfDA&ixlib=rb-4.1.0&q=85"
                alt="Healthcare professional using digital tablet"
                className="rounded-lg shadow-sm w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight mb-4" style={{ fontFamily: 'Outfit' }}>Powerful Features</h2>
            <p className="text-base text-secondary-foreground">Everything you need to standardize pharmaceutical data</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-card border border-border shadow-sm rounded-lg p-6 hover:border-primary/50 transition-colors">
              <div className="bg-primary/10 rounded-md w-12 h-12 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-medium mb-2">Name Normalization</h3>
              <p className="text-sm leading-normal text-muted-foreground">Handles typos, abbreviations, and brand-to-generic mapping with AI confidence scoring.</p>
            </Card>

            <Card className="bg-card border border-border shadow-sm rounded-lg p-6 hover:border-primary/50 transition-colors">
              <div className="bg-primary/10 rounded-md w-12 h-12 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-medium mb-2">Bulk Processing</h3>
              <p className="text-sm leading-normal text-muted-foreground">Upload CSV/Excel files and process thousands of medicine names in seconds.</p>
            </Card>

            <Card className="bg-card border border-border shadow-sm rounded-lg p-6 hover:border-primary/50 transition-colors">
              <div className="bg-primary/10 rounded-md w-12 h-12 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-medium mb-2">Prescription Scanner</h3>
              <p className="text-sm leading-normal text-muted-foreground">Extract medicine names from prescription images using OCR technology.</p>
            </Card>

            <Card className="bg-card border border-border shadow-sm rounded-lg p-6 hover:border-primary/50 transition-colors">
              <div className="bg-primary/10 rounded-md w-12 h-12 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-medium mb-2">Analytics Dashboard</h3>
              <p className="text-sm leading-normal text-muted-foreground">Track search patterns, error rates, and top medicines in real-time.</p>
            </Card>

            <Card className="bg-card border border-border shadow-sm rounded-lg p-6 hover:border-primary/50 transition-colors">
              <div className="bg-primary/10 rounded-md w-12 h-12 flex items-center justify-center mb-4">
                <Code className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-medium mb-2">REST API</h3>
              <p className="text-sm leading-normal text-muted-foreground">Integrate with your EHR systems using our simple REST API with JWT authentication.</p>
            </Card>

            <Card className="bg-card border border-border shadow-sm rounded-lg p-6 hover:border-primary/50 transition-colors">
              <div className="bg-primary/10 rounded-md w-12 h-12 flex items-center justify-center mb-4">
                <Pill className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-medium mb-2">Alternative Finder</h3>
              <p className="text-sm leading-normal text-muted-foreground">Discover alternative brands with the same chemical composition instantly.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-light tracking-tight leading-none mb-6" style={{ fontFamily: 'Outfit' }}>
            Ready to <span className="font-bold text-primary">Standardize</span> Your Medical Data?
          </h2>
          <p className="text-base leading-relaxed text-secondary-foreground mb-8">
            Join healthcare organizations using MedNormalize AI to improve data quality and patient safety.
          </p>
          <Link to={user ? '/dashboard' : '/register'}>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md px-10 py-4 text-lg" data-testid="bottom-cta-button">
              Start Normalizing Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>© 2026 MedNormalize AI. Powered by BioBERT and Emergent AI.</p>
        </div>
      </footer>
    </div>
  );
}