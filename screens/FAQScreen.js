// screens/FAQScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

const FAQ_CATEGORIES = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'rocket-outline',
    questions: [
      {
        q: 'What is Command Hub?',
        a: 'Command Hub is a task management and delegation platform designed to help teams and individuals organize work across different departments like Unleashified, Dimplified, Remsana, and GFA Foundation.',
      },
      {
        q: 'How do I create my first task?',
        a: 'Tap the "+" button on the Hub screen or go to the Delegate screen and tap the "Add Task" button. Fill in the task details, select a department, and save.',
      },
      {
        q: 'What are the different quadrants?',
        a: 'The four quadrants are: Only You for personal tasks, Delegate for tasks assigned to others, Waiting for tasks awaiting response, and Escalate for urgent tasks needing immediate attention.',
      },
    ],
  },
  {
    id: 'departments',
    title: 'Departments',
    icon: 'people-outline',
    questions: [
      {
        q: 'What departments are available?',
        a: 'Command Hub supports four departments: Unleashified, Dimplified, Remsana, and GFA Foundation.',
      },
      {
        q: 'How do I assign a task to a department?',
        a: 'When creating or editing a task, select a department from the department picker. This helps track performance across teams.',
      },
      {
        q: 'Where can I see department performance?',
        a: 'You can open the Department Performance section from the Delegate screen or the Activity Dashboard on the Hub screen.',
      },
    ],
  },
  {
    id: 'delegation',
    title: 'Delegation',
    icon: 'swap-horizontal-outline',
    questions: [
      {
        q: 'How do I delegate a task?',
        a: 'Select the Delegate quadrant when creating a task, then choose a contact from your contact list. The task will appear in their delegate view.',
      },
      {
        q: 'Can I reassign a task?',
        a: 'Yes. Open the delegated task and use the Reassign option to change the assignee.',
      },
      {
        q: 'What happens when a delegated task is completed?',
        a: 'Once the assignee completes the task, it moves to history, the original assigner is notified, and performance records update automatically.',
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: 'notifications-outline',
    questions: [
      {
        q: 'What types of notifications does Command Hub send?',
        a: 'You may receive notifications for task assignments, follow-ups, escalations, completions, and external signals such as holidays or weather alerts.',
      },
      {
        q: 'Can I turn off notifications?',
        a: 'Yes. Go to Settings and toggle the notification options based on your preference.',
      },
      {
        q: 'What are Signal Alerts?',
        a: 'Signal Alerts are external notifications like public holidays, weather warnings, and relevant industry updates that may affect planning.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account',
    icon: 'person-outline',
    questions: [
      {
        q: 'How do I change my password?',
        a: 'Go to Settings, open Change Password, enter your current password, and choose a new one.',
      },
      {
        q: 'How do I update my profile information?',
        a: 'Go to your Profile screen and use the Edit Profile option to update your details.',
      },
      {
        q: 'How do I sign out?',
        a: 'Open Settings and tap the Sign Out button at the bottom of the screen.',
      },
    ],
  },
];

const FAQItem = ({ question, answer, isLast }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <View style={[styles.faqItem, !isLast && styles.faqItemBorder]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={toggleExpand}
        style={styles.faqHeader}
      >
        <Text style={styles.faqQuestion}>{question}</Text>
        <Ionicons
          name={expanded ? 'remove-outline' : 'add-outline'}
          size={20}
          color={COLORS.textMuted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.faqAnswerWrap}>
          <Text style={styles.faqAnswerText}>{answer}</Text>
        </View>
      )}
    </View>
  );
};

const FAQCategory = ({ category }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <View style={styles.categoryCard}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={toggleExpand}
        style={styles.categoryHeader}
      >
        <View style={styles.categoryLeft}>
          <View style={styles.categoryIcon}>
            <Ionicons name={category.icon} size={20} color={COLORS.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <Text style={styles.categoryMeta}>
              {category.questions.length} question
              {category.questions.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.textMuted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.categoryContent}>
          {category.questions.map((item, index) => (
            <FAQItem
              key={index}
              question={item.q}
              answer={item.a}
              isLast={index === category.questions.length - 1}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default function FAQScreen() {
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
          <Text style={styles.headerTitle}>FAQ</Text>
          <Text style={styles.headerSubtitle}>
            Answers to common questions
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons
              name="help-circle-outline"
              size={22}
              color={COLORS.primary}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>How can we help?</Text>
            <Text style={styles.introText}>
              Browse through common questions about Command Hub, account access,
              notifications, delegation, and support.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          {FAQ_CATEGORIES.map((category) => (
            <FAQCategory key={category.id} category={category} />
          ))}
        </View>

        <View style={styles.supportCard}>
          <View style={styles.supportTop}>
            <View style={styles.supportIconWrap}>
              <Ionicons name="mail-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.supportTitle}>Still need help?</Text>
            <Text style={styles.supportText}>
              Reach out to support and we’ll help you with anything you couldn’t
              find here.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:praisecrackdev@gmail.com')}
            style={styles.supportButton}
            activeOpacity={0.85}
          >
            <Text style={styles.supportButtonText}>Contact Support</Text>
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
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  introIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  introTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  introText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  categoryCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  categoryMeta: {
    color: COLORS.textSoft,
    fontSize: 12,
    marginTop: 3,
  },
  categoryContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  faqItem: {
    paddingVertical: 2,
  },
  faqItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  faqQuestion: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
    lineHeight: 20,
  },
  faqAnswerWrap: {
    paddingBottom: 14,
    paddingRight: 24,
  },
  faqAnswerText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  supportCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 20,
    padding: 18,
  },
  supportTop: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  supportIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  supportTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  supportText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  supportButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  supportButtonText: {
    color: '#05060A',
    fontSize: 14,
    fontWeight: '800',
  },
});