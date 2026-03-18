// screens/HubScreen.js (updated)
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
  Modal,
  ActivityIndicator,
  TextInput,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { auth, db } from './firebaseConfig';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HubNavbar from './components/hub/HubNavbar';
import CustomLoader from './components/common/CustomLoader';
import CustomConfirmModal from './components/common/CustomConfirmModal';
import CustomInfoModal from './components/common/CustomInfoModal';
import ActivityDashboard from './components/hub/ActivityDashboard'; // Updated import
import TechNewsFeed from './components/hub/TechNewsFeed';

const COLORS = {
  bg: '#07080D',
  surface: '#11131A',
  surfaceSoft: '#151821',
  surfaceAlt: '#0D1016',
  border: 'rgba(255,255,255,0.06)',
  borderSoft: 'rgba(255,255,255,0.08)',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textSoft: '#64748B',
  primary: '#22C7FF',
  primarySoft: 'rgba(34,199,255,0.14)',
  success: '#10B981',
  successSoft: 'rgba(16,185,129,0.14)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.14)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.14)',
  purple: '#8B5CF6',
  purpleSoft: 'rgba(139,92,246,0.14)',
  white10: 'rgba(255,255,255,0.1)',
  white05: 'rgba(255,255,255,0.05)',
};

const QuickDecisionModal = memo(({ visible, onClose, onSave }) => {
  const [task, setTask] = useState('');
  const [priority, setPriority] = useState('medium');

  const priorityConfig = {
    critical: { color: COLORS.danger, label: 'Critical' },
    high: { color: COLORS.warning, label: 'High' },
    medium: { color: COLORS.success, label: 'Medium' },
    low: { color: COLORS.textSoft, label: 'Low' },
  };

  const handleSave = () => {
    if (!task.trim()) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onSave(task, priority);
    setTask('');
    setPriority('medium');
    onClose();
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheetContainer}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetCard}>
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Quick Decision</Text>
                <TouchableOpacity onPress={onClose} style={styles.sheetClose}>
                  <Ionicons name="close" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.sheetSubtitle}>
                Add a quick task or decision to your hub.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="What do you want to add?"
                placeholderTextColor={COLORS.textSoft}
                value={task}
                onChangeText={setTask}
                multiline
                autoFocus
              />

              <Text style={styles.priorityLabel}>Priority</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.priorityRow}>
                  {Object.keys(priorityConfig).map((item) => {
                    const active = priority === item;
                    const config = priorityConfig[item];

                    return (
                      <TouchableOpacity
                        key={item}
                        onPress={() => setPriority(item)}
                        style={[
                          styles.priorityChip,
                          {
                            backgroundColor: active ? config.color : COLORS.surfaceSoft,
                            borderColor: active ? config.color : COLORS.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityChipText,
                            { color: active ? '#000' : COLORS.text },
                          ]}
                        >
                          {config.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={styles.sheetActions}>
                <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={!task.trim()}
                  style={[
                    styles.saveButton,
                    { opacity: task.trim() ? 1 : 0.55 },
                  ]}
                >
                  <Text style={styles.saveButtonText}>Save Decision</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

const StatCard = memo(({ label, value, valueColor = COLORS.text, icon, iconBg }) => {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: iconBg || COLORS.primarySoft }]}>
        <Ionicons name={icon} size={16} color={valueColor} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
});

const SectionHeader = memo(({ title, subtitle, onPress, actionIcon = 'arrow-forward' }) => {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>

      {onPress && (
        <TouchableOpacity onPress={onPress} style={styles.sectionAction}>
          <Ionicons name={actionIcon} size={18} color={COLORS.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
});

export default function HubScreen() {
  const navigation = useNavigation();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [decisions, setDecisions] = useState([]);
  const [upcomingDecisions, setUpcomingDecisions] = useState([]);
  const [delegations, setDelegations] = useState([]);
  const [signals, setSignals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickModalVisible, setQuickModalVisible] = useState(false);
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

  const techHubAnim = useRef(new Animated.Value(0.72)).current;
  const farmRunnerAnim = useRef(new Animated.Value(0.45)).current;

  // 1. Load from cache immediately
  useEffect(() => {
    const loadCache = async () => {
      const user = auth?.currentUser;
      if (!user) return;
      
      try {
        const cached = await AsyncStorage.getItem(`@hub_decisions_${user.uid}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setDecisions(parsed);
          
          const upcoming = parsed
            .filter((d) => !d.done && d.due && new Date(d.due) > new Date())
            .sort((a, b) => new Date(a.due) - new Date(b.due))
            .slice(0, 3);
          setUpcomingDecisions(upcoming);
          setIsLoading(false);
        }
      } catch (err) {
        console.log('Error loading hub cache:', err);
      }
    };
    loadCache();
  }, []);

  const truncateText = (text, maxLength = 28) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

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
  };

  useFocusEffect(
    useCallback(() => {
      const user = auth?.currentUser;

      if (!user) {
        setIsLoading(false);
        setDecisions([]);
        setUpcomingDecisions([]);
        setDelegations([]);
        setSignals([]);
        return;
      }

      setIsLoading(true);

      // Decisions listener
      const decisionsRef = collection(db, 'users', user.uid, 'decisions');
      const decisionsQuery = query(decisionsRef, orderBy('createdAt', 'desc'), limit(6));
      
      // Delegations listener
      const delegationsRef = collection(db, 'users', user.uid, 'delegations');
      const delegationsQuery = query(delegationsRef, orderBy('createdAt', 'desc'), limit(5));
      
      // Signals listener
      const signalsRef = collection(db, 'users', user.uid, 'signals');
      const signalsQuery = query(signalsRef, orderBy('createdAt', 'desc'), limit(5));

      const unsubscribeDecisions = onSnapshot(
        decisionsQuery,
        (snapshot) => {
          const decisionsData = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
            createdAt: item.data().createdAt?.toDate?.()?.getTime() || Date.now(),
          }));

          setDecisions(decisionsData);

          const upcoming = decisionsData
            .filter((d) => !d.done && d.due && new Date(d.due) > new Date())
            .sort((a, b) => new Date(a.due) - new Date(b.due))
            .slice(0, 3);

          setUpcomingDecisions(upcoming);
          setIsLoading(false);

          // Update cache
          AsyncStorage.setItem(`@hub_decisions_${user.uid}`, JSON.stringify(decisionsData)).catch(err => {
            console.log('Error saving hub cache:', err);
          });
        },
        (error) => {
          console.error('Firestore error:', error);
          setIsLoading(false);
        }
      );

      const unsubscribeDelegations = onSnapshot(
        delegationsQuery,
        (snapshot) => {
          const delegationsData = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
            createdAt: item.data().createdAt?.toDate?.() || new Date(),
          }));
          setDelegations(delegationsData);
        },
        (error) => {
          console.error('Error loading delegations:', error);
        }
      );

      const unsubscribeSignals = onSnapshot(
        signalsQuery,
        (snapshot) => {
          const signalsData = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
            createdAt: item.data().createdAt?.toDate?.() || new Date(),
          }));
          setSignals(signalsData);
        },
        (error) => {
          console.error('Error loading signals:', error);
        }
      );

      return () => {
        unsubscribeDecisions();
        unsubscribeDelegations();
        unsubscribeSignals();
      };
    }, [])
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Animated.stagger(180, [
      Animated.timing(techHubAnim, {
        toValue: 0.72,
        duration: 1300,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }),
      Animated.timing(farmRunnerAnim, {
        toValue: 0.45,
        duration: 1300,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }),
    ]).start();
  }, [techHubAnim, farmRunnerAnim]);

  const handleQuickAdd = async (task, priority) => {
    const user = auth?.currentUser;

    if (!user) {
      showInfo('Authentication Required', 'You must be logged in to add a decision.', 'error');
      return;
    }

    try {
      const decisionsRef = collection(db, 'users', user.uid, 'decisions');

      await addDoc(decisionsRef, {
        task,
        done: false,
        priority,
        due: new Date(Date.now() + 86400000).toISOString(),
        createdAt: serverTimestamp(),
        timeSpent: 0,
        recurrence: 'none',
        reminder: null,
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      showInfo('Saved', 'Your decision has been added successfully.', 'success');
    } catch (error) {
      console.error('Error adding decision:', error);
      showInfo('Error', 'Failed to add decision.', 'error');
    }
  };

  const toggleDecision = async (id, currentDone) => {
    const user = auth?.currentUser;
    if (!user) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const decisionRef = doc(db, 'users', user.uid, 'decisions', id);
      await updateDoc(decisionRef, {
        done: !currentDone,
      });
    } catch (error) {
      console.error('Error toggling decision:', error);
      showInfo('Error', 'Failed to update decision.', 'error');
    }
  };

  const handleDelete = (id) => {
    showConfirm(
      'Delete Decision',
      'Are you sure you want to remove this decision from your list?',
      async () => {
        const user = auth?.currentUser;
        if (!user) return;

        try {
          const decisionRef = doc(db, 'users', user.uid, 'decisions', id);
          await deleteDoc(decisionRef);
          setConfirmModal(prev => ({ ...prev, visible: false }));
          showInfo('Deleted', 'Decision removed successfully.', 'success');
        } catch (error) {
          console.error('Error deleting decision:', error);
          showInfo('Error', 'Failed to delete decision.', 'error');
        }
      },
      'danger',
      'trash-outline'
    );
  };

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return {
      timeString: `${hours}:${minutes}`,
      ampm,
      dateString: date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
    };
  };

  const formatDueDate = (dueDate) => {
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return COLORS.danger;
      case 'high':
        return COLORS.warning;
      case 'medium':
        return COLORS.success;
      default:
        return COLORS.textSoft;
    }
  };

  const getPriorityBg = (priority) => {
    switch (priority) {
      case 'critical':
        return COLORS.dangerSoft;
      case 'high':
        return COLORS.warningSoft;
      case 'medium':
        return COLORS.successSoft;
      default:
        return 'rgba(100,116,139,0.15)';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'critical':
        return 'Critical';
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      default:
        return 'Low';
    }
  };

  const completedCount = decisions.filter((d) => d.done).length;
  const activePriorityCount = decisions.filter(
    (d) => !d.done && (d.priority === 'critical' || d.priority === 'high')
  ).length;
  const { timeString, ampm, dateString } = formatTime(currentTime);

  if (isLoading && decisions.length === 0) {
    return (
      <CustomLoader 
        type="fullscreen" 
        message="Loading your workspace..." 
        subtext="Preparing your command hub"
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.container}>
        <HubNavbar
          onPressProfile={() => navigation.navigate('Profile')}
          onPressNotifications={() => navigation.navigate('Notifications')}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroGreeting}>{getGreeting()}</Text>
                <Text style={styles.heroTitle}>Your Hub Overview</Text>
                <Text style={styles.heroSubtext}>
                  Stay focused, track priorities, and keep your momentum going.
                </Text>
              </View>

              <View style={styles.timeBubble}>
                <Text style={styles.timeText}>{timeString}</Text>
                <Text style={styles.timeAmPm}>{ampm}</Text>
              </View>
            </View>

            <View style={styles.heroBottomRow}>
              <View style={styles.datePill}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                <Text style={styles.datePillText}>{dateString}</Text>
              </View>

              <TouchableOpacity
                onPress={() => setQuickModalVisible(true)}
                style={styles.heroActionButton}
              >
                <Ionicons name="add" size={16} color="#000" />
                <Text style={styles.heroActionText}>Quick Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatCard
              label="Total"
              value={decisions.length}
              valueColor={COLORS.text}
              icon="albums-outline"
              iconBg={COLORS.primarySoft}
            />
            <StatCard
              label="Completed"
              value={completedCount}
              valueColor={COLORS.success}
              icon="checkmark-done-outline"
              iconBg={COLORS.successSoft}
            />
            <StatCard
              label="Priority"
              value={activePriorityCount}
              valueColor={COLORS.danger}
              icon="flame-outline"
              iconBg={COLORS.dangerSoft}
            />
          </View>

          {/* Activity Dashboard - Shows department performance */}
          <View style={styles.sectionCard}>
            <ActivityDashboard
              delegations={delegations} // Only need delegations now
            />
          </View>

          <View style={styles.sectionCard}>
            <SectionHeader
              title="Today’s Decisions"
              subtitle="Your latest focus items"
              onPress={() => navigation.navigate('DecisionScreen')}
            />

            {decisions.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="document-text-outline" size={28} color={COLORS.textSoft} />
                </View>
                <Text style={styles.emptyTitle}>No decisions yet</Text>
                <Text style={styles.emptySubtitle}>
                  Start by adding a quick decision to organize your day.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {decisions.slice(0, 3).map((item) => (
                  <View key={item.id} style={styles.decisionItem}>
                    <TouchableOpacity
                      onPress={() => toggleDecision(item.id, item.done)}
                      style={[
                        styles.checkCircle,
                        item.done && styles.checkCircleActive,
                      ]}
                    >
                      {item.done && <Ionicons name="checkmark" size={14} color="#000" />}
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.decisionText,
                          item.done && styles.decisionTextDone,
                        ]}
                      >
                        {truncateText(item.task, 36)}
                      </Text>

                      <View style={styles.metaRow}>
                        <View
                          style={[
                            styles.priorityBadge,
                            { backgroundColor: getPriorityBg(item.priority) },
                          ]}
                        >
                          <View
                            style={[
                              styles.priorityDot,
                              { backgroundColor: getPriorityColor(item.priority) },
                            ]}
                          />
                          <Text
                            style={[
                              styles.priorityBadgeText,
                              { color: getPriorityColor(item.priority) },
                            ]}
                          >
                            {getPriorityLabel(item.priority)}
                          </Text>
                        </View>

                        {item?.due ? (
                          <Text style={styles.metaDue}>Due {formatDueDate(item.due)}</Text>
                        ) : null}
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleDelete(item.id)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Tech News Feed */}
          <View style={styles.sectionCard}>
            <TechNewsFeed limit={3} />
          </View>
        </ScrollView>
      </View>

      <QuickDecisionModal
        visible={quickModalVisible}
        onClose={() => setQuickModalVisible(false)}
        onSave={handleQuickAdd}
      />

      <CustomConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        icon={confirmModal.icon}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
      />

      <CustomInfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  scrollContent: {
    paddingBottom: 30,
  },

  loaderScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: COLORS.text,
    marginTop: 14,
    fontSize: 15,
    fontWeight: '500',
  },

  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  heroGreeting: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSubtext: {
    color: COLORS.textMuted,
    fontSize: 13.5,
    lineHeight: 20,
    maxWidth: '92%',
  },
  timeBubble: {
    minWidth: 86,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginLeft: 12,
  },
  timeText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  timeAmPm: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 8,
  },
  datePillText: {
    color: COLORS.textMuted,
    fontSize: 12.5,
    fontWeight: '600',
  },
  heroActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  heroActionText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    marginBottom: 6,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },

  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12.5,
    marginTop: 3,
  },
  sectionAction: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },

  decisionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.8,
    borderColor: COLORS.white10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  checkCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  decisionText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  decisionTextDone: {
    color: COLORS.textSoft,
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginRight: 6,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaDue: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    fontWeight: '600',
  },
  deleteBtn: {
    marginLeft: 10,
    padding: 6,
  },

  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.white10,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: '800',
  },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 18,
  },
  input: {
    backgroundColor: COLORS.surfaceSoft,
    color: COLORS.text,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 15,
    marginBottom: 16,
  },
  priorityLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },
  priorityChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  priorityChipText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 22,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
});
