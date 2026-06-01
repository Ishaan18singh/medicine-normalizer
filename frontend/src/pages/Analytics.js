import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Pill, LogOut, Menu, Search, FileText, BarChart3, Code, Camera, TrendingUp, Activity } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
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
      <button
        className="lg:hidden fixed top-4 left-4 z-50 bg-card p-2 rounded-md border border-border"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="h-6 w-6" />
      </button>
      <div className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Pill className="h-6 w-6 text-primary" strokeWidth={1.5} />
            <span className="text-lg font-bold text-primary" style={{ fontFamily: 'Outfit' }}>MedNormalize</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{user?.name}</p>
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
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <Button onClick={handleLogout} variant="outline" className="w-full justify-start gap-3 border-input hover:bg-accent">
            <LogOut className="h-5 w-5" strokeWidth={1.5} />
            Logout
          </Button>
        </div>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
};

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const fetchAnalytics = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/analytics`, { withCredentials: true });
      setAnalytics(data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentPage="/analytics" />
      <main className="flex-1 p-4 md:p-6 lg:ml-0" data-testid="analytics-main">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2" style={{ fontFamily: 'Outfit' }}>
              Analytics Dashboard
            </h1>
            <p className="text-base text-secondary-foreground">Track usage patterns and system performance</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-card border border-border shadow-sm rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Total Searches</p>
                      <p className="text-3xl font-bold text-foreground">{analytics.total_searches}</p>
                    </div>
                    <div className="bg-primary/10 rounded-md p-3">
                      <Search className="h-6 w-6 text-primary" strokeWidth={1.5} />
                    </div>
                  </div>
                </Card>

                <Card className="bg-card border border-border shadow-sm rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Avg Confidence</p>
                      <p className="text-3xl font-bold text-foreground">{(analytics.avg_confidence * 100).toFixed(1)}%</p>
                    </div>
                    <div className="bg-primary/10 rounded-md p-3">
                      <TrendingUp className="h-6 w-6 text-primary" strokeWidth={1.5} />
                    </div>
                  </div>
                </Card>

                <Card className="bg-card border border-border shadow-sm rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Error Rate</p>
                      <p className="text-3xl font-bold text-foreground">{analytics.error_rate.toFixed(1)}%</p>
                    </div>
                    <div className="bg-primary/10 rounded-md p-3">
                      <Activity className="h-6 w-6 text-primary" strokeWidth={1.5} />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Top Medicines */}
              <Card className="bg-card border border-border shadow-sm rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Most Searched Medicines</h3>
                <div className="space-y-3">
                  {analytics.top_medicines.map((item, idx) => (
                    <div key={item._id} className="flex items-center justify-between px-4 py-3 rounded-md bg-muted/30">
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-muted-foreground w-8">#{idx + 1}</span>
                        <span className="text-sm font-medium capitalize">{item._id}</span>
                      </div>
                      <span className="text-sm font-mono text-muted-foreground">{item.count} searches</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ) : (
            <Card className="bg-card border border-border shadow-sm rounded-lg p-12 text-center">
              <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" strokeWidth={1} />
              <p className="text-muted-foreground">No analytics data available</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}