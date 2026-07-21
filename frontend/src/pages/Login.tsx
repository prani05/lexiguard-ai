import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Alert, 
  CircularProgress,
  IconButton,
  InputAdornment
} from '@mui/material';
import { Visibility, VisibilityOff, Shield } from '@mui/icons-material';

const Login: React.FC = () => {
  const { login, error, setError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      // Error is stored in context, handled in UI
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box 
        className="animate-fade-in"
        sx={{ 
          marginTop: 12, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center' 
        }}
      >
        <Box 
          className="glass-panel" 
          sx={{ 
            p: 5, 
            width: '100%', 
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Shield sx={{ fontSize: 44, color: '#9f7aea' }} />
          </Box>
          
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Lexi<span style={{ color: '#ec4899' }}>Guard</span> AI
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Review legal agreements and contracts instantly.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }
              }}
              sx={{ mb: 4 }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={submitting}
              sx={{ 
                py: 1.5,
                background: 'linear-gradient(135deg, #9f7aea 0%, #ec4899 100%)',
                '&:hover': {
                  opacity: 0.9,
                }
              }}
            >
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </form>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#9f7aea', fontWeight: 600 }}>
                Sign Up
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
