import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Pill, LogOut, Menu, Search, FileText, BarChart3, Code, Camera, Play } from 'lucide-react';
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
      <button className="lg:hidden fixed top-4 left-4 z-50 bg-card p-2 rounded-md border border-border" onClick={() => setMobileOpen(!mobileOpen)}>
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
              <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}>
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
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}
    </>
  );
};

export default function ApiPlayground() {
  const [endpoint, setEndpoint] = useState('/api/normalize');
  const [requestBody, setRequestBody] = useState('{\n  "medicine": "crocin"\n}');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const endpoints = [
    { value: '/api/normalize', method: 'POST', body: '{\n  "medicine": "crocin"\n}' },
    { value: '/api/bulk-normalize', method: 'POST', body: '{\n  "medicines": ["crocin", "glucophage"]\n}' },
    { value: '/api/alternatives/paracetamol', method: 'GET', body: '' },
    { value: '/api/analytics', method: 'GET', body: '' },
  ];

  const handleEndpointChange = (value) => {
    setEndpoint(value);
    const endpoint = endpoints.find(e => e.value === value);
    if (endpoint) {
      setRequestBody(endpoint.body);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    try {
      const selectedEndpoint = endpoints.find(e => e.value === endpoint);
      const method = selectedEndpoint?.method || 'POST';
      const config = { withCredentials: true };

      let result;
      if (method === 'GET') {
        result = await axios.get(`${BACKEND_URL}${endpoint}`, config);
      } else {
        const body = JSON.parse(requestBody);
        result = await axios.post(`${BACKEND_URL}${endpoint}`, body, config);
      }

      setResponse({
        status: result.status,
        data: result.data
      });
      toast.success('API call successful!');
    } catch (error) {
      setResponse({
        status: error.response?.status || 500,
        error: error.response?.data?.detail || error.message
      });
      toast.error('API call failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentPage="/api-playground" />
      <main className="flex-1 p-4 md:p-6 lg:ml-0" data-testid="api-playground-main">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2" style={{ fontFamily: 'Outfit' }}>API Playground</h1>
            <p className="text-base text-secondary-foreground">Test API endpoints and view responses</p>
          </div>

          <Card className="bg-card border border-border shadow-sm rounded-lg p-6 mb-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Endpoint</label>
                <select
                  value={endpoint}
                  onChange={(e) => handleEndpointChange(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none"
                  data-testid="api-endpoint-select"
                >
                  {endpoints.map(ep => (
                    <option key={ep.value} value={ep.value}>
                      {ep.method} {ep.value}
                    </option>
                  ))}
                </select>
              </div>

              {requestBody && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Request Body</label>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none font-mono text-sm"
                    data-testid="api-request-body"
                  />
                </div>
              )}

              <Button
                onClick={handleTest}
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md px-6"
                data-testid="api-playground-run-button"
              >
                <Play className="h-4 w-4 mr-2" />
                {loading ? 'Testing...' : 'Test API'}
              </Button>
            </div>
          </Card>

          {response && (
            <Card className="bg-card border border-border shadow-sm rounded-lg p-6">
              <div className="mb-4">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  response.status >= 200 && response.status < 300
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  Status: {response.status}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Response</p>
                <pre className="bg-background border border-input rounded-md p-4 text-xs font-mono overflow-x-auto" data-testid="api-response-display">
                  {JSON.stringify(response.data || response.error, null, 2)}
                </pre>
              </div>
            </Card>
          )}

          {/* Documentation */}
          <Card className="bg-card border border-border shadow-sm rounded-lg p-6 mt-6">
            <h3 className="text-lg font-medium mb-4">API Documentation</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium">Authentication</p>
                <p className="text-muted-foreground mt-1">All API endpoints require JWT authentication via httpOnly cookies or Bearer token.</p>
              </div>
              <div>
                <p className="font-medium">Base URL</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">{BACKEND_URL}</code>
              </div>
              <div>
                <p className="font-medium">Rate Limiting</p>
                <p className="text-muted-foreground mt-1">No rate limiting in current version. Consider implementing for production.</p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}