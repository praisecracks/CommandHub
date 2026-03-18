// ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const [status, setStatus] = useState('HR');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        const savedStatus = await AsyncStorage.getItem('userStatus');
        if (savedTheme) setTheme(savedTheme);
        if (savedStatus) setStatus(savedStatus);
      } catch (error) {
        console.log('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  const updateStatus = async (newStatus) => {
    setStatus(newStatus);
    try {
      await AsyncStorage.setItem('userStatus', newStatus);
    } catch (error) {
      console.log('Error saving status:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, status, updateStatus }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
