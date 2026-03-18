import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  bg: '#0B1118',
  surface: '#121A23',
  surfaceSoft: '#16202B',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.12)',
  text: '#F3F6FA',
  textMuted: '#A7B4C2',
  textSoft: '#7F8C99',
  primary: '#6EA8FE',
  primarySoft: 'rgba(110,168,254,0.12)',
  success: '#30C48D',
  warning: '#F4B860',
};

const SafeLinearGradient = ({ children, colors, style, ...props }) => {
  const isAvailable = !!UIManager.getViewManagerConfig?.('ExpoLinearGradient');

  if (isAvailable) {
    try {
      const { LinearGradient } = require('expo-linear-gradient');
      return (
        <LinearGradient colors={colors} style={style} {...props}>
          {children}
        </LinearGradient>
      );
    } catch (e) {}
  }

  return (
    <View style={[{ backgroundColor: colors?.[0] || 'transparent' }, style]} {...props}>
      {children}
    </View>
  );
};

export default function ProfileHeader({
  user,
  userData,
  stats,
  onUploadPhoto,
  onCopyEmail,
  onShareProfile,
  onBack,
  onSendVerification,
  PROFILE_IMAGE_MAP,
}) {
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatJoinDate = (date) => {
    if (!date) return 'Just joined';

    try {
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 30) return `${diffDays} days ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    } catch (e) {
      return 'Just joined';
    }
  };

  const displayName =
    userData?.displayName ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'User';

  const profileSource =
    userData?.profileImageId && PROFILE_IMAGE_MAP
      ? PROFILE_IMAGE_MAP[userData.profileImageId]
      : user?.photoURL
      ? { uri: user.photoURL }
      : null;

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 6,
        borderRadius: 28,
        overflow: 'hidden',
        backgroundColor: 'rgba(18,26,35,0.94)',
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <SafeLinearGradient
        colors={['rgba(110,168,254,0.18)', 'rgba(18,26,35,0.98)', 'rgba(18,26,35,1)']}
        style={{
          paddingBottom: 24,
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -70,
            right: -50,
            width: 210,
            height: 210,
            borderRadius: 999,
            backgroundColor: 'rgba(110,168,254,0.08)',
          }}
        />

        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 60,
            left: -30,
            width: 140,
            height: 140,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.03)',
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 18,
            paddingTop: 18,
            paddingBottom: 16,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onBack}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderWidth: 1,
              borderColor: COLORS.border,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 12,
                fontWeight: '700',
                letterSpacing: 1,
              }}
            >
              PROFILE
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onShareProfile}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderWidth: 1,
              borderColor: COLORS.border,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="share-social-outline" size={19} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', paddingHorizontal: 22 }}>
          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                width: 122,
                height: 122,
                borderRadius: 61,
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {profileSource ? (
                <Image
                  source={profileSource}
                  resizeMode="cover"
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: 56,
                  }}
                />
              ) : (
                <SafeLinearGradient
                  colors={['#6EA8FE', '#8AB8FF']}
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: 56,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#0B1118',
                      fontSize: 34,
                      fontWeight: '900',
                    }}
                  >
                    {getInitials(displayName)}
                  </Text>
                </SafeLinearGradient>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onUploadPhoto}
              style={{
                position: 'absolute',
                right: -2,
                bottom: 4,
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: COLORS.surfaceSoft,
                borderWidth: 1,
                borderColor: COLORS.borderStrong,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="camera-outline" size={18} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <Text
            style={{
              color: COLORS.text,
              fontSize: 26,
              fontWeight: '800',
              textAlign: 'center',
              marginBottom: 6,
            }}
          >
            {displayName}
          </Text>

          <Text
            style={{
              color: userData?.bio ? COLORS.textMuted : COLORS.textSoft,
              fontSize: 14,
              textAlign: 'center',
              lineHeight: 21,
              paddingHorizontal: 8,
              marginBottom: 14,
            }}
          >
            {userData?.bio?.trim()
              ? userData.bio
              : 'Focused on clarity, consistency, and productive execution.'}
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onCopyEmail}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              maxWidth: '100%',
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderWidth: 1,
              borderColor: COLORS.border,
              marginBottom: 10,
            }}
          >
            <Ionicons name="mail-outline" size={14} color={COLORS.textMuted} />
            <Text
              numberOfLines={1}
              style={{
                color: COLORS.textMuted,
                fontSize: 13,
                marginHorizontal: 8,
                maxWidth: SCREEN_WIDTH * 0.55,
              }}
            >
              {user?.email}
            </Text>
            <Ionicons name="copy-outline" size={14} color={COLORS.textSoft} />
          </TouchableOpacity>

          {!user?.emailVerified && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onSendVerification}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(244,184,96,0.12)',
                borderColor: 'rgba(244,184,96,0.22)',
                borderWidth: 1,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                marginBottom: 10,
              }}
            >
              <Ionicons name="alert-circle-outline" size={14} color={COLORS.warning} />
              <Text
                style={{
                  color: COLORS.warning,
                  fontSize: 12,
                  fontWeight: '700',
                  marginLeft: 6,
                }}
              >
                Verify your email
              </Text>
            </TouchableOpacity>
          )}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: stats?.streak > 0 ? 10 : 0,
            }}
          >
            <Ionicons name="calendar-outline" size={13} color={COLORS.textSoft} />
            <Text
              style={{
                color: COLORS.textSoft,
                fontSize: 12,
                marginLeft: 6,
              }}
            >
              Member since {formatJoinDate(stats?.joinDate)}
            </Text>
          </View>

          {stats?.streak > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(48,196,141,0.10)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: 'rgba(48,196,141,0.18)',
              }}
            >
              <Ionicons name="flame-outline" size={14} color={COLORS.success} />
              <Text
                style={{
                  color: COLORS.success,
                  fontSize: 12,
                  fontWeight: '700',
                  marginLeft: 6,
                }}
              >
                {stats.streak} day streak
              </Text>
            </View>
          )}
        </View>

        <View
          style={{
            marginTop: 22,
            marginHorizontal: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          {[
            {
              label: 'Decisions',
              value: stats?.decisionsMade ?? 0,
            },
            {
              label: 'Completed',
              value: stats?.completedDecisions ?? 0,
            },
            {
              label: 'Tracked',
              value: stats?.totalTimeTracked ?? '0m',
            },
          ].map((item, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.035)',
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 18,
                paddingVertical: 15,
                paddingHorizontal: 12,
                marginHorizontal: 4,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 18,
                  fontWeight: '800',
                  marginBottom: 4,
                }}
              >
                {item.value}
              </Text>
              <Text
                style={{
                  color: COLORS.textSoft,
                  fontSize: 11,
                  textAlign: 'center',
                }}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </SafeLinearGradient>
    </View>
  );
}