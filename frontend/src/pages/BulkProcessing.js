import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Pill, LogOut, Menu, Search, FileText, BarChart3, Code, Camera, Upload, Download } from 'lucide-react';
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
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start gap-3 border-input hover:bg-accent"
          >
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

export default function BulkProcessing() {
  const [medicines, setMedicines] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const handleProcess = async () => {
    const medicineList = medicines.split('\n').filter(m => m.trim());
    if (medicineList.length === 0) {
      toast.error('Please enter at least one medicine name');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/bulk-normalize`,
        { medicines: medicineList },
        { withCredentials: true }
      );
      setResults(data.results);
      toast.success(`Processed ${data.results.length} medicines successfully!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process medicines');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!results) return;

    const headers = ['Input', 'Normalized', 'Type', 'Confidence', 'Alternatives'];
    const rows = results.map(r => [
      r.input,
      r.normalized,
      r.type,
      (r.confidence * 100).toFixed(1) + '%',
      r.alternatives.join('; ')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'normalized-medicines.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully!');
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentPage="/bulk" />
      <main className="flex-1 p-4 md:p-6 lg:ml-0" data-testid="bulk-processing-main">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2" style={{ fontFamily: 'Outfit' }}>
              Bulk Processing
            </h1>
            <p className="text-base text-secondary-foreground">Process multiple medicine names at once</p>
          </div>

          <Card className="bg-card border border-border shadow-sm rounded-lg p-6 mb-6" data-testid="csv-upload-zone">
            <label className="text-sm font-medium mb-3 block">Enter Medicine Names (one per line)</label>
            <textarea
              placeholder="crocin\nglucophage\nlisinopril\natorvastatin\n..."
              value={medicines}
              onChange={(e) => setMedicines(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none"
              data-testid="bulk-medicine-input"
            />
            <div className="flex gap-3 mt-4">
              <Button
                onClick={handleProcess}
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md px-6"
                data-testid="bulk-process-button"
              >
                <Upload className="h-4 w-4 mr-2" />
                {loading ? 'Processing...' : 'Process All'}
              </Button>
              {results && (
                <Button
                  onClick={downloadCSV}
                  variant="outline"
                  className="border-input hover:bg-accent"
                  data-testid="download-csv-button"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              )}
            </div>
          </Card>

          {results && (
            <Card className="bg-card border border-border shadow-sm rounded-lg p-6" data-testid="bulk-results">
              <h3 className="text-lg font-medium mb-4">Results ({results.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((result) => (
                  <div
                    key={`${result.input}-${result.normalized}`}
                    className="px-4 py-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium capitalize">{result.input} → {result.normalized}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Confidence: {(result.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary-foreground capitalize">
                        {result.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}