import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pill } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toast.success('Logged in successfully!');
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <Card className="w-full max-w-md bg-card border border-border shadow-sm rounded-lg p-8" data-testid="login-card">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Pill className="h-8 w-8 text-primary" strokeWidth={1.5} />
          <span className="text-2xl font-bold text-primary" style={{ fontFamily: 'Outfit' }}>MedNormalize AI</span>
        </div>

        <h2 className="text-2xl font-semibold text-center mb-6" style={{ fontFamily: 'Outfit' }}>Welcome Back</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="email" className="text-sm font-medium mb-2 block">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mednormalize.ai"
              required
              className="bg-background border border-input focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-md"
              data-testid="login-email-input"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-sm font-medium mb-2 block">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-background border border-input focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-md"
              data-testid="login-password-input"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md py-2.5"
            data-testid="login-submit-button"
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <p className="text-sm text-center mt-6 text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-medium hover:underline" data-testid="register-link">
            Register here
          </Link>
        </p>

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">Demo Credentials:</p>
          <p className="text-xs text-muted-foreground text-center mt-1">admin@mednormalize.ai / admin123</p>
        </div>
      </Card>
    </div>
  );
}