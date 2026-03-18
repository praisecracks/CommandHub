// components/delegate/NotificationModal.js
import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function NotificationModal({
  visible,
  onClose,
  onSMS,
  onWhatsApp,
  contactName,
  smsAvailable = true,
  messageType = 'task' // 'task' or 'followup'
}) {
  
  const getTitle = () => {
    if (messageType === 'followup') {
      return 'Send Follow-up';
    }
    return 'Send Notification';
  };

  const getMessage = () => {
    if (messageType === 'followup') {
      return `Follow up with ${contactName} about their task?`;
    }
    return `How would you like to notify ${contactName}?`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="notifications-outline" size={28} color="#00D2FF" />
            </View>
            <Text style={styles.title}>{getTitle()}</Text>
            <Text style={styles.subtitle}>{getMessage()}</Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* SMS Option */}
            {smsAvailable && (
              <TouchableOpacity
                style={styles.optionButton}
                onPress={onSMS}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { backgroundColor: 'rgba(0,210,255,0.1)' }]}>
                  <Ionicons name="chatbubble-outline" size={24} color="#00D2FF" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>SMS</Text>
                  <Text style={styles.optionDescription}>
                    {messageType === 'followup' 
                      ? 'Send follow-up via text message'
                      : 'Send task details via SMS'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}

            {/* WhatsApp Option */}
            <TouchableOpacity
              style={styles.optionButton}
              onPress={onWhatsApp}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(37,211,102,0.1)' }]}>
                <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>WhatsApp</Text>
                <Text style={styles.optionDescription}>
                  {messageType === 'followup'
                    ? 'Send follow-up via WhatsApp DM'
                    : 'Send task details via WhatsApp'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* SMS Not Available Notice */}
          {!smsAvailable && (
            <View style={styles.noticeContainer}>
              <Ionicons name="information-circle-outline" size={16} color="#F59E0B" />
              <Text style={styles.noticeText}>
                SMS not available on this device
              </Text>
            </View>
          )}

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1B1C24',
    borderRadius: 28,
    padding: 24,
    width: width * 0.85,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,210,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  optionsContainer: {
    marginBottom: 20,
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  noticeText: {
    color: '#F59E0B',
    fontSize: 12,
    flex: 1,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelText: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
});