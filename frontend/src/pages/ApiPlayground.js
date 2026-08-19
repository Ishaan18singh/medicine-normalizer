import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import Sidebar from '../components/layout/Sidebar';
import { toast } from 'sonner';
import axios from 'axios';

export default function ApiPlayground() {
  const [endpoint, setEndpoint] = useState('/api/normalize');
  const [requestBody, setRequestBody] = useState('{\n  "medicine": "crocin"\n}');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const endpoints = [
    { value: '/api/normalize', method: 'POST', body: '{\n  "medicine": "crocin"\n}' },
    { value: '/api/bulk-normalize', method: 'POST', body: '{\n  "medicines": ["crocin", "glucophage"]\n}' },
    { value: '/api/suggest?q=crocin', method: 'GET', body: '' },
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
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
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