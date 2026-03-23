// app.config.js
import 'dotenv/config';

export default {
  expo: {
    name: "Command Hub",
    slug: "my-expo-app",
    owner: "praisecrackdev",
    scheme: "custom-hub-auth",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/CustomLogo.jpeg",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/CustomLogo.jpeg",
      resizeMode: "contain",
      backgroundColor: "#020408"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.customhub.app",
      userInterfaceStyle: "dark",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      package: "com.customhub.app",
      adaptiveIcon: {
        foregroundImage: "./assets/CustomLogoNoBg.png",
        backgroundColor: "#020408"
      },
      softwareKeyboardLayoutMode: "pan",
      minSdkVersion: 26,
      targetSdkVersion: 34,
      compileSdkVersion: 34
    },
    web: {
      favicon: "./assets/CustomLogoNoBg.png"
    },
    plugins: [
      "expo-web-browser",
      "@react-native-community/datetimepicker"
    ],
    extra: {
      eas: {
        projectId: "eba16db0-6404-4497-ae9a-1195194ddb4a"
      },
      // These read from .env file (safe to commit)
      EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      EXPO_PUBLIC_CALENDARIFIC_API_KEY: process.env.EXPO_PUBLIC_CALENDARIFIC_API_KEY,
      EXPO_PUBLIC_OPENWEATHER_API_KEY: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY,
      EXPO_PUBLIC_NEWS_API_KEY: process.env.EXPO_PUBLIC_NEWS_API_KEY,
      // Feature flags (safe to commit)
      FEATURE_FLAGS: {
        enableHolidays: true,
        enableWeather: true,
        enableNews: true,
        enableNotifications: true,
        enableDailyDigest: true
      },
      API_CONFIG: {
        calendarificCountry: "NG",
        weatherCity: "Lagos",
        weatherUnits: "metric",
        newsQuery: "HR workplace management",
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
    }
  }
};