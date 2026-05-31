import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Pill, LogOut, Menu, Search, FileText, BarChart3, Code, Camera, Upload } from 'lucide-react';
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

export default function PrescriptionScanner() {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/scan-prescription`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true
        }
      );
      setResults(data);
      toast.success(`Extracted ${data.extracted_medicines.length} medicines from prescription!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to scan prescription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentPage="/scanner" />
      <main className="flex-1 p-4 md:p-6 lg:ml-0" data-testid="scanner-main">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2" style={{ fontFamily: 'Outfit' }}>Prescription Scanner</h1>
            <p className="text-base text-secondary-foreground">Upload a prescription image to extract medicine names</p>
          </div>

          <Card className="bg-card border border-border shadow-sm rounded-lg p-6 mb-6" data-testid="image-upload-zone">
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="file-input"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md px-8 py-6 text-lg"
                data-testid="upload-prescription-button"
              >
                <Upload className="h-6 w-6 mr-3" />
                {loading ? 'Scanning...' : 'Upload Prescription Image'}
              </Button>
              <p className="text-sm text-muted-foreground mt-4">Supports JPG, PNG, JPEG</p>
            </div>

            {preview && (
              <div className="mt-6">
                <img src={preview} alt="Prescription preview" className="max-w-full h-auto max-h-96 mx-auto rounded-md border border-border" />
              </div>
            )}
          </Card>

          {results && (
            <div className="space-y-4">
              <Card className="bg-card border border-border shadow-sm rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Extracted Medicines ({results.extracted_medicines.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {results.extracted_medicines.map((med, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full text-sm bg-secondary/20 text-secondary-foreground">
                      {med}
                    </span>
                  ))}
                </div>
              </Card>

              <Card className="bg-card border border-border shadow-sm rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Normalized Results</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results.results.map((result, idx) => (
                    <div key={idx} className="px-4 py-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium capitalize">{result.input} → {result.normalized}</p>
                          <p className="text-xs text-muted-foreground mt-1">Confidence: {(result.confidence * 100).toFixed(1)}%</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary-foreground capitalize">{result.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}