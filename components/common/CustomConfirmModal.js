import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const APP_COLORS = {
  background: '#050508',
  surface: '#111B21',
  accent: '#00D2FF',
  danger: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
};

const CustomConfirmModal = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'default', // 'default' | 'danger'
  icon = 'help-circle-outline',
}) => {
  if (!visible) return null;

  // Use standard React Native Animated API for better compatibility
  return (
    <Modal 
      transparent 
      visible={visible} 
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
        )}

        <View style={styles.modalContainer}>
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: type === 'danger' ? 'rgba(239,68,68,0.1)' : 'rgba(0,210,255,0.1)' }]}>
              <Ionicons 
                name={icon} 
                size={32} 
                color={type === 'danger' ? APP_COLORS.danger : APP_COLORS.accent} 
              />
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.confirmButton, { backgroundColor: type === 'danger' ? APP_COLORS.danger : APP_COLORS.accent }]} 
                onPress={onConfirm}
                activeOpacity={0.8}
              >
                <Text style={[styles.confirmText, { color: type === 'danger' ? '#FFFFFF' : '#050508' }]}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  confirmButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default CustomConfirmModal;
