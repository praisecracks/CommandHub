// screens/SettingsScreen.js
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Linking,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth } from './firebaseConfig';
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';
import * as Haptics from 'expo-haptics';
import CustomConfirmModal from './components/common/CustomConfirmModal';
import CustomInfoModal from './components/common/CustomInfoModal';

const COLORS = {
  bg: '#050508',
  surface: '#0D0D12',
  surfaceLight: '#151821',
  text: '#FFFFFF',
  textSecondary: '#F8FAFC',
  textMuted: '#94A3B8',
  textSoft: '#64748B',
  primary: '#00D2FF',
  primarySoft: 'rgba(0,210,255,0.1)',
  success: '#10B981',
  successSoft: 'rgba(16,185,129,0.1)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.1)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.1)',
  white10: 'rgba(255,255,255,0.1)',
  white05: 'rgba(255,255,255,0.05)',
};

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Settings states
  const [pushNotifications, setPushNotifications] = useState(true);
  const [signalAlerts, setSignalAlerts] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [compactView, setCompactView] = useState(false);

  // Custom modal states
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'default',
    icon: 'help-circle-outline',
    onConfirm: null,
  });
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showConfirm = (title, message, onConfirm, type = 'default', icon = 'help-circle-outline') => {
    setConfirmModal({
      visible: true,
      title,
      message,
      onConfirm,
      type,
      icon,
    });
  };

  const showInfo = (title, message, type = 'info') => {
    setInfoModal({
      visible: true,
      title,
      message,
      type,
    });
    if (vibrationEnabled) {
      if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleVibrationToggle = (value) => {
    setVibrationEnabled(value);
    if (value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showInfo('Error', 'Passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showInfo('Error', 'Password must be at least 6 characters', 'error');
      return;
    }
    try {
      setLoading(true);
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      showInfo('Success', 'Password changed successfully!', 'success');
      setShowPasswordModal(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error) {
      showInfo('Error', error.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      showInfo('Error', 'Please enter your email address', 'error');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      showInfo('Success', 'Password reset email sent! Check your inbox.', 'success');
      setShowResetPasswordModal(false);
      setResetEmail('');
    } catch (error) {
      showInfo('Error', error.message || 'Failed to send reset email', 'error');
    }
  };

  const handleSignOut = () => {
    if (vibrationEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    showConfirm(
      'Sign Out',
      'Are you sure you want to log out of your account?',
      confirmSignOut,
      'danger',
      'log-out-outline'
    );
  };

  const confirmSignOut = async () => {
    try {
      setConfirmModal(prev => ({ ...prev, visible: false }));
      await signOut(auth);
      navigation.replace('Login');
    } catch (error) {
      showInfo('Error', 'Failed to sign out', 'error');
    }
  };

  const SettingItem = ({ icon, title, subtitle, onPress, showToggle, toggleValue, onToggle, type = 'default' }) => {
    const iconColor = type === 'danger' ? COLORS.danger : COLORS.primary;
    const iconBg = type === 'danger' ? COLORS.dangerSoft : COLORS.primarySoft;
    
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={showToggle}
        activeOpacity={0.7}
        style={styles.settingItem}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingTitle, type === 'danger' && styles.dangerText]}>{title}</Text>
            {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
          </View>
        </View>
        {showToggle ? (
          <TouchableOpacity
            onPress={onToggle}
            style={[
              styles.toggle,
              { backgroundColor: toggleValue ? COLORS.primary : COLORS.white10 }
            ]}
            activeOpacity={0.8}
          >
            <View style={[styles.toggleKnob, toggleValue && styles.toggleKnobActive]} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={COLORS.textSoft} />
        )}
      </TouchableOpacity>
    );
  };

  const SectionHeader = ({ title }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Account Section */}
        <SectionHeader title="Account" />
        <View style={styles.section}>
          <SettingItem
            icon="lock-closed-outline"
            title="Change Password"
            subtitle="Update your password"
            onPress={() => setShowPasswordModal(true)}
          />
          <SettingItem
            icon="key-outline"
            title="Reset Password"
            subtitle="Send reset email"
            onPress={() => setShowResetPasswordModal(true)}
          />
        </View>

        {/* Notifications Section */}
        <SectionHeader title="Notifications" />
        <View style={styles.section}>
          <SettingItem
            icon="notifications-outline"
            title="Push Notifications"
            subtitle="Receive task and system notifications"
            showToggle
            toggleValue={pushNotifications}
            onToggle={() => setPushNotifications(!pushNotifications)}
          />
          <SettingItem
            icon="warning-outline"
            title="Signal Alerts"
            subtitle="External alerts (holidays, weather, news)"
            showToggle
            toggleValue={signalAlerts}
            onToggle={() => setSignalAlerts(!signalAlerts)}
          />
          <SettingItem
            icon="mail-outline"
            title="Email Notifications"
            subtitle="Get updates via email"
            showToggle
            toggleValue={emailNotifications}
            onToggle={() => setEmailNotifications(!emailNotifications)}
          />
          <SettingItem
            icon="phone-portrait-outline"
            title="Vibration"
            subtitle="Haptic feedback for all actions"
            showToggle
            toggleValue={vibrationEnabled}
            onToggle={handleVibrationToggle}
          />
        </View>

        {/* Preferences Section */}
        <SectionHeader title="Preferences" />
        <View style={styles.section}>
          <SettingItem
            icon="apps-outline"
            title="Compact View"
            subtitle="Show more items per screen"
            showToggle
            toggleValue={compactView}
            onToggle={() => setCompactView(!compactView)}
          />
        </View>

        {/* Support Section */}
        <SectionHeader title="Support" />
        <View style={styles.section}>
          <SettingItem
            icon="help-circle-outline"
            title="FAQ"
            subtitle="Frequently asked questions"
            onPress={() => navigation.navigate('FAQ')}
          />
          <SettingItem
            icon="document-text-outline"
            title="Privacy Policy"
            subtitle="Read our privacy policy"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <SettingItem
            icon="mail-outline"
            title="Email Support"
            subtitle="praisecrackdev@gmail.com"
            onPress={() => Linking.openURL('mailto:praisecrackdev@gmail.com')}
          />
        </View>

        {/* Sign Out */}
        <View style={[styles.section, { marginTop: 8 }]}>
          <SettingItem
            icon="log-out-outline"
            title="Sign Out"
            subtitle="Log out of your account"
            onPress={handleSignOut}
            type="danger"
            showChevron={false}
          />
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: COLORS.primarySoft }]}>
                <Ionicons name="lock-closed-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.modalTitle}>Change Password</Text>
            </View>
            
            <Text style={styles.inputLabel}>CURRENT PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter current password"
              placeholderTextColor={COLORS.textSoft}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            
            <Text style={styles.inputLabel}>NEW PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor={COLORS.textSoft}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            
            <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={COLORS.textSoft}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleChangePassword} disabled={loading} style={styles.modalConfirm}>
                <Text style={styles.modalConfirmText}>{loading ? 'Changing...' : 'Change'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset Password Modal */}
      <Modal visible={showResetPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: COLORS.warningSoft }]}>
                <Ionicons name="mail-outline" size={24} color={COLORS.warning} />
              </View>
              <Text style={styles.modalTitle}>Reset Password</Text>
            </View>
            
            <Text style={styles.modalDescription}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
            
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={COLORS.textSoft}
              keyboardType="email-address"
              autoCapitalize="none"
              value={resetEmail}
              onChangeText={setResetEmail}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowResetPasswordModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleResetPassword} disabled={loading} style={styles.modalConfirm}>
                <Text style={styles.modalConfirmText}>{loading ? 'Sending...' : 'Send'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CustomConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        icon={confirmModal.icon}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      />

      <CustomInfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.white10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.white10,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: COLORS.white10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    color: COLORS.textSoft,
    fontSize: 12,
  },
  dangerText: {
    color: COLORS.danger,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  version: {
    color: COLORS.textSoft,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.white10,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '600',
  },
  modalDescription: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
    textAlign: 'center',
  },
  inputLabel: {
    color: COLORS.textSoft,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    color: COLORS.text,
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.white10,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.white05,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.white10,
  },
  modalCancelText: {
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#000',
    fontWeight: '600',
  },
});