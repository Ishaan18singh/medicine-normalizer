import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pill, LogOut, Menu, Search, FileText, BarChart3, Code, Camera, Sun, Moon } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const menuItems = [
  { icon: Search, label: 'Dashboard', path: '/dashboard' },
  { icon: FileText, label: 'Bulk Processing', path: '/bulk' },
  { icon: Camera, label: 'Scanner', path: '/scanner' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics', adminOnly: true },
  { icon: Code, label: 'API', path: '/api-playground' },
];

export default function Sidebar({ currentPage }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 bg-card p-2 rounded-md border border-border"
        onClick={() => setMobileOpen(!mobileOpen)}
        data-testid="mobile-menu-toggle"
        aria-label="Toggle menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col transition-transform ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        data-testid="sidebar"
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="h-6 w-6 text-primary" strokeWidth={1.5} />
              <span className="text-lg font-bold text-primary" style={{ fontFamily: 'Outfit' }}>MedNormalize</span>
            </div>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              data-testid="theme-toggle"
              aria-label="Toggle dark mode"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" strokeWidth={1.5} /> : <Moon className="h-4 w-4" strokeWidth={1.5} />}
            </button>
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
                onClick={() => setMobileOpen(false)}
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

        <div className="p-4 border-t border-border space-y-2">
          <p className="text-[11px] text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono">K</kbd> to search
          </p>
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

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
