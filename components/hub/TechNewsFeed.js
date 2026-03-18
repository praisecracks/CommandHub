// components/hub/TechNewsFeed.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TechNewsCard from './TechNewsCard';

const COLORS = {
  surface: '#11131A',
  surfaceSoft: '#151821',
  border: 'rgba(255,255,255,0.06)',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textSoft: '#64748B',
  primary: '#22C7FF',
  primarySoft: 'rgba(34,199,255,0.14)',
  white10: 'rgba(255,255,255,0.1)',
};

// Extended news database with various tech topics
const TECH_NEWS_DATABASE = [
  // AI & Machine Learning
  {
    id: '1',
    authorName: 'OpenAI',
    authorHandle: 'OpenAI',
    authorAvatar: 'https://pbs.twimg.com/profile_images/1765803622353985536/aoFfPjGp_400x400.jpg',
    text: 'GPT-5 training shows breakthrough in reasoning capabilities. Early tests indicate 40% improvement in complex problem-solving. 🧠',
    likes: 28400,
    retweets: 6200,
    replies: 1450,
    timeAgo: '1h',
    url: 'https://twitter.com/OpenAI',
    category: 'ai'
  },
  {
    id: '2',
    authorName: 'Google DeepMind',
    authorHandle: 'GoogleDeepMind',
    authorAvatar: 'https://pbs.twimg.com/profile_images/1610526374758342656/WyBEdqVc_400x400.jpg',
    text: 'AlphaFold 3 now predicts all molecular interactions in life, not just proteins. Game changer for drug discovery! 💊',
    likes: 15600,
    retweets: 4300,
    replies: 890,
    timeAgo: '3h',
    url: 'https://twitter.com/GoogleDeepMind',
    category: 'ai'
  },

  // Tech Companies & Products
  {
    id: '3',
    authorName: 'Apple',
    authorHandle: 'Apple',
    authorAvatar: 'https://pbs.twimg.com/profile_images/1785867863191932928/EpOqfO6d_400x400.png',
    text: 'Vision Pro 2 announced with lighter design, longer battery life, and AI-powered spatial computing. Pre-orders next month. 👓',
    likes: 45200,
    retweets: 8900,
    replies: 3200,
    timeAgo: '2h',
    url: 'https://twitter.com/Apple',
    category: 'hardware'
  },
  {
    id: '4',
    authorName: 'Samsung',
    authorHandle: 'Samsung',
    authorAvatar: 'https://pbs.twimg.com/profile_images/1765803622353985536/aoFfPjGp_400x400.jpg',
    text: 'Galaxy Z Fold 7 features under-display camera, 200MP main sensor, and AI photo editing. Available August. 📱',
    likes: 21300,
    retweets: 4700,
    replies: 1250,
    timeAgo: '5h',
    url: 'https://twitter.com/Samsung',
    category: 'hardware'
  },

  // Software & Dev Tools
  {
    id: '5',
    authorName: 'Visual Studio Code',
    authorHandle: 'code',
    authorAvatar: 'https://pbs.twimg.com/profile_images/1836913937931804672/mHrZTqPX_400x400.png',
    text: 'VS Code 2.0 introduces AI pair programming, voice commands, and real-time collaboration. Download now! 💻',
    likes: 18900,
    retweets: 5400,
    replies: 1100,
    timeAgo: '4h',
    url: 'https://twitter.com/code',
    category: 'devtools'
  },
  {
    id: '6',
    authorName: 'GitHub',
    authorHandle: 'github',
    authorAvatar: 'https://pbs.twimg.com/profile_images/1610526374758342656/WyBEdqVc_400x400.jpg',
    text: 'GitHub Copilot Workspaces: AI-powered development environments that write, test, and deploy your code. 🤖',
    likes: 32400,
    retweets: 7800,
    replies: 1650,
    timeAgo: '6h',
    url: 'https://twitter.com/github',
    category: 'devtools'
  },

  // Programming Languages
  {
    id: '7',
    authorName: 'Python',
    authorHandle: 'python',
    authorAvatar: 'https://pbs.twimg.com/profile_images/1785867863191932928/EpOqfO6d_400x400.png',
    text: 'Python 4.0 roadmap: Faster interpreter, optional typing, and mobile support. Community feedback open until Friday. 🐍',
    likes: 15200,
    retweets: 3900,
    replies: 2100,
    timeAgo: '7h',
    url: 'https://twitter.com/python',
    category: 'language'
  },
  {
    id: '8',
    authorName: 'Rust',
    authorHandle: 'rustlang',
    authorAvatar: 'https://pbs.twimg.com/profile_images/1765803622353985536/aoFfPjGp_400x400.jpg',
    text: 'Rust 2026 edition: Async improvements, better compile times, and WebAssembly enhancements. 🦀',
    likes: 9800,
    retweets: 2100,
    replies: 670,
    timeAgo: '9h',
    url: 'https://twitter.com/rustlang',
    category: 'language'
  },

  // Tech News & Trends
  {
    id: '9',
    authorName: 'TechCrunch',
    authorHandle: 'TechCrunch',
    authorAvatar: 'https://pbs.twimg.com/profile_images/1836913937931804672/mHrZTqPX_400x400.png',
    text: 'Startup funding hits $89B in Q2 2026, led by AI and climate tech. Biggest quarter since 2021. 📈',
    likes: 6700,
    retweets: 1800,
    replies: 450,
    timeAgo: '2h',
    url: 'https://twitter.com/TechCrunch',
    category: 'news'
  },
  {
    id: '10',
    authorName: 'The Verge',
    authorHandle: 'verge',
    authorAvatar: 'https://pbs.twimg.com/profile_images/1610526374758342656/WyBEdqVc_400x400.jpg',
    text: 'EU Digital Markets Act forces Apple to allow third-party app stores and alternate payment systems. Big changes coming. 🇪🇺',
    likes: 23400,
    retweets: 5600,
    replies: 2900,
    timeAgo: '4h',
    url: 'https://twitter.com/verge',
    category: 'news'
  },

  // Cybersecurity
  {
    id: '11',
    authorName: 'Krebs on Security',
    authorHandle: 'briankrebs',
    authorAvatar: 'https://pbs.twimg.com/profile_images/1785867863191932928/EpOqfO6d_400x400.png',
    text: 'New ransomware group targeting cloud backups. Ensure your 3-2-1 backup strategy is up to date. 🔒',
    likes: 8900,
    retweets: 3400,
    replies: 520,
    timeAgo: '8h',
    url: 'https://twitter.com/briankrebs',
    category: 'security'
  },

  // Gaming & Graphics
  {
    id: '12',
    authorName: 'NVIDIA',
    authorHandle: 'nvidia',
    authorAvatar: 'https://pbs.twimg.com/profile_images/1765803622353985536/aoFfPjGp_400x400.jpg',
    text: 'RTX 6090 announced: 4x ray tracing performance, AI-powered frame generation, and 48GB VRAM. 🎮',
    likes: 56700,
    retweets: 12300,
    replies: 5600,
    timeAgo: '1h',
    url: 'https://twitter.com/nvidia',
    category: 'hardware'
  }
];

