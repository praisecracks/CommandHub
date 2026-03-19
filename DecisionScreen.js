import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  Animated,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { auth, db } from './firebaseConfig';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import CustomConfirmModal from './components/common/CustomConfirmModal';
import CustomInfoModal from './components/common/CustomInfoModal';
import DecisionCard from './components/common/DecisionCard';
import AddDecisionModal from './components/decision/AddDecisionModal';
import InAppNotificationService from './components/services/InAppNotificationService';

const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low'];
const FILTERS = ['All', 'Open', 'Completed', 'High Priority'];
const RECURRENCE_OPTIONS = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

const AutoDismissBanner = React.memo(({ message, type, onDismiss }) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        onDismiss();
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, onDismiss]);

  const getBgColor = () => {
    switch (type) {
      case 'offline':
        return '#F59E0B';
      case 'error':
        return '#EF4444';
      case 'success':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'offline':
        return 'cloud-offline';
      case 'error':
        return 'alert-circle';
      case 'success':
        return 'checkmark-circle';
      default:
        return 'information-circle';
    }
  };

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View
        style={{
          backgroundColor: getBgColor(),
          padding: 12,
          marginHorizontal: 20,
          marginTop: 8,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Ionicons
          name={getIcon()}
          size={20}
          color="#000"
          style={{ marginRight: 8 }}
        />
        <Text style={{ color: '#000', flex: 1, fontWeight: '500' }}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
});

const MemoDecisionCard = React.memo(DecisionCard);

