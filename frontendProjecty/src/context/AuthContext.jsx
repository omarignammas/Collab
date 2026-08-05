import { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    setUser(response);
    return response;
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    setUser(response);
    return response;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateUser = (partialUser) => {
    const merged = authService.updateStoredUser(partialUser);
    setUser(merged);
    return merged;
  };

  const value = {
    user,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};