// Get random subset of news
const getRandomNews = (count = 4) => {
  const shuffled = [...TECH_NEWS_DATABASE].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Update timestamps to make them feel fresh
const updateTimestamps = (news) => {
  const hours = ['1h', '2h', '3h', '4h', '5h', '6h', '7h', '8h', '9h', '10h', '11h', '12h'];
  return news.map(item => ({
    ...item,
    timeAgo: hours[Math.floor(Math.random() * hours.length)]
  }));
};

const TechNewsFeed = ({ limit = 3, showHeader = true, onRefresh }) => {
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchTweets = async (forceFresh = false) => {
    try {
      // If not forcing fresh, check cache first
      if (!forceFresh) {
        const cached = await AsyncStorage.getItem('@tech_news_cache');
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // Use cache if less than 30 minutes old
          if (Date.now() - timestamp < 30 * 60 * 1000) {
            console.log('✅ Using cached tech news');
            setTweets(data);
            setLoading(false);
            setRefreshing(false);
            return;
          }
        }
      }

      console.log('🔄 Fetching fresh tech news...');
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Get random news and update timestamps
      const freshNews = updateTimestamps(getRandomNews(limit + 1));
      
      setTweets(freshNews);
      
      // Cache the fresh news
      await AsyncStorage.setItem('@tech_news_cache', JSON.stringify({
        data: freshNews,
        timestamp: Date.now()
      }));
      
      setLastRefresh(Date.now());
      
    } catch (err) {
      console.error('Error in tech news:', err);
      // Fallback to random selection from database
      setTweets(updateTimestamps(getRandomNews(limit + 1)));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchTweets();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchTweets(true); // Force fresh content
    onRefresh?.();
  };

  // Format last refresh time
  const getLastRefreshText = () => {
    const seconds = Math.floor((Date.now() - lastRefresh) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  if (loading) {
    return (
      <View style={{ 
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center' 
      }}>
        <ActivityIndicator color={COLORS.primary} />
        <Text style={{ color: COLORS.textMuted, marginTop: 8 }}>Loading tech news...</Text>
      </View>
    );
  }

  return (
    <View style={{
      backgroundColor: COLORS.surface,
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
    }}>
      {showHeader && (
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 16 
        }}>
          <View>
            <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '800' }}>
              Tech News
            </Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>
              Updated {getLastRefreshText()}
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={handleRefresh}
            disabled={refreshing}
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              backgroundColor: COLORS.primarySoft,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: refreshing ? 0.5 : 1,
            }}
          >
            <Ionicons 
              name="refresh-outline" 
              size={18} 
              color={COLORS.primary} 
              style={refreshing ? { transform: [{ rotate: '45deg' }] } : {}}
            />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 8 }}
      >
        {tweets.slice(0, limit).map(tweet => (
          <TechNewsCard key={tweet.id} tweet={tweet} />
        ))}
      </ScrollView>
    </View>
  );
};

export default TechNewsFeed;