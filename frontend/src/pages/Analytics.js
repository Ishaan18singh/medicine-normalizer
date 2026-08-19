import React, { useState, useEffect } from 'react';
import { Search, BarChart3, TrendingUp, Activity } from 'lucide-react';
import { Card } from '../components/ui/card';
import Sidebar from '../components/layout/Sidebar';
import { toast } from 'sonner';
import axios from 'axios';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

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