// components/hub/TechNewsCard.js
import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const COLORS = {
  surfaceSoft: '#151821',
  border: 'rgba(255,255,255,0.06)',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textSoft: '#64748B',
  white10: 'rgba(255,255,255,0.1)',
};

// PERFORMANCE: Memoize format function outside component
const formatNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num;
};

// PERFORMANCE: Memoize component to prevent unnecessary re-renders
const TechNewsCard = memo(({ tweet, onPress }) => {
  // PERFORMANCE: Memoize press handler
  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onPress) {
      onPress(tweet);
    } else if (tweet.url) {
      Linking.openURL(tweet.url);
    }
  }, [tweet, onPress]);

  // PERFORMANCE: Memoize formatted stats
  const formattedStats = useMemo(() => ({
    likes: formatNumber(tweet.likes),
    retweets: formatNumber(tweet.retweets),
    replies: formatNumber(tweet.replies),
  }), [tweet.likes, tweet.retweets, tweet.replies]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        width: 280,
        backgroundColor: COLORS.surfaceSoft,
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 12,
      }}
      activeOpacity={0.7}
    >
      {/* Header - Author Info */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Image 
          source={{ uri: tweet.authorAvatar }} 
          style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
          // PERFORMANCE: Cache images for faster loading
          resizeMode="cover"
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>
            {tweet.authorName}
          </Text>
          <Text style={{ color: COLORS.textSoft, fontSize: 12 }}>
            @{tweet.authorHandle}
          </Text>
        </View>
        <Ionicons name="logo-twitter" size={18} color="#1DA1F2" />
      </View>

      {/* Tweet Text */}
      <Text style={{ 
        color: COLORS.text, 
        fontSize: 13, 
        lineHeight: 18,
        marginBottom: 12,
        maxHeight: 54,
        overflow: 'hidden'
      }}
        numberOfLines={3}
      >
        {tweet.text}
      </Text>

      {/* Footer - Stats */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.white10,
        gap: 16
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="heart-outline" size={14} color={COLORS.textMuted} />
          <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>
            {formattedStats.likes}
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="repeat-outline" size={14} color={COLORS.textMuted} />
          <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>
            {formattedStats.retweets}
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chatbubble-outline" size={14} color={COLORS.textMuted} />
          <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>
            {formattedStats.replies}
          </Text>
        </View>
        
        <Text style={{ color: COLORS.textSoft, fontSize: 11, marginLeft: 'auto' }}>
          {tweet.timeAgo}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

export default TechNewsCard;