// components/services/SignalService.js
import axios from 'axios';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import ConfigService from './ConfigService';  // Keep this import

// Get API keys from environment
const {
  EXPO_PUBLIC_CALENDARIFIC_API_KEY,
  EXPO_PUBLIC_OPENWEATHER_API_KEY,
  EXPO_PUBLIC_NEWS_API_KEY,
} = Constants.expoConfig?.extra || {};

class SignalService {
  // Helper to ensure config is loaded
  static async getConfig() {
    if (!ConfigService.isLoaded) {
      await ConfigService.loadConfig();
    }
    return ConfigService;
  }

  static async checkAllSources() {
    console.log('🔍 SignalService.checkAllSources called');
    
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No user logged in');
      return [];
    }

    // Get config once
    const config = await this.getConfig();
    
    const newSignals = [];
    
    try {
      console.log('✅ User found, checking sources...');
      
      // Get feature flags
      const featureFlags = config.get('FEATURE_FLAGS') || {};
      
      // Check each source based on feature flags
      if (featureFlags.enableHolidays !== false) {
        const holidays = await this.checkPublicHolidays(config);
        newSignals.push(...holidays);
      }
      
      if (featureFlags.enableWeather !== false) {
        const weatherAlerts = await this.checkWeather(config);
        newSignals.push(...weatherAlerts);
      }
      
      if (featureFlags.enableNews !== false) {
        const news = await this.checkIndustryNews(config);
        newSignals.push(...news);
      }
      
      // Save all new signals to Firestore
      let savedCount = 0;
      for (const signal of newSignals) {
        const saved = await this.saveSignal(signal, config);
        if (saved) savedCount++;
      }
      
      console.log(`✅ Added ${savedCount} new signals`);
      return newSignals;
    } catch (error) {
      console.error('Error in checkAllSources:', error);
      return [];
    }
  }

  // 1. 🗓️ PUBLIC HOLIDAYS API
  static async checkPublicHolidays(config) {
    try {
      const year = new Date().getFullYear();
      const apiConfig = config.get('API_CONFIG') || {};
      const cacheDurations = config.get('CACHE_DURATIONS') || {};
      const country = apiConfig.calendarificCountry || 'NG';
      const cacheKey = `@holidays_${country}_${year}`;
      const cacheDuration = (cacheDurations.holidaysDays || 7) * 24 * 60 * 60 * 1000;
      
      // Check cache
      try {
        const cachedData = await AsyncStorage.getItem(cacheKey);
        if (cachedData) {
          const { timestamp, data, rateLimitUntil } = JSON.parse(cachedData);
          const now = Date.now();
          
          if (rateLimitUntil && now < rateLimitUntil) {
            console.log('⏸️ In rate limit cooldown, using cached data');
            return this.formatHolidays(data);
          }
          
          if (now - timestamp < cacheDuration) {
            console.log('✅ Using cached holiday data');
            return this.formatHolidays(data);
          }
        }
      } catch (cacheErr) {
        // Silent fail - just fetch fresh data
      }

      console.log('🌐 Fetching fresh holiday data from API...');
      const apiUrl = 'https://calendarific.com/api/v2/holidays';
      const response = await axios.get(apiUrl, {
        params: {
          api_key: EXPO_PUBLIC_CALENDARIFIC_API_KEY,
          country: country,
          year: year,
        },
        timeout: 10000,
      });
      
      if (!response.data?.response?.holidays) {
        console.log('No holidays data received');
        return [];
      }
      
      const holidays = response.data.response.holidays;
      
      // Save to cache
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: holidays,
        rateLimitUntil: null
      }));
      
      return this.formatHolidays(holidays);
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('⚠️ Calendarific rate limit exceeded');
      } else {
        console.error('Error fetching holidays:', error.message);
      }
      return [];
    }
  }

  // 2. 🌦️ WEATHER ALERTS
  static async checkWeather(config) {
    try {
      const apiConfig = config.get('API_CONFIG') || {};
      const cacheDurations = config.get('CACHE_DURATIONS') || {};
      const city = apiConfig.weatherCity || 'Lagos';
      const units = apiConfig.weatherUnits || 'metric';
      const cacheKey = `@weather_${city}`;
      const cacheDuration = (cacheDurations.weatherMinutes || 30) * 60 * 1000;
      
      // Check cache
      try {
        const cachedData = await AsyncStorage.getItem(cacheKey);
        if (cachedData) {
          const { timestamp, data } = JSON.parse(cachedData);
          if (Date.now() - timestamp < cacheDuration) {
            console.log('✅ Using cached weather data');
            return this.formatWeatherAlerts(data);
          }
        }
      } catch (err) {
        // Silent fail
      }
      
      const apiUrl = 'https://api.openweathermap.org/data/2.5/weather';
      const response = await axios.get(apiUrl, {
        params: {
          q: city,
          appid: EXPO_PUBLIC_OPENWEATHER_API_KEY,
          units: units,
        },
        timeout: 10000,
      });
      
      const weather = response.data;
      
      // Cache weather data
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: weather
      }));
      
      return this.formatWeatherAlerts(weather, config);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⏳ Weather API key still activating');
      } else {
        console.error('Error fetching weather:', error.message);
      }
      return [];
    }
  }

  // 3. 📰 INDUSTRY NEWS
  static async checkIndustryNews(config) {
    try {
      const apiConfig = config.get('API_CONFIG') || {};
      const cacheDurations = config.get('CACHE_DURATIONS') || {};
      const query = apiConfig.newsQuery || 'HR workplace management';
      const pageSize = apiConfig.newsPageSize || 3;
      const cacheKey = `@news_${query}`;
      const cacheDuration = (cacheDurations.newsHours || 6) * 60 * 60 * 1000;
      
      // Check cache
      try {
        const cachedData = await AsyncStorage.getItem(cacheKey);
        if (cachedData) {
          const { timestamp, data } = JSON.parse(cachedData);
          if (Date.now() - timestamp < cacheDuration) {
            console.log('✅ Using cached news data');
            return this.formatNews(data);
          }
        }
      } catch (err) {
        // Silent fail
      }
      
      const apiUrl = 'https://newsapi.org/v2/everything';
      const response = await axios.get(apiUrl, {
        params: {
          q: query,
          apiKey: EXPO_PUBLIC_NEWS_API_KEY,
          pageSize: pageSize,
          sortBy: 'publishedAt',
        },
        timeout: 10000,
      });
      
      const articles = response.data?.articles || [];
      
      // Cache news
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: articles
      }));
      
      return this.formatNews(articles);
    } catch (error) {
      console.error('Error fetching news:', error.message);
      return [];
    }
  }

  // Helper: Format holidays
  static formatHolidays(holidays) {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const upcomingHolidays = holidays
      .filter(h => h.date?.iso && new Date(h.date.iso) > today && new Date(h.date.iso) < nextMonth)
      .slice(0, 3);
    
    return upcomingHolidays.map(holiday => ({
      title: `🏖️ Holiday: ${holiday.name || 'Public Holiday'}`,
      system: 'External • Holidays',
      type: 'Deadline',
      level: 'Medium',
      detail: `${holiday.name || 'Holiday'} on ${holiday.date?.iso ? new Date(holiday.date.iso).toLocaleDateString() : 'soon'}`,
      trend: 'flat',
      due: holiday.date?.iso ? this.getRelativeDate(holiday.date.iso) : 'Soon',
      source: 'holiday-api',
      externalId: holiday.uuid || `holiday-${Date.now()}-${Math.random()}`,
      autoGenerated: true,
      audience: 'all',
      read: false
    }));
  }

  // Helper: Format weather alerts
  static formatWeatherAlerts(weather, config) {
    const alerts = [];
    const thresholds = config?.get('THRESHOLDS') || {};
    const tempThreshold = thresholds.weatherTempHigh || 35;
    const rainThreshold = thresholds.weatherRainHigh || 5;
    
    if (weather.main?.temp > tempThreshold) {
      alerts.push({
        title: '🌡️ Extreme Heat Warning',
        system: 'External • Weather',
        type: 'Risk',
        level: 'Medium',
        detail: `Temperature of ${weather.main.temp}°C expected. Stay hydrated!`,
        trend: 'up',
        due: 'Today',
        source: 'weather-api',
        externalId: `heat-${Date.now()}`,
        autoGenerated: true,
        audience: 'all',
        read: false
      });
    }
    
    if (weather.rain && weather.rain['1h'] > rainThreshold) {
      alerts.push({
        title: '🌧️ Rainfall Alert',
        system: 'External • Weather',
        type: 'Risk',
        level: 'Low',
        detail: `${weather.rain['1h']}mm rain expected. Plan for delays.`,
        trend: 'down',
        due: 'Today',
        source: 'weather-api',
        externalId: `rain-${Date.now()}`,
        autoGenerated: true,
        audience: 'all',
        read: false
      });
    }
    
    return alerts;
  }

  // Helper: Format news
  static formatNews(articles) {
    return articles.map((article, index) => ({
      title: `📰 ${article.title?.substring(0, 50) || 'HR News'}...`,
      system: 'External • News',
      type: 'Watch',
      level: 'Low',
      detail: article.description || article.title || 'New industry news available',
      trend: 'flat',
      due: 'Read',
      source: 'news-api',
      externalId: article.url ? `news-${article.url}` : `news-${Date.now()}-${index}`,
      autoGenerated: true,
      audience: 'all',
      read: false
    }));
  }

  // Helper: Save signal to Firestore
  static async saveSignal(signal, config) {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
      if (!signal.externalId) {
        signal.externalId = `signal-${Date.now()}-${Math.random()}`;
      }
      
      const signalsRef = collection(db, 'users', user.uid, 'signals');
      const q = query(signalsRef, where('externalId', '==', signal.externalId));
      const existing = await getDocs(q);
      
      if (existing.empty) {
        await addDoc(signalsRef, {
          ...signal,
          createdAt: serverTimestamp(),
        });
        
        // Check if we should send notification
        const notifConfig = config?.get('NOTIFICATION_CONFIG') || {};
        const notifyOnlyHighRisk = notifConfig.notifyOnlyHighRisk !== false;
        const shouldNotify = notifyOnlyHighRisk 
          ? (signal.level === 'High' || signal.type === 'Risk')
          : true;
        
        if (shouldNotify) {
          await this.sendSignalNotification(signal, config);
        }
        
        console.log('✅ Signal saved:', signal.title);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving signal:', error);
      return false;
    }
  }

  // Helper: Send notification - Platform aware
  static async sendSignalNotification(signal, config) {
    // Skip notifications on web
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - skipping notification');
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: signal.title,
          body: signal.detail,
          data: { type: 'external-signal' },
          sound: true,
        },
        trigger: null,
      });
      console.log('🔔 Notification sent:', signal.title);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Helper: Get relative due date
  static getRelativeDate(dateString) {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays < 7) return `${diffDays} days`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Soon';
    }
  }
}

export default SignalService;