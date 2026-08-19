import React, { useState, useRef } from 'react';
import { Upload, Camera as CameraIcon, X, Plus, Download, ScanLine } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import Sidebar from '../components/layout/Sidebar';
import useColdStartHint from '../hooks/useColdStartHint';
import { toast } from 'sonner';
import axios from 'axios';

export default function PrescriptionScanner() {
  const [scanning, setScanning] = useState(false);
  const [normalizing, setNormalizing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [extractedLines, setExtractedLines] = useState(null); // editable, pre-normalize
  const [results, setResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const loading = scanning || normalizing;
  const showColdStartHint = useColdStartHint(loading);

  const runOcr = async (file) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);

    setResults(null);
    setExtractedLines(null);
    setScanning(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/ocr-extract`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' }, withCredentials: true }
      );
      if (data.extracted_medicines.length === 0) {
        toast.error('No text found in that image');
      } else {
        setExtractedLines(data.extracted_medicines);
        toast.success(`Found ${data.extracted_medicines.length} line(s) - review before normalizing`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to scan prescription');
    } finally {
      setScanning(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) runOcr(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) runOcr(file);
  };

  const updateLine = (idx, value) => {
    setExtractedLines((lines) => lines.map((l, i) => (i === idx ? value : l)));
  };

  const removeLine = (idx) => {
    setExtractedLines((lines) => lines.filter((_, i) => i !== idx));
  };

  const addLine = () => {
    setExtractedLines((lines) => [...lines, '']);
  };

  const handleNormalizeAll = async () => {
    const lines = extractedLines.map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error('Add at least one medicine name');
      return;
    }
    setNormalizing(true);
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/bulk-normalize`,
        { medicines: lines },
        { withCredentials: true }
      );
      setResults(data.results);
      toast.success(`Normalized ${data.results.length} medicine(s)!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to normalize medicines');
    } finally {
      setNormalizing(false);
    }
  };

  const downloadCSV = () => {
    if (!results) return;
    const headers = ['Input', 'Normalized', 'Type', 'Confidence', 'Alternatives'];
    const rows = results.map((r) => [
      r.input,
      r.normalized,
      r.type,
      (r.confidence * 100).toFixed(1) + '%',
      r.alternatives.map((a) => a.name).join('; '),
    ]);
    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scanned-prescription.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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

          <Card
            className={`bg-card border shadow-sm rounded-lg p-6 mb-6 transition-colors ${
              dragActive ? 'border-primary border-2 bg-primary/5' : 'border-border'
            }`}
            data-testid="image-upload-zone"
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" data-testid="file-input" />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" data-testid="camera-input" />

              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" strokeWidth={1} />
              <p className="text-sm text-muted-foreground mb-4">Drag and drop a prescription image here, or</p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md px-6"
                  data-testid="upload-prescription-button"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {scanning ? 'Scanning...' : 'Choose Image'}
                </Button>
                <Button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={loading}
                  variant="outline"
                  className="border-input hover:bg-accent"
                  data-testid="camera-capture-button"
                >
                  <CameraIcon className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">Supports JPG, PNG, JPEG</p>

              {showColdStartHint && (
                <p className="text-xs text-muted-foreground mt-3" data-testid="cold-start-hint">
                  Still working — the server sleeps after inactivity and can take up to a minute to wake up.
                </p>
              )}
            </div>

            {preview && (
              <div className="mt-6">
                <img src={preview} alt="Prescription preview" className="max-w-full h-auto max-h-96 mx-auto rounded-md border border-border" />
              </div>
            )}
          </Card>

          {extractedLines && !results && (
            <Card className="bg-card border border-border shadow-sm rounded-lg p-6 mb-6" data-testid="ocr-review-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Review extracted text</h3>
                <p className="text-xs text-muted-foreground">OCR isn't perfect — fix anything that looks wrong before normalizing</p>
              </div>
              <div className="space-y-2">
                {extractedLines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={line}
                      onChange={(e) => updateLine(idx, e.target.value)}
                      className="flex-1 px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                      data-testid={`ocr-line-${idx}`}
                    />
                    <button onClick={() => removeLine(idx)} className="text-muted-foreground hover:text-destructive transition-colors p-2" title="Remove line">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button onClick={addLine} className="flex items-center gap-1.5 text-sm text-primary hover:underline mt-2">
                  <Plus className="h-4 w-4" /> Add line
                </button>
              </div>
              <Button
                onClick={handleNormalizeAll}
                disabled={normalizing}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md px-6 mt-4"
                data-testid="normalize-extracted-button"
              >
                <ScanLine className="h-4 w-4 mr-2" />
                {normalizing ? 'Normalizing...' : `Normalize ${extractedLines.filter((l) => l.trim()).length} medicine(s)`}
              </Button>
            </Card>
          )}

          {results && (
            <div className="space-y-4">
              <Card className="bg-card border border-border shadow-sm rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Normalized Results ({results.length})</h3>
                  <Button onClick={downloadCSV} variant="outline" size="sm" className="border-input hover:bg-accent" data-testid="download-scan-csv-button">
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results.map((result, idx) => (
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
