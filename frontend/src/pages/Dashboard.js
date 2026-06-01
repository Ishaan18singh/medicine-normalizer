import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Pill, LogOut, Menu, Search, FileText, BarChart3, Code, Camera } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const Sidebar = ({ currentPage }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { icon: Search, label: 'Dashboard', path: '/dashboard' },
    { icon: FileText, label: 'Bulk Processing', path: '/bulk' },
    { icon: Camera, label: 'Scanner', path: '/scanner' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics', adminOnly: true },
    { icon: Code, label: 'API', path: '/api-playground' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 bg-card p-2 rounded-md border border-border"
        onClick={() => setMobileOpen(!mobileOpen)}
        data-testid="mobile-menu-toggle"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col transition-transform ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        data-testid="sidebar"
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Pill className="h-6 w-6 text-primary" strokeWidth={1.5} />
            <span className="text-lg font-bold text-primary" style={{ fontFamily: 'Outfit' }}>MedNormalize</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.role}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            if (item.adminOnly && user?.role !== 'admin') return null;
            const Icon = item.icon;
            const isActive = currentPage === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground'
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start gap-3 border-input hover:bg-accent"
            data-testid="logout-button"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.5} />
            Logout
          </Button>
        </div>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
};

export default function Dashboard() {
  const location = useLocation();
  const [medicine, setMedicine] = useState(location.state?.demoInput || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const handleNormalize = React.useCallback(async () => {

    if (!medicine.trim()) {
      toast.error('Please enter a medicine name');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/normalize`,
        { medicine },
        { withCredentials: true }
      );
      setResult(data);
      toast.success('Medicine normalized successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to normalize medicine');
    } finally {
      setLoading(false);
    }

  }, [medicine, BACKEND_URL]);

  useEffect(() => {
    if (location.state?.demoInput) {
      handleNormalize();
    }
  }, [location.state?.demoInput, handleNormalize]);

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBg = (confidence) => {
    if (confidence >= 0.9) return 'bg-green-600';
    if (confidence >= 0.7) return 'bg-yellow-600';
    return 'bg-red-600';
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
              <Input
                id="medicine-input"
                placeholder="Enter medicine name (e.g., crocin, glucophage, lisinopril)..."
                value={medicine}
                onChange={(e) => setMedicine(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNormalize()}
                className="bg-background border border-input focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-md"
                data-testid="medicine-search-input"
              />
              <Button
                onClick={handleNormalize}
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md px-6"
                data-testid="normalize-submit-button"
              >
                {loading ? 'Processing...' : 'Normalize'}
              </Button>
            </div>
          </Card>

          {/* Results Section */}
          {result && (
            <div className="space-y-4" data-testid="results-section">
              {/* Main Result */}
              <Card className="bg-card border border-border shadow-sm rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Normalized Name</p>
                    <h3 className="text-2xl font-semibold text-primary capitalize" data-testid="normalized-result">{result.normalized}</h3>
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
                    <p className="text-sm font-medium">Confidence Score</p>
                    <span className={`text-sm font-mono font-semibold ${getConfidenceColor(result.confidence)}`} data-testid="confidence-score-display">
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={result.confidence * 100} className="h-2" indicatorClassName={getConfidenceBg(result.confidence)} />
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
                      <div
                        key={idx}
                        className="px-4 py-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                        data-testid={`alternatives-list-item-${idx}`}
                      >
                        <p className="text-sm font-medium capitalize">{alt}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
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