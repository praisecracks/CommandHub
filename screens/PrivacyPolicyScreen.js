// screens/PrivacyPolicyScreen.js
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const COLORS = {
  background: '#05060A',
  surface: '#0E1117',
  surfaceSoft: '#131A22',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.10)',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textSoft: '#64748B',
  primary: '#38BDF8',
  primarySoft: 'rgba(56,189,248,0.12)',
  white: '#FFFFFF',
};

const POLICY_SECTIONS = [
  {
    title: 'Introduction',
    body: `Welcome to Command Hub ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.`,
  },
  {
    title: 'Information We Collect',
    body: `We collect personal information that you voluntarily provide when you register, update your account, contact support, or use features inside the app.`,
    bullets: [
      'Name and email address',
      'Profile information such as bio and profile picture',
      'Task, delegation, and activity data',
      'Device information and basic usage analytics',
    ],
  },
  {
    title: 'How We Use Your Information',
    body: `We use the information we collect to keep the app working properly and improve your experience.`,
    bullets: [
      'Provide, operate, and maintain the app',
      'Improve and personalize the user experience',
      'Communicate with you for updates and support',
      'Monitor usage trends and app performance',
    ],
  },
  {
    title: 'Data Security',
    body: `We apply reasonable technical and organizational measures to protect the personal information we process. However, no method of transmission over the internet or electronic storage is completely secure, so absolute security cannot be guaranteed.`,
  },
  {
    title: 'Your Data Rights',
    body: `Depending on your location and applicable laws, you may have rights regarding the personal data we hold about you.`,
    bullets: [
      'Access, update, or delete your information',
      'Object to or restrict certain processing',
      'Request a copy of your data where applicable',
      'Withdraw consent where consent is the basis for processing',
    ],
  },
  {
    title: 'Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date on this screen. Continued use of the app after updates means you accept the revised policy.`,
  },
];

const PolicySection = ({ title, body, bullets, isLast }) => {
  return (
    <View style={[styles.section, !isLast && styles.sectionBorder]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.paragraph}>{body}</Text>

      {bullets?.length ? (
        <View style={styles.bulletList}>
          {bullets.map((item, index) => (
            <View key={index} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <Text style={styles.headerSubtitle}>
            How we collect, use, and protect your data
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.topCard}>
          <View style={styles.topIconWrap}>
            <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.topCardTitle}>Your privacy matters</Text>
            <Text style={styles.topCardText}>
              This page explains what information Command Hub collects, how it is
              used, and the choices available to you.
            </Text>
            <Text style={styles.lastUpdated}>Last updated: March 18, 2026</Text>
          </View>
        </View>

        <View style={styles.contentCard}>
          {POLICY_SECTIONS.map((section, index) => (
            <PolicySection
              key={section.title}
              title={section.title}
              body={section.body}
              bullets={section.bullets}
              isLast={index === POLICY_SECTIONS.length - 1}
            />
          ))}
        </View>

        <View style={styles.contactCard}>
          <View style={styles.contactIconWrap}>
            <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
          </View>

          <Text style={styles.contactTitle}>Contact us</Text>
          <Text style={styles.contactText}>
            If you have any questions about this Privacy Policy, you can reach us
            directly through email.
          </Text>

          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:praisecrackdev@gmail.com')}
            style={styles.emailButton}
            activeOpacity={0.85}
          >
            <Text style={styles.emailButtonText}>praisecrackdev@gmail.com</Text>
            <Ionicons name="arrow-forward" size={16} color="#05060A" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  topCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 18,
  },
  topIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topCardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  topCardText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  lastUpdated: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: '600',
  },
  contentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 18,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  sectionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  paragraph: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  bulletList: {
    marginTop: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 8,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  contactCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: 18,
  },
  contactIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  contactText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  emailButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emailButtonText: {
    color: '#05060A',
    fontSize: 14,
    fontWeight: '800',
  },
});