export default function DecisionScreen({ navigation, route }) {
  const decisionId = route?.params?.decisionId;

  const [newText, setNewText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [selectedDue, setSelectedDue] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState('none');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerStart, setTimerStart] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [isDeletingDecision, setIsDeletingDecision] = useState(false);
  const [decisions, setDecisions] = useState([]);
  const [localDecisions, setLocalDecisions] = useState([]);
  const [isOffline, setIsOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const [banner, setBanner] = useState({
    visible: false,
    message: '',
    type: '',
  });

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

  const notificationSentRef = useRef(false);
  const localDecisionsRef = useRef([]);
  const mountedRef = useRef(true);
  const lastSaveRef = useRef(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const formatTime = useCallback((seconds = 0) => {
    const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
    const hrs = Math.floor(safeSeconds / 3600);
    const mins = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;

    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const showConfirm = useCallback(
    (
      title,
      message,
      onConfirm,
      type = 'default',
      icon = 'help-circle-outline'
    ) => {
      setConfirmModal({
        visible: true,
        title,
        message,
        onConfirm,
        type,
        icon,
      });
    },
    []
  );

  const showInfo = useCallback((title, message, type = 'info') => {
    setInfoModal({
      visible: true,
      title,
      message,
      type,
    });
  }, []);

  const showBanner = useCallback((message, type = 'offline') => {
    setBanner({ visible: true, message, type });
  }, []);

  const hideBanner = useCallback(() => {
    setBanner({ visible: false, message: '', type: '' });
  }, []);

  useEffect(() => {
    const loadLocalDecisions = async () => {
      try {
        const saved = await AsyncStorage.getItem('localDecisions');
        if (saved) {
          const parsed = JSON.parse(saved);
          setLocalDecisions(parsed);
          localDecisionsRef.current = parsed;
        }
      } catch (error) {
        console.error('Error loading local decisions:', error);
      }
    };

    loadLocalDecisions();
  }, []);

  const saveLocalDecisions = useCallback(async (decisionsToSave) => {
    try {
      await AsyncStorage.setItem(
        'localDecisions',
        JSON.stringify(decisionsToSave)
      );
      localDecisionsRef.current = decisionsToSave;
      if (mountedRef.current) {
        setLocalDecisions(decisionsToSave);
      }
    } catch (error) {
      console.error('Error saving local decisions:', error);
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      console.error('Firebase auth is not initialized');
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigation.navigate('Landing');
      }
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00D2FF',
      });
    }
  }, []);

  useEffect(() => {
    const user = auth?.currentUser;

    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const decisionsRef = collection(db, 'users', user.uid, 'decisions');
    const q = query(decisionsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const decisionsData = snapshot.docs.map((snapshotDoc) => {
          const data = snapshotDoc.data();

          return {
            id: snapshotDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.getTime?.() || Date.now(),
            due: data.due || new Date().toISOString(),
            timeSpent: data.timeSpent || 0,
            done: !!data.done,
          };
        });

        if (mountedRef.current) {
          setDecisions(decisionsData);
          setIsOffline(false);
          setIsLoading(false);
          setIsFirstLoad(false);
        }

        saveLocalDecisions(decisionsData);
      },
      (error) => {
        console.error('Firestore error:', error);

        const cached = localDecisionsRef.current || [];

        if (mountedRef.current) {
          if (cached.length > 0) {
            setDecisions(cached);
            setIsOffline(true);
            showBanner('You are offline. Showing saved data.', 'offline');
          } else {
            showBanner('Failed to load decisions', 'error');
          }

          setIsLoading(false);
          setIsFirstLoad(false);
        }
      }
    );

    return () => unsubscribe();
  }, [saveLocalDecisions, showBanner]);

  useEffect(() => {
    if (!notificationSentRef.current && decisions.length > 0 && !isFirstLoad) {
      notificationSentRef.current = true;

      const user = auth?.currentUser;
      if (!user) return;

      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      decisions.forEach((decision) => {
        if (decision.done) return;

        const dueDate = new Date(decision.due);
        const dueDay = new Date(dueDate);
        dueDay.setHours(0, 0, 0, 0);

        if (
          dueDay.getTime() === today.getTime() ||
          dueDay.getTime() === tomorrow.getTime() ||
          (dueDay > tomorrow && dueDay <= nextWeek)
        ) {
          InAppNotificationService.decisionReminder(
            decision.task,
            decision.description || '',
            decision.due,
            user.uid,
            decision.id
          );
        } else if (dueDay < today) {
          InAppNotificationService.decisionOverdue(
            decision.task,
            decision.description || '',
            decision.due,
            user.uid,
            decision.id
          );
        }
      });
    }
  }, [decisions, isFirstLoad]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();

        if (status !== 'granted') {
          showInfo(
            'Notifications Disabled',
            'Enable notifications to receive reminders for your decisions.',
            'warning'
          );
        }
      } catch (error) {
        console.error('Notification permission error:', error);
      }
    })();
  }, [showInfo]);

  const stats = useMemo(() => {
    let open = 0;
    let completed = 0;
    let highPriority = 0;
    let totalTime = 0;

    for (const item of decisions) {
      if (item.done) {
        completed += 1;
      } else {
        open += 1;
      }

      if (
        !item.done &&
        (item.priority === 'critical' || item.priority === 'high')
      ) {
        highPriority += 1;
      }

      totalTime += item.timeSpent || 0;
    }

    return {
      total: decisions.length,
      open,
      completed,
      highPriority,
      totalTime: formatTime(totalTime),
    };
  }, [decisions, formatTime]);

  const filteredDecisions = useMemo(() => {
    let result = [...decisions];

    if (activeFilter === 'Open') {
      result = result.filter((item) => !item.done);
    } else if (activeFilter === 'Completed') {
      result = result.filter((item) => item.done);
    } else if (activeFilter === 'High Priority') {
      result = result.filter(
        (item) => item.priority === 'critical' || item.priority === 'high'
      );
    }

    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter((item) =>
        item.task?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [decisions, activeFilter, searchQuery]);

  const resetForm = useCallback(() => {
    setNewText('');
    setSelectedPriority('medium');
    setSelectedDue(new Date());
    setReminderEnabled(false);
    setReminderTime(new Date());
    setIsRecurring(false);
    setRecurrence('none');
    setEditingId(null);
    setModalVisible(false);
    setShowCalendar(false);
    setShowTimePicker(false);
  }, []);

  const validateInput = useCallback(() => {
    if (!newText.trim()) {
      showInfo('Error', 'Please enter a decision', 'warning');
      return false;
    }

    if (newText.trim().length < 3) {
      showInfo('Error', 'Decision must be at least 3 characters', 'warning');
      return false;
    }

    return true;
  }, [newText, showInfo]);

  const generateRecurring = useCallback((baseDecision) => {
    return [baseDecision];
  }, []);

  const handleAdd = useCallback(async () => {
    const now = Date.now();
    if (now - lastSaveRef.current < 800) return;
    lastSaveRef.current = now;

    if (isSavingDecision) return;
    if (!validateInput()) return;

    const user = auth?.currentUser;

    if (!user) {
      showInfo('Error', 'You must be logged in', 'error');
      return;
    }

    setIsSavingDecision(true);
    setModalVisible(false);

    try {
      const finalRecurrence = isRecurring ? recurrence : 'none';

      const baseDecision = {
        task: newText.trim(),
        description: newText.trim(),
        done: false,
        priority: selectedPriority,
        due: selectedDue.toISOString(),
        createdAt: serverTimestamp(),
        timeSpent: 0,
        recurrence: finalRecurrence,
        reminder: reminderEnabled ? reminderTime.toISOString() : null,
      };

      const decisionsToAdd = generateRecurring(baseDecision);
      const decisionsRef = collection(db, 'users', user.uid, 'decisions');

      for (const decision of decisionsToAdd) {
        await addDoc(decisionsRef, decision);
      }

      resetForm();
      showInfo('Success', 'Decision added successfully', 'success');
    } catch (error) {
      console.error('Error adding decision:', error);
      setModalVisible(true);
      showInfo('Error', 'Failed to save decision. Please try again.', 'error');
    } finally {
      if (mountedRef.current) {
        setIsSavingDecision(false);
      }
    }
  }, [
    isSavingDecision,
    validateInput,
    newText,
    selectedPriority,
    selectedDue,
    isRecurring,
    recurrence,
    reminderEnabled,
    reminderTime,
    generateRecurring,
    resetForm,
    showInfo,
  ]);

  const handleUpdate = useCallback(async () => {
    const now = Date.now();
    if (now - lastSaveRef.current < 800) return;
    lastSaveRef.current = now;

    if (isSavingDecision) return;
    if (!validateInput()) return;

    const user = auth?.currentUser;

    if (!user) {
      showInfo('Error', 'You must be logged in', 'error');
      return;
    }

    setIsSavingDecision(true);
    setModalVisible(false);

    try {
      const finalRecurrence = isRecurring ? recurrence : 'none';
      const decisionRef = doc(db, 'users', user.uid, 'decisions', editingId);

      await updateDoc(decisionRef, {
        task: newText.trim(),
        description: newText.trim(),
        priority: selectedPriority,
        due: selectedDue.toISOString(),
        recurrence: finalRecurrence,
        reminder: reminderEnabled ? reminderTime.toISOString() : null,
        updatedAt: serverTimestamp(),
      });

      resetForm();
      showInfo('Success', 'Decision updated successfully', 'success');
    } catch (error) {
      console.error('Error updating decision:', error);
      setModalVisible(true);
      showInfo('Error', 'Failed to update decision. Please try again.', 'error');
    } finally {
      if (mountedRef.current) {
        setIsSavingDecision(false);
      }
    }
  }, [
    isSavingDecision,
    validateInput,
    editingId,
    newText,
    selectedPriority,
    selectedDue,
    isRecurring,
    recurrence,
    reminderEnabled,
    reminderTime,
    resetForm,
    showInfo,
  ]);

  const handleToggleWithDecision = useCallback(
    async (id, currentDone) => {
      const user = auth?.currentUser;
      if (!user) return;

      try {
        const decisionRef = doc(db, 'users', user.uid, 'decisions', id);

        await updateDoc(decisionRef, {
          done: !currentDone,
        });

        if (!currentDone) {
          const decision = decisions.find((d) => d.id === id);

          if (decision) {
            InAppNotificationService.decisionCompleted(
              decision.task,
              decision.description || '',
              user.uid,
              id
            );
          }
        }
      } catch (error) {
        console.error('Error toggling decision:', error);
        showInfo('Error', 'Failed to update decision status', 'error');
      }
    },
    [decisions, showInfo]
  );

  const handleDelete = useCallback(
    (id) => {
      showConfirm(
        'Delete Decision',
        'Are you sure you want to delete this decision?',
        async () => {
          if (isDeletingDecision) return;

          const user = auth?.currentUser;
          if (!user) return;

          setConfirmModal((prev) => ({ ...prev, visible: false }));
          setIsDeletingDecision(true);

          try {
            const decisionRef = doc(db, 'users', user.uid, 'decisions', id);
            await deleteDoc(decisionRef);
            showInfo('Success', 'Decision deleted successfully', 'success');
          } catch (error) {
            console.error('Error deleting decision:', error);
            showInfo('Error', 'Failed to delete decision', 'error');
          } finally {
            if (mountedRef.current) {
              setIsDeletingDecision(false);
            }
          }
        },
        'danger',
        'trash-outline'
      );
    },
    [showConfirm, showInfo, isDeletingDecision]
  );

  const handleEdit = useCallback((item) => {
    setEditingId(item.id);
    setNewText(item.task || '');
    setSelectedPriority(item.priority || 'medium');
    setSelectedDue(item.due ? new Date(item.due) : new Date());
    setRecurrence(item.recurrence || 'none');
    setIsRecurring((item.recurrence || 'none') !== 'none');
    setReminderEnabled(!!item.reminder);

    if (item.reminder) {
      setReminderTime(new Date(item.reminder));
    } else {
      setReminderTime(new Date());
    }

    setModalVisible(true);
  }, []);

  const handleDeleteCompleted = useCallback(() => {
    const completedCount = decisions.filter((d) => d.done).length;

    if (completedCount === 0) {
      showInfo(
        'No Completed Decisions',
        'There are no completed decisions to delete.',
        'warning'
      );
      return;
    }

    showConfirm(
      'Delete Completed',
      `Delete all ${completedCount} completed decisions?`,
      async () => {
        if (isDeletingDecision) return;

        const user = auth?.currentUser;
        if (!user) return;

        setConfirmModal((prev) => ({ ...prev, visible: false }));
        setIsDeletingDecision(true);

        try {
          const batch = writeBatch(db);

          decisions
            .filter((d) => d.done)
            .forEach((decision) => {
              const ref = doc(db, 'users', user.uid, 'decisions', decision.id);
              batch.delete(ref);
            });

          await batch.commit();

          showInfo(
            'Success',
            `Deleted ${completedCount} completed decisions.`,
            'success'
          );
        } catch (error) {
          console.error('Error batch deleting:', error);
          showInfo(
            'Error',
            'Failed to delete completed decisions',
            'error'
          );
        } finally {
          if (mountedRef.current) {
            setIsDeletingDecision(false);
          }
        }
      },
      'danger',
      'trash-outline'
    );
  }, [decisions, showConfirm, showInfo, isDeletingDecision]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    setTimeout(() => {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }, 800);
  }, []);

  const startTimer = useCallback((id) => {
    setActiveTimer(id);
    setTimerStart(Date.now());
  }, []);

  const stopTimer = useCallback(
    async (id) => {
      if (activeTimer !== id || !timerStart) return;

      const elapsed = Math.floor((Date.now() - timerStart) / 1000);
      const user = auth?.currentUser;

      if (!user) return;

      try {
        const decision = decisions.find((d) => d.id === id);
        if (!decision) return;

        const decisionRef = doc(db, 'users', user.uid, 'decisions', id);

        await updateDoc(decisionRef, {
          timeSpent: (decision.timeSpent || 0) + elapsed,
        });

        showInfo(
          'Time Tracked',
          `Added ${formatTime(elapsed)} to this decision`,
          'success'
        );
      } catch (error) {
        console.error('Error updating time:', error);
        showInfo('Error', 'Failed to update tracked time', 'error');
      } finally {
        if (mountedRef.current) {
          setActiveTimer(null);
          setTimerStart(null);
        }
      }
    },
    [activeTimer, timerStart, decisions, formatTime, showInfo]
  );

  const exportReport = useCallback(async () => {
    try {
      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
              h1 { color: #00D2FF; }
              .stats { display: flex; gap: 12px; flex-wrap: wrap; margin: 20px 0; }
              .stat-box { background: #f3f4f6; padding: 12px 16px; border-radius: 10px; }
              .decision { border: 1px solid #e5e7eb; padding: 15px; margin: 10px 0; border-radius: 10px; }
              .meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
              .priority { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; }
              .critical { background: #EF4444; color: #fff; }
              .high { background: #F59E0B; color: #fff; }
              .medium { background: #10B981; color: #fff; }
              .low { background: #6B7280; color: #fff; }
            </style>
          </head>
          <body>
            <h1>Decision Log Report</h1>
            <div class="stats">
              <div class="stat-box">Total: ${stats.total}</div>
              <div class="stat-box">Open: ${stats.open}</div>
              <div class="stat-box">Completed: ${stats.completed}</div>
              <div class="stat-box">High Priority: ${stats.highPriority}</div>
              <div class="stat-box">Time Tracked: ${stats.totalTime}</div>
            </div>
            <h2>Decisions</h2>
            ${
              decisions.length === 0
                ? '<p>No decisions available.</p>'
                : decisions
                    .map(
                      (d) => `
                  <div class="decision">
                    <h3>${d.task || 'Untitled Decision'}</h3>
                    <p>${d.description || ''}</p>
                    <div class="meta">
                      <span class="priority ${d.priority || 'medium'}">${(
                        d.priority || 'medium'
                      ).toUpperCase()}</span>
                      <span>Due: ${new Date(d.due).toLocaleDateString()}</span>
                      <span>Status: ${d.done ? 'Completed' : 'Open'}</span>
                      <span>Time: ${formatTime(d.timeSpent || 0)}</span>
                    </div>
                  </div>
                `
                    )
                    .join('')
            }
          </body>
        </html>
      `;

      const fileUri = `${FileSystem.documentDirectory}decision-report.html`;

      await FileSystem.writeAsStringAsync(fileUri, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        showInfo(
          'Sharing Unavailable',
          'Sharing is not available on this device.',
          'warning'
        );
        return;
      }

      await Sharing.shareAsync(fileUri);
      showInfo('Export Successful', 'Your report has been generated.', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showInfo(
        'Export Failed',
        'Failed to generate report. Please try again.',
        'error'
      );
    }
  }, [decisions, stats, formatTime, showInfo]);

  const getPriorityConfig = useCallback((priority) => {
    const config = {
      critical: { color: '#EF4444', label: 'CRITICAL' },
      high: { color: '#F59E0B', label: 'HIGH' },
      medium: { color: '#10B981', label: 'MEDIUM' },
      low: { color: '#6B7280', label: 'LOW' },
    };

    return config[priority] || config.medium;
  }, []);

  const getMarkedDates = useCallback(() => {
    const dateString = selectedDue.toISOString().split('T')[0];

    return {
      [dateString]: {
        selected: true,
        selectedColor: '#00D2FF',
      },
    };
  }, [selectedDue]);

  const formatDueDate = useCallback((dueDate) => {
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date();

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) {
      return 'Today';
    }

    if (compareDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const renderDecisionItem = useCallback(
    ({ item }) => (
      <MemoDecisionCard
        item={item}
        activeTimer={activeTimer}
        onToggle={(id) => handleToggleWithDecision(id, item.done)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStartTimer={startTimer}
        onStopTimer={stopTimer}
        formatTime={formatTime}
        formatDueDate={formatDueDate}
        getPriorityConfig={getPriorityConfig}
      />
    ),
    [
      activeTimer,
      handleToggleWithDecision,
      handleEdit,
      handleDelete,
      startTimer,
      stopTimer,
      formatTime,
      formatDueDate,
      getPriorityConfig,
    ]
  );

  const ListHeader = useMemo(() => {
    return (
      <View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.05)',
          }}
        >
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.08)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color="#00D2FF" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: '#FFFFFF',
              }}
            >
              Decision Log
            </Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF' }}>
              Strategic priorities
            </Text>
          </View>

          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(0,210,255,0.2)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={exportReport}
          >
            <Ionicons name="document-text" size={20} color="#00D2FF" />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: '#0d0d12',
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.05)',
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 22,
                  fontWeight: 'bold',
                  marginBottom: 4,
                }}
              >
                {stats.open}
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Open</Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: '#0d0d12',
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.05)',
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 22,
                  fontWeight: 'bold',
                  marginBottom: 4,
                }}
              >
                {stats.highPriority}
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Priority</Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: '#0d0d12',
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.05)',
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 22,
                  fontWeight: 'bold',
                  marginBottom: 4,
                }}
              >
                {stats.completed}
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Done</Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: '#0d0d12',
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.05)',
              marginBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View>
                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                  Total Time Tracked
                </Text>
                <Text
                  style={{
                    color: '#00D2FF',
                    fontSize: 24,
                    fontWeight: 'bold',
                  }}
                >
                  {stats.totalTime}
                </Text>
              </View>

              {stats.completed > 0 && (
                <TouchableOpacity
                  onPress={handleDeleteCompleted}
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.2)',
                    padding: 8,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#EF4444', fontSize: 12 }}>
                    Clear Completed
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#12121a',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 16,
            }}
          >
            <Ionicons
              name="search"
              size={18}
              color="#6B7280"
              style={{ marginRight: 8 }}
            />

            <TextInput
              style={{ flex: 1, fontSize: 15, color: '#FFFFFF' }}
              placeholder="Search decisions..."
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            <FlatList
              data={FILTERS}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item}
              renderItem={({ item: filter }) => {
                const active = activeFilter === filter;

                return (
                  <TouchableOpacity
                    onPress={() => setActiveFilter(filter)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: active
                        ? '#00D2FF'
                        : 'rgba(255,255,255,0.05)',
                      borderWidth: 1,
                      borderColor: active
                        ? '#00D2FF'
                        : 'rgba(255,255,255,0.1)',
                      marginRight: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? '#000' : '#9CA3AF',
                        fontSize: 13,
                        fontWeight: '600',
                      }}
                    >
                      {filter}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {!modalVisible && (
            <TouchableOpacity
              onPress={() => {
                if (isSavingDecision) return;
                setEditingId(null);
                setModalVisible(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(0,210,255,0.1)',
                borderWidth: 1,
                borderColor: 'rgba(0,210,255,0.3)',
                padding: 16,
                borderRadius: 16,
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#00D2FF',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name="add" size={22} color="#000" />
              </View>

              <View>
                <Text
                  style={{
                    color: '#00D2FF',
                    fontSize: 16,
                    fontWeight: 'bold',
                  }}
                >
                  New Decision
                </Text>
                <Text
                  style={{
                    color: '#9CA3AF',
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  Add a strategic task
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [
    navigation,
    exportReport,
    stats,
    handleDeleteCompleted,
    searchQuery,
    activeFilter,
    modalVisible,
    isSavingDecision,
  ]);

  const renderEmptyComponent = useCallback(() => {
    return (
      <View
        style={{
          alignItems: 'center',
          paddingTop: 40,
          paddingBottom: 60,
          paddingHorizontal: 20,
        }}
      >
        <Ionicons name="document-text-outline" size={48} color="#4B5563" />
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 18,
            fontWeight: 'bold',
            marginTop: 12,
          }}
        >
          No decisions found
        </Text>
        <Text
          style={{
            color: '#9CA3AF',
            fontSize: 14,
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          {searchQuery ? 'Try a different search term' : 'Add your first decision'}
        </Text>
      </View>
    );
  }, [searchQuery]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#050508' }} edges={['top']}>
        <StatusBar barStyle="light-content" />

        {banner.visible && (
          <AutoDismissBanner
            message={banner.message}
            type={banner.type}
            onDismiss={hideBanner}
          />
        )}

        <FlatList
          data={filteredDecisions}
          keyExtractor={(item) => item.id}
          renderItem={renderDecisionItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={40}
          windowSize={8}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={{
            paddingBottom: 40,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00D2FF"
            />
          }
        />

        <AddDecisionModal
          visible={modalVisible}
          onClose={() => {
            if (isSavingDecision) return;
            resetForm();
          }}
          editingId={editingId}
          newText={newText}
          setNewText={setNewText}
          selectedPriority={selectedPriority}
          setSelectedPriority={setSelectedPriority}
          selectedDue={selectedDue}
          setSelectedDue={setSelectedDue}
          showCalendar={showCalendar}
          setShowCalendar={setShowCalendar}
          reminderEnabled={reminderEnabled}
          setReminderEnabled={setReminderEnabled}
          reminderTime={reminderTime}
          setReminderTime={setReminderTime}
          showTimePicker={showTimePicker}
          setShowTimePicker={setShowTimePicker}
          isRecurring={isRecurring}
          setIsRecurring={setIsRecurring}
          recurrence={recurrence}
          setRecurrence={setRecurrence}
          isLoading={isSavingDecision}
          onSave={editingId ? handleUpdate : handleAdd}
          getPriorityConfig={getPriorityConfig}
          getMarkedDates={getMarkedDates}
          PRIORITY_OPTIONS={PRIORITY_OPTIONS}
          RECURRENCE_OPTIONS={RECURRENCE_OPTIONS}
        />

        <CustomConfirmModal
          visible={confirmModal.visible}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          icon={confirmModal.icon}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => {
            if (isDeletingDecision) return;
            setConfirmModal((prev) => ({ ...prev, visible: false }));
          }}
        />

        <CustomInfoModal
          visible={infoModal.visible}
          title={infoModal.title}
          message={infoModal.message}
          type={infoModal.type}
          onClose={() => setInfoModal((prev) => ({ ...prev, visible: false }))}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}