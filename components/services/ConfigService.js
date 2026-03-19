// services/ConfigService.js
import Constants from 'expo-constants';
import { Platform } from 'react-native';

class ConfigService {
  constructor() {
    this.config = null;
    this.isLoaded = false;
  }

  async loadConfig() {
    try {
      const envConfig = Constants.expoConfig?.extra || {};
      
      // Merge all configurations with defaults
      this.config = {
        ...this.getDefaults(),
        ...envConfig,
        ...this.parseNestedConfigs(envConfig)
      };
      
      this.isLoaded = true;
      console.log('✅ Config loaded successfully');
      return this.config;
    } catch (error) {
      console.error('Error loading config:', error);
      this.config = this.getDefaults();
      return this.config;
    }
  }

  parseNestedConfigs(config) {
    // Parse nested config objects if they exist as strings
    const parsed = {};
    
    if (config.FEATURE_FLAGS && typeof config.FEATURE_FLAGS === 'string') {
      try {
        parsed.FEATURE_FLAGS = JSON.parse(config.FEATURE_FLAGS);
      } catch (e) {}
    }
    
    if (config.API_CONFIG && typeof config.API_CONFIG === 'string') {
      try {
        parsed.API_CONFIG = JSON.parse(config.API_CONFIG);
      } catch (e) {}
    }
    
    if (config.THRESHOLDS && typeof config.THRESHOLDS === 'string') {
      try {
        parsed.THRESHOLDS = JSON.parse(config.THRESHOLDS);
      } catch (e) {}
    }
    
    return parsed;
  }

  getDefaults() {
    return {
      FEATURE_FLAGS: {
        enableHolidays: true,
        enableWeather: true,
        enableNews: true,
        enableNotifications: Platform.OS !== 'web',
        enableDailyDigest: true
      },
      API_CONFIG: {
        calendarificCountry: 'NG',
        weatherCity: 'Lagos',
        weatherUnits: 'metric',
        newsQuery: 'HR workplace management',
        newsPageSize: 3
      },
      THRESHOLDS: {
        weatherTempHigh: 35,
        weatherRainHigh: 5
      },
      CACHE_DURATIONS: {
        holidaysDays: 7,
        weatherMinutes: 30,
        newsHours: 6
      },
      RATE_LIMITS: {
        cooldownMinutes: 60
      },
      NOTIFICATION_CONFIG: {
        dailyDigestHour: 8,
        dailyDigestMinute: 0,
        notifyOnlyHighRisk: true
      },
      SIGNAL_INTERVALS: {
        autoCheckHours: 12
      }
    };
  }

  get(key, defaultValue = null) {
    if (!this.isLoaded) {
      console.warn('Config not loaded yet, using default');
      return defaultValue;
    }
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  async getAsync(key, defaultValue = null) {
    if (!this.isLoaded) {
      await this.loadConfig();
    }
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }
}

export default new ConfigService();