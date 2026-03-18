import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const APP_COLORS = {
  background: '#050508',
  surface: '#111B21',
  accent: '#00D2FF',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
};

const CustomOptionModal = ({
  visible,
  title,
  message,
  options = [], // [{ label: string, icon: string, color: string, onPress: function }]
  onCancel,
}) => {
  if (!visible) return null;

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
            <Text style={styles.title}>{title}</Text>
            {message && <Text style={styles.message}>{message}</Text>}

            <ScrollView 
              style={styles.optionsList} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {options.map((option, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.optionItem, { backgroundColor: 'rgba(255,255,255,0.03)' }]} 
                  onPress={option.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.color ? `${option.color}15` : 'rgba(0,210,255,0.1)' }]}>
                    <Ionicons 
                      name={option.icon || 'ellipse-outline'} 
                      size={20} 
                      color={option.color || APP_COLORS.accent} 
                    />
                  </View>
                  <Text style={[styles.optionLabel, { color: option.color || APP_COLORS.textPrimary }]}>
                    {option.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
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
    maxHeight: '80%',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    color: APP_COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: APP_COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsList: {
    width: '100%',
    marginBottom: 16,
  },
  scrollContent: {
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cancelText: {
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default CustomOptionModal;
