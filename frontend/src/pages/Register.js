import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pill } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await register(email, password, name, role);
    setLoading(false);

    if (result.success) {
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <Card className="w-full max-w-md bg-card border border-border shadow-sm rounded-lg p-8" data-testid="register-card">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Pill className="h-8 w-8 text-primary" strokeWidth={1.5} />
          <span className="text-2xl font-bold text-primary" style={{ fontFamily: 'Outfit' }}>MedNormalize AI</span>
        </div>

        <h2 className="text-2xl font-semibold text-center mb-6" style={{ fontFamily: 'Outfit' }}>Create Account</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="name" className="text-sm font-medium mb-2 block">Full Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. John Doe"
              required
              className="bg-background border border-input focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-md"
              data-testid="register-name-input"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-sm font-medium mb-2 block">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@hospital.com"
              required
              className="bg-background border border-input focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-md"
              data-testid="register-email-input"
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
              minLength={6}
              className="bg-background border border-input focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-md"
              data-testid="register-password-input"
            />
          </div>

          <div>
            <Label htmlFor="role" className="text-sm font-medium mb-2 block">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-background border border-input focus:ring-2 focus:ring-ring rounded-md" data-testid="register-role-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="hospital">Hospital</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md py-2.5"
            data-testid="register-submit-button"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="text-sm text-center mt-6 text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline" data-testid="login-link">
            Login here
          </Link>
        </p>
      </Card>
    </div>
  );
}