import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const APP_COLORS = {
  background: '#050508',
  surface: '#111B21',
  accent: '#00D2FF',
  success: '#10B981',
  danger: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
};

const CustomInfoModal = ({
  visible,
  title,
  message,
  onClose,
  type = 'info', // 'info' | 'success' | 'error' | 'warning'
  icon,
  buttonText = 'Got it',
}) => {
  if (!visible) return null;

  const getTypeColor = () => {
    switch (type) {
      case 'success': return APP_COLORS.success;
      case 'error': return APP_COLORS.danger;
      case 'warning': return '#F59E0B';
      default: return APP_COLORS.accent;
    }
  };

  const getDefaultIcon = () => {
    switch (type) {
      case 'success': return 'checkmark-circle-outline';
      case 'error': return 'alert-circle-outline';
      case 'warning': return 'warning-outline';
      default: return 'information-circle-outline';
    }
  };

  const typeColor = getTypeColor();

  return (
    <Modal 
      transparent 
      visible={visible} 
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
        )}

        <View style={styles.modalContainer}>
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: `${typeColor}15` }]}>
              <Ionicons 
                name={icon || getDefaultIcon()} 
                size={32} 
                color={typeColor} 
              />
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: typeColor }]} 
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { color: type === 'info' || type === 'success' ? '#050508' : '#FFFFFF' }]}>
                {buttonText}
              </Text>
            </TouchableOpacity>
            </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: APP_COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    color: APP_COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  closeButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default CustomInfoModal;
