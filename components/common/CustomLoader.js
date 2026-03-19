// components/common/CustomLoader.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Modal,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
  background: '#050508',
  surface: '#111B21',
  primary: '#00D2FF',
  secondary: '#A855F7',
  accent: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  white10: 'rgba(255,255,255,0.1)',
  white05: 'rgba(255,255,255,0.05)',
};

// Import your logo (adjust path as needed)
const LOGO = require('../../assets/CustomLogoNoBg.png');

const CustomLoader = ({
  type = 'inline',
  size = 'medium',
  color = COLORS.primary,
  message,
  subtext,
  progress,
  timeout = 30000,
  cancelable = false,
  onCancel,
  transparent = false,
  visible = true,
  variant = 'command',
  showLogo = true, // NEW: Toggle logo display
  logoSize = 60, // NEW: Custom logo size
}) => {
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);
  const orbitScale = useSharedValue(1);
  const logoScale = useSharedValue(1);
  const [timedOut, setTimedOut] = useState(false);

  const getLoaderSize = () => {
    switch (size) {
      case 'small': return 24;
      case 'large': return 80;
      default: return 48;
    }
  };

  const loaderSize = getLoaderSize();

  useEffect(() => {
    if (visible) {
      rotation.value = withRepeat(
        withTiming(1, { duration: 800, easing: Easing.linear }),
        -1,
        false
      );

      pulse.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 500, easing: Easing.bezier(0.2, 0, 0.2, 1) }),
          withTiming(1, { duration: 500, easing: Easing.bezier(0.2, 0, 0.2, 1) })
        ),
        -1,
        true
      );

      orbitScale.value = withRepeat(
        withSequence(
          withDelay(200, withTiming(1.1, { duration: 300 })),
          withTiming(1, { duration: 300 })
        ),
        -1,
        false
      );

      // Gentle pulse for logo
      logoScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
          withTiming(1, { duration: 1000, easing: Easing.bezier(0.4, 0, 0.2, 1) })
        ),
        -1,
        true
      );

      if (type === 'fullscreen' && Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const timer = setTimeout(() => setTimedOut(true), timeout);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [visible]);

  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 360}deg` }],
  }));

  const reverseRotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * -360}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.15], [0.8, 1]),
  }));

  const orbitScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbitScale.value }],
  }));

  const logoScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => {
    if (progress === undefined) return {};
    return {
      width: withTiming(progress * 100 + '%', { duration: 300 }),
    };
  });

  const renderOrbitDots = () => {
    const dots = [...Array(4)];
    return dots.map((_, i) => {
      const angle = (i * 90) * Math.PI / 180;
      const x = Math.cos(angle) * loaderSize * 0.35;
      const y = Math.sin(angle) * loaderSize * 0.35;
      
      const dotStyle = useAnimatedStyle(() => ({
        transform: [
          { translateX: x },
          { translateY: y },
          { scale: orbitScale.value }
        ],
      }));

      return (
        <Animated.View
          key={i}
          style={[
            styles.orbitDot,
            {
              width: loaderSize * 0.15,
              height: loaderSize * 0.15,
              borderRadius: loaderSize * 0.075,
              backgroundColor: color,
            },
            dotStyle,
          ]}
        />
      );
    });
  };

  // NEW: Logo loader variant
  const renderLogoLoader = () => (
    <View style={[styles.loaderWrapper, { width: logoSize, height: logoSize }]}>
      {/* Outer rotating ring */}
      <Animated.View 
        style={[
          styles.logoRing,
          {
            width: logoSize + 20,
            height: logoSize + 20,
            borderRadius: (logoSize + 20) / 2,
            borderColor: color,
          },
          rotationStyle
        ]} 
      />
      
      {/* Inner rotating ring (opposite direction) */}
      <Animated.View 
        style={[
          styles.logoInnerRing,
          {
            width: logoSize + 10,
            height: logoSize + 10,
            borderRadius: (logoSize + 10) / 2,
            borderColor: color,
          },
          reverseRotationStyle
        ]} 
      />
      
      {/* Logo with gentle pulse */}
      <Animated.View style={logoScaleStyle}>
        <Image 
          source={LOGO}
          style={{
            width: logoSize,
            height: logoSize,
            resizeMode: 'contain',
          }}
        />
      </Animated.View>

      {/* Scanning effect dots */}
      <View style={styles.scanningDots}>
        {[...Array(8)].map((_, i) => {
          const dotAngle = (i * 45) * Math.PI / 180;
          const dotX = Math.cos(dotAngle) * (logoSize + 15);
          const dotY = Math.sin(dotAngle) * (logoSize + 15);
          return (
            <Animated.View
              key={i}
              style={[
                styles.scanDot,
                {
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: color,
                  transform: [
                    { translateX: dotX },
                    { translateY: dotY },
                    { scale: pulse.value }
                  ],
                  opacity: 0.3 - (i * 0.03),
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );

  const renderCommandLoader = () => (
    <View style={[styles.loaderWrapper, type === 'button' && styles.buttonWrapper]}>
      <Animated.View style={[styles.outerRing, { width: loaderSize, height: loaderSize, borderRadius: loaderSize / 2, borderColor: color }, rotationStyle]} />

      <Animated.View 
        style={[
          styles.middleRing, 
          { 
            width: loaderSize * 0.8, 
            height: loaderSize * 0.8, 
            borderRadius: loaderSize * 0.4,
            borderColor: color,
          },
          reverseRotationStyle
        ]} 
      />

      {/* Replace inner core with logo if showLogo is true */}
      {showLogo ? (
        <Animated.View style={logoScaleStyle}>
          <Image 
            source={LOGO}
            style={{
              width: loaderSize * 0.5,
              height: loaderSize * 0.5,
              resizeMode: 'contain',
            }}
          />
        </Animated.View>
      ) : (
        <Animated.View 
          style={[
            styles.innerCore,
            { 
              width: loaderSize * 0.4, 
              height: loaderSize * 0.4, 
              borderRadius: loaderSize * 0.2,
              backgroundColor: color,
            },
            pulseStyle
          ]} 
        >
          <View style={[styles.coreInner, { backgroundColor: COLORS.background }]} />
        </Animated.View>
      )}

      {progress !== undefined && (
        <View style={[styles.progressRing, { width: loaderSize * 1.2, height: loaderSize * 1.2 }]}>
          <Animated.View 
            style={[
              styles.progressFill,
              { 
                width: loaderSize * 1.2, 
                height: loaderSize * 1.2,
                borderColor: color,
              },
              progressStyle
            ]} 
          />
        </View>
      )}
    </View>
  );

  const renderPulseLoader = () => (
    <View style={styles.loaderWrapper}>
      {[...Array(3)].map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.pulseRing,
            {
              width: loaderSize * (0.8 + i * 0.3),
              height: loaderSize * (0.8 + i * 0.3),
              borderRadius: loaderSize * (0.8 + i * 0.3) / 2,
              borderColor: color,
              opacity: 0.3 - i * 0.1,
            },
            pulseStyle
          ]}
        />
      ))}
      {showLogo ? (
        <Animated.View style={logoScaleStyle}>
          <Image 
            source={LOGO}
            style={{
              width: loaderSize * 0.4,
              height: loaderSize * 0.4,
              resizeMode: 'contain',
            }}
          />
        </Animated.View>
      ) : (
        <View style={[styles.pulseCore, { width: loaderSize * 0.3, height: loaderSize * 0.3, borderRadius: loaderSize * 0.15, backgroundColor: color }]} />
      )}
    </View>
  );

  const renderOrbitLoader = () => (
    <View style={styles.loaderWrapper}>
      <Animated.View style={[styles.orbitRing, { width: loaderSize, height: loaderSize }, rotationStyle]}>
        {renderOrbitDots()}
      </Animated.View>
      {showLogo ? (
        <Animated.View style={logoScaleStyle}>
          <Image 
            source={LOGO}
            style={{
              width: loaderSize * 0.3,
              height: loaderSize * 0.3,
              resizeMode: 'contain',
            }}
          />
        </Animated.View>
      ) : (
        <Animated.View 
          style={[
            styles.orbitCore, 
            { 
              width: loaderSize * 0.2, 
              height: loaderSize * 0.2, 
              borderRadius: loaderSize * 0.1, 
              backgroundColor: color 
            },
            orbitScaleStyle
          ]} 
        />
      )}
    </View>
  );

  const renderLoaderUI = () => {
    // Special logo-only loader
    if (variant === 'logo') {
      return renderLogoLoader();
    }
    
    switch (variant) {
      case 'pulse':
        return renderPulseLoader();
      case 'orbit':
        return renderOrbitLoader();
      default:
        return renderCommandLoader();
    }
  };

  if (!visible) return null;

  if (type === 'fullscreen') {
    const [isVisible, setIsVisible] = useState(true);
    
    useEffect(() => {
      setIsVisible(visible);
    }, [visible]);

    if (!isVisible) return null;

    return (
      <Modal transparent visible={visible} animationType="fade">
        <View style={[styles.fullscreenContainer, !transparent && { backgroundColor: COLORS.background }]}>
          <Animated.View 
            entering={FadeIn.duration(300)} 
            exiting={FadeOut.duration(200)}
            style={styles.contentContainer}
          >
            {renderLoaderUI()}
            
            {message && <Text style={[styles.message, { marginTop: 24 }]}>{message}</Text>}
            {subtext && <Text style={styles.subtext}>{subtext}</Text>}

            {progress !== undefined && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressTrack, { backgroundColor: COLORS.white10 }]}>
                  <Animated.View style={[styles.progressBar, { backgroundColor: color }, progressStyle]} />
                </View>
                <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
              </View>
            )}

            {(cancelable || timedOut) && (
              <TouchableOpacity 
                onPress={onCancel}
                style={[styles.cancelButton, timedOut && styles.cancelButtonDanger]}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelText, timedOut && styles.cancelTextDanger]}>
                  {timedOut ? 'Taking too long? Tap to cancel' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
      </Modal>
    );
  }

  if (type === 'button') {
    return (
      <View style={styles.buttonLoader}>
        {showLogo ? (
          <Image 
            source={LOGO}
            style={{
              width: 20,
              height: 20,
              resizeMode: 'contain',
            }}
          />
        ) : (
          <Animated.View style={[styles.buttonRing, { width: 16, height: 16, borderColor: color }, rotationStyle]} />
        )}
      </View>
    );
  }

  if (type === 'skeleton') {
    return (
      <Animated.View 
        entering={FadeIn}
        style={[
          styles.skeleton, 
          { 
            width: '100%', 
            height: size === 'small' ? 20 : 60, 
            borderRadius: 8,
            backgroundColor: COLORS.white05,
          },
          pulseStyle
        ]} 
      />
    );
  }

  return (
    <View style={[styles.inlineContainer, { padding: size === 'small' ? 8 : 20 }]}>
      {renderLoaderUI()}
      {message && <Text style={[styles.inlineMessage, { fontSize: size === 'small' ? 12 : 14, marginTop: 12 }]}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    padding: 40,
  },
  inlineContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  middleRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  innerCore: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  coreInner: {
    width: '60%',
    height: '60%',
    borderRadius: 100,
  },
  // New styles for logo loader
  logoRing: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    opacity: 0.3,
  },
  logoInnerRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dotted',
    opacity: 0.5,
  },
  scanningDots: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanDot: {
    position: 'absolute',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 1,
    opacity: 0.3,
  },
  pulseCore: {
    position: 'absolute',
  },
  orbitRing: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitDot: {
    position: 'absolute',
  },
  orbitCore: {
    position: 'absolute',
  },
  progressRing: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressFill: {
    position: 'absolute',
    borderWidth: 2,
    borderLeftColor: 'transparent',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '-45deg' }],
  },
  progressContainer: {
    width: '100%',
    marginTop: 20,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  message: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  inlineMessage: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtext: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 40,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.white10,
  },
  cancelButtonDanger: {
    borderColor: COLORS.danger,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  cancelTextDanger: {
    color: COLORS.danger,
  },
  buttonLoader: {
    paddingHorizontal: 8,
  },
  buttonRing: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderRadius: 8,
  },
  buttonWrapper: {
    transform: [{ scale: 0.5 }],
  },
  skeleton: {
    backgroundColor: COLORS.white05,
  },
});

export default CustomLoader;