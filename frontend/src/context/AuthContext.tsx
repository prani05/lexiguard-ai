import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'ROLE_USER' | 'ROLE_ADMIN';
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      const response = await API.get('/users/me');
      if (response.data && response.data.success) {
        setUser(response.data.data);
      } else {
        logout();
      }
    } catch (err) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const response = await API.post('/auth/login', { email, password });
      if (response.data && response.data.success) {
        const { token, user: userData } = response.data.data;
        localStorage.setItem('token', token);
        setUser(userData);
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setError(null);
    try {
      const response = await API.post('/auth/register', { name, email, password });
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Registration failed');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.join(', ') || err.message || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        error,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
