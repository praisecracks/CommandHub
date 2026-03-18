import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
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

// IMPORT YOUR NEW COMPONENTS
import CustomLoader from './components/common/CustomLoader';
import CustomConfirmModal from './components/common/CustomConfirmModal';
import CustomInfoModal from './components/common/CustomInfoModal';
import DecisionCard from './components/common/DecisionCard';
import AddDecisionModal from './components/decision/AddDecisionModal';
import InAppNotificationService from './components/services/InAppNotificationService'; // NEW

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low'];
const FILTERS = ['All', 'Open', 'Completed', 'High Priority'];
const RECURRENCE_OPTIONS = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

// Configure notifications with proper handler
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

// Auto-dismiss Banner Component
const AutoDismissBanner = ({ message, type, onDismiss }) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onDismiss();
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const getBgColor = () => {
    switch(type) {
      case 'offline': return '#F59E0B';
      case 'error': return '#EF4444';
      case 'success': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getIcon = () => {
    switch(type) {
      case 'offline': return 'cloud-offline';
      case 'error': return 'alert-circle';
      case 'success': return 'checkmark-circle';
      default: return 'information-circle';
    }
  };

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={{ backgroundColor: getBgColor(), padding: 12, marginHorizontal: 20, marginTop: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name={getIcon()} size={20} color="#000" style={{ marginRight: 8 }} />
        <Text style={{ color: '#000', flex: 1, fontWeight: '500' }}>{message}</Text>
      </View>
    </Animated.View>
  );
};

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
  
  // New state for features
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState('none');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerStart, setTimerStart] = useState(null);
  
  // Loading, error and offline states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [localDecisions, setLocalDecisions] = useState([]);
  const [isOffline, setIsOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Banner visibility
  const [banner, setBanner] = useState({ visible: false, message: '', type: '' });
  
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

  // Format time function
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show custom modal
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

  // Show banner
  const showBanner = (message, type = 'offline') => {
    setBanner({ visible: true, message, type });
  };

  // Hide banner
  const hideBanner = () => {
    setBanner({ visible: false, message: '', type: '' });
  };

  // Load local decisions from AsyncStorage (offline fallback)
  useEffect(() => {
    loadLocalDecisions();
  }, []);

  const loadLocalDecisions = async () => {
    try {
      const saved = await AsyncStorage.getItem('localDecisions');
      if (saved) {
        setLocalDecisions(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading local decisions:', error);
    }
  };

  const saveLocalDecisions = async (decisionsToSave) => {
    try {
      await AsyncStorage.setItem('localDecisions', JSON.stringify(decisionsToSave));
    } catch (error) {
      console.error('Error saving local decisions:', error);
    }
  };

  // Check if user is authenticated
  useEffect(() => {
    if (!auth) {
      console.error('Firebase auth is not initialized');
      return;
    }
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigation.navigate('Login');
      }
    });
    return unsubscribe;
  }, []);

  // Create notification channel for Android
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

  // Real-time Firebase listener with offline fallback
  useEffect(() => {
    const user = auth?.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const decisionsRef = collection(db, 'users', user.uid, 'decisions');
    const q = query(decisionsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const decisionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.getTime() || Date.now(),
          due: doc.data().due || new Date().toISOString(),
        }));
        setDecisions(decisionsData);
        // Save to local storage for offline access
        saveLocalDecisions(decisionsData);
        setIsLoading(false);

        // Check if we need to open a specific decision from navigation params
        if (decisionId) {
          const decision = decisionsData.find(d => d.id === decisionId);
          if (decision) {
            setEditingId(decision.id);
            setNewText(decision.task || '');
            setSelectedPriority(decision.priority || 'medium');
            setSelectedDue(new Date(decision.due));
            setModalVisible(true);
          }
        }
      },
      (error) => {
        console.error('Firestore error:', error);
        // Fallback to local decisions when offline
        if (localDecisions.length > 0) {
          setDecisions(localDecisions);
          showBanner('You are offline. Showing saved data.', 'offline');
          setIsOffline(true);
        } else {
          setError('Failed to load decisions. Please check your connection.');
          showBanner('Failed to load decisions', 'error');
        }
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [localDecisions.length]);

  // 🔔 NEW: Check for due decisions and create notifications
  const checkDueDecisions = useCallback(async () => {
    const user = auth?.currentUser;
    if (!user || decisions.length === 0) return;

    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    decisions.forEach(decision => {
      if (decision.done) return; // Skip completed decisions
      
      const dueDate = new Date(decision.due);
      const dueDay = new Date(dueDate.setHours(0, 0, 0, 0));
      
      // Due today
      if (dueDay.getTime() === today.getTime()) {
        InAppNotificationService.decisionReminder(
          decision.task,
          decision.description || '',
          decision.due,
          user.uid,
          decision.id
        );
      }
      
      // Due tomorrow
      else if (dueDay.getTime() === tomorrow.getTime()) {
        InAppNotificationService.decisionReminder(
          decision.task,
          decision.description || '',
          decision.due,
          user.uid,
          decision.id
        );
      }
      
      // Due this week (but not today/tomorrow)
      else if (dueDay > tomorrow && dueDay <= nextWeek) {
        InAppNotificationService.decisionReminder(
          decision.task,
          decision.description || '',
          decision.due,
          user.uid,
          decision.id
        );
      }
      
      // Overdue
      else if (dueDay < today) {
        InAppNotificationService.decisionOverdue(
          decision.task,
          decision.description || '',
          decision.due,
          user.uid,
          decision.id
        );
      }
    });
  }, [decisions]);

  // 🔔 NEW: Run check when decisions load and every hour
  useEffect(() => {
    // Run once when decisions load
    if (decisions.length > 0) {
      checkDueDecisions();
    }
    
    // Set up interval to check every hour
    const interval = setInterval(checkDueDecisions, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [decisions.length, checkDueDecisions]);

  // Request notification permissions
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        showInfo(
          'Notifications Disabled',
          'Enable notifications to receive reminders for your decisions.',
          'warning'
        );
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const open = decisions.filter((item) => !item.done).length;
    const completed = decisions.filter((item) => item.done).length;
    const highPriority = decisions.filter(
      (item) =>
        !item.done && (item.priority === 'critical' || item.priority === 'high')
    ).length;
    const totalTime = decisions.reduce((acc, item) => acc + (item.timeSpent || 0), 0);

    return {
      total: decisions.length,
      open,
      completed,
      highPriority,
      totalTime: formatTime(totalTime),
    };
  }, [decisions]);

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
      result = result.filter((item) =>
        item.task.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [decisions, activeFilter, searchQuery]);

  // Fixed schedule notification function
  const scheduleNotification = async (decision) => {
    if (!reminderEnabled) return;

    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        showInfo(
          'Permission Needed',
          'Enable notifications for reminders',
          'warning'
        );
        return;
      }

      // Create trigger date
      const triggerDate = new Date(selectedDue);
      if (reminderTime) {
        triggerDate.setHours(reminderTime.getHours());
        triggerDate.setMinutes(reminderTime.getMinutes());
        triggerDate.setSeconds(0);
      }

      // Ensure the date is in the future
      if (triggerDate <= new Date()) {
        showInfo(
          'Invalid Time',
          'Reminder time must be in the future',
          'warning'
        );
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Decision Due 📋',
          body: decision.task,
          data: { decisionId: decision.id },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: 'default',
        },
      });

      showInfo('Reminder Set', 'You will be notified when this decision is due.', 'success');
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      showInfo('Error', 'Could not schedule reminder. Please try again.', 'error');
    }
  };

  // Validate input
  const validateInput = () => {
    if (!newText.trim()) {
      showInfo('Error', 'Please enter a decision', 'warning');
      return false;
    }
    if (newText.trim().length < 3) {
      showInfo('Error', 'Decision must be at least 3 characters', 'warning');
      return false;
    }
    return true;
  };

// Generate recurring decisions - FIXED VERSION
const generateRecurring = (baseDecision, recurrenceType) => {
  if (recurrenceType === 'none') return [baseDecision];

  const recurring = [];
  const baseDate = new Date(baseDecision.due);
  
  for (let i = 1; i <= 4; i++) {
    const newDate = new Date(baseDate);
    
    switch (recurrenceType) {
      case 'daily':
        newDate.setDate(newDate.getDate() + i);
        break;
      case 'weekly':
        newDate.setDate(newDate.getDate() + (i * 7));
        break;
      case 'monthly':
        newDate.setMonth(newDate.getMonth() + i);
        break;
      case 'yearly':
        newDate.setFullYear(newDate.getFullYear() + i);
        break;
    }

    // Create a new decision WITHOUT the id field
    const { id, ...decisionWithoutId } = baseDecision; // Remove id from baseDecision
    
    recurring.push({
      ...decisionWithoutId, // Spread without id
      due: newDate.toISOString(),
      createdAt: serverTimestamp(),
      done: false,
    });
  }
  
  return [baseDecision, ...recurring];
};

  const handleAdd = async () => {
    if (!validateInput()) return;

    const user = auth?.currentUser;
    if (!user) {
      showInfo('Error', 'You must be logged in', 'error');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const baseDecision = {
        task: newText.trim(),
        description: newText.trim(), // Add description field
        done: false,
        priority: selectedPriority,
        due: selectedDue.toISOString(),
        createdAt: serverTimestamp(),
        timeSpent: 0,
        recurrence,
        reminder: reminderEnabled ? reminderTime.toISOString() : null,
      };

      const decisionsToAdd = generateRecurring(baseDecision, recurrence);
      const decisionsRef = collection(db, 'users', user.uid, 'decisions');

      for (const decision of decisionsToAdd) {
        const docRef = await addDoc(decisionsRef, decision);
        
        if (reminderEnabled) {
          await scheduleNotification({ ...decision, id: docRef.id });
        }
      }

      resetForm();
      showInfo('Success', `Added ${decisionsToAdd.length} decision(s)`, 'success');
    } catch (error) {
      console.error('Error adding decision:', error);
      showInfo('Error', 'Failed to save decision. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setNewText(item.task);
    setSelectedPriority(item.priority);
    setSelectedDue(new Date(item.due));
    setRecurrence(item.recurrence || 'none');
    setIsRecurring(item.recurrence !== 'none');
    setReminderEnabled(!!item.reminder);
    if (item.reminder) {
      setReminderTime(new Date(item.reminder));
    }
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!validateInput()) return;

    const user = auth?.currentUser;
    if (!user) {
      showInfo('Error', 'You must be logged in', 'error');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const decisionRef = doc(db, 'users', user.uid, 'decisions', editingId);
      await updateDoc(decisionRef, {
        task: newText.trim(),
        description: newText.trim(),
        priority: selectedPriority,
        due: selectedDue.toISOString(),
        recurrence,
        reminder: reminderEnabled ? reminderTime.toISOString() : null,
        updatedAt: serverTimestamp(),
      });

      resetForm();
      showInfo('Success', 'Decision updated successfully', 'success');
    } catch (error) {
      console.error('Error updating decision:', error);
      showInfo('Error', 'Failed to update decision. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (id) => {
    const user = auth?.currentUser;
    if (!user) return;

    try {
      const decision = decisions.find(d => d.id === id);
      if (!decision) return;

      const decisionRef = doc(db, 'users', user.uid, 'decisions', id);
      await updateDoc(decisionRef, {
        done: !decision.done,
      });

      // 🔔 NEW: Send completion notification
      if (!decision.done) { // If marking as done
        await InAppNotificationService.decisionCompleted(
          decision.task,
          decision.description || '',
          user.uid,
          decision.id
        );
      }
    } catch (error) {
      console.error('Error toggling decision:', error);
      showInfo('Error', 'Failed to update decision status', 'error');
    }
  };

  const handleDelete = (id) => {
    showConfirm(
      'Delete Decision',
      'Are you sure you want to delete this decision?',
      async () => {
        const user = auth?.currentUser;
        if (!user) return;

        setIsLoading(true);
        try {
          const decisionRef = doc(db, 'users', user.uid, 'decisions', id);
          await deleteDoc(decisionRef);
          setConfirmModal(prev => ({ ...prev, visible: false }));
          showInfo('Success', 'Decision deleted successfully', 'success');
        } catch (error) {
          console.error('Error deleting decision:', error);
          showInfo('Error', 'Failed to delete decision', 'error');
        } finally {
          setIsLoading(false);
        }
      },
      'danger',
      'trash-outline'
    );
  };

  // NEW: Delete all completed decisions at once
  const handleDeleteCompleted = () => {
    const completedCount = decisions.filter(d => d.done).length;
    
    if (completedCount === 0) {
      showInfo('No Completed Decisions', 'There are no completed decisions to delete.', 'warning');
      return;
    }

    showConfirm(
      'Delete Completed',
      `Delete all ${completedCount} completed decisions?`,
      async () => {
        const user = auth?.currentUser;
        if (!user) return;

        setIsLoading(true);
        try {
          const batch = writeBatch(db);
          decisions.filter(d => d.done).forEach(decision => {
            const ref = doc(db, 'users', user.uid, 'decisions', decision.id);
            batch.delete(ref);
          });
          await batch.commit();
          setConfirmModal(prev => ({ ...prev, visible: false }));
          showInfo('Success', `Deleted ${completedCount} completed decisions.`, 'success');
        } catch (error) {
          console.error('Error batch deleting:', error);
          showInfo('Error', 'Failed to delete completed decisions', 'error');
        } finally {
          setIsLoading(false);
        }
      },
      'danger',
      'trash-outline'
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Time tracking functions
  const startTimer = (id) => {
    setActiveTimer(id);
    setTimerStart(Date.now());
  };

  const stopTimer = async (id) => {
    if (activeTimer === id && timerStart) {
      const elapsed = Math.floor((Date.now() - timerStart) / 1000);
      
      const user = auth?.currentUser;
      if (!user) return;

      try {
        const decision = decisions.find(d => d.id === id);
        if (!decision) return;

        const decisionRef = doc(db, 'users', user.uid, 'decisions', id);
        await updateDoc(decisionRef, {
          timeSpent: (decision.timeSpent || 0) + elapsed,
        });
        
        showInfo('Time Tracked', `Added ${formatTime(elapsed)} to this decision`, 'success');
      } catch (error) {
        console.error('Error updating time:', error);
      }

      setActiveTimer(null);
      setTimerStart(null);
    }
  };

  const resetForm = () => {
    setNewText('');
    setSelectedPriority('medium');
    setSelectedDue(new Date());
    setReminderEnabled(false);
    setIsRecurring(false);
    setRecurrence('none');
    setEditingId(null);
    setModalVisible(false);
    setShowCalendar(false);
    setError(null);
  };

  // Export to PDF
  const exportToPDF = async () => {
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial; padding: 20px; }
              h1 { color: #00D2FF; }
              .stats { display: flex; gap: 20px; margin: 20px 0; }
              .stat-box { background: #f0f0f0; padding: 10px; border-radius: 8px; }
              .decision { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px; }
              .priority { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; }
              .critical { background: #EF4444; color: white; }
              .high { background: #F59E0B; color: white; }
              .medium { background: #10B981; color: white; }
              .low { background: #6B7280; color: white; }
            </style>
          </head>
          <body>
            <h1>Decision Log Report</h1>
            <div class="stats">
              <div class="stat-box">Total: ${stats.total}</div>
              <div class="stat-box">Open: ${stats.open}</div>
              <div class="stat-box">Completed: ${stats.completed}</div>
              <div class="stat-box">Time: ${stats.totalTime}</div>
            </div>
            <h2>Decisions</h2>
            ${decisions
              .map(
                (d) => `
                  <div class="decision">
                    <h3>${d.task}</h3>
                    <p>
                      <span class="priority ${d.priority}">${d.priority}</span>
                      <span>Due: ${new Date(d.due).toLocaleDateString()}</span>
                      <span>Status: ${d.done ? '✓ Completed' : '○ Open'}</span>
                      <span>Time: ${formatTime(d.timeSpent || 0)}</span>
                    </p>
                  </div>
                `
              )
              .join('')}
          </body>
        </html>
      `;

      const path = FileSystem.documentDirectory + 'decision-report.html';
      await FileSystem.writeAsStringAsync(path, html);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path);
        showInfo('Export Successful', 'Your report has been generated', 'success');
      }
    } catch (error) {
      console.error('Export error:', error);
      showInfo('Export Failed', 'Failed to generate report. Please try again.', 'error');
    }
  };

  const getPriorityConfig = (priority) => {
    const config = {
      critical: { color: '#EF4444', label: 'CRITICAL' },
      high: { color: '#F59E0B', label: 'HIGH' },
      medium: { color: '#10B981', label: 'MEDIUM' },
      low: { color: '#6B7280', label: 'LOW' },
    };
    return config[priority] || config.medium;
  };

  const getMarkedDates = () => {
    const dateString = selectedDue.toISOString().split('T')[0];
    return {
      [dateString]: {
        selected: true,
        selectedColor: '#00D2FF',
      },
    };
  };

  const formatDueDate = (dueDate) => {
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (isLoading && decisions.length === 0) {
    return (
      <CustomLoader 
        type="fullscreen" 
        message="Loading decisions..." 
        subtext="Fetching your strategic priorities"
      />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#050508' }} edges={['top']}>
        <StatusBar barStyle="light-content" />

        {/* Auto-dismiss Banner */}
        {banner.visible && (
          <AutoDismissBanner 
            message={banner.message} 
            type={banner.type} 
            onDismiss={hideBanner} 
          />
        )}

        {/* FIXED HEADER - Everything above decisions stays fixed */}
        <View>
          {/* Header Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
            <TouchableOpacity
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={22} color="#00D2FF" />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' }}>Decision Log</Text>
              <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Strategic priorities</Text>
            </View>

            <TouchableOpacity
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,210,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
              onPress={exportToPDF}
            >
              <Ionicons name="document-text" size={20} color="#00D2FF" />
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <View style={{ flex: 1, backgroundColor: '#0d0d12', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 4 }}>{stats.open}</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Open</Text>
              </View>

              <View style={{ flex: 1, backgroundColor: '#0d0d12', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 4 }}>{stats.highPriority}</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Priority</Text>
              </View>

              <View style={{ flex: 1, backgroundColor: '#0d0d12', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 4 }}>{stats.completed}</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Done</Text>
              </View>
            </View>

            {/* Total Time Card with Delete Completed Button */}
            <View style={{ backgroundColor: '#0d0d12', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Total Time Tracked</Text>
                  <Text style={{ color: '#00D2FF', fontSize: 24, fontWeight: 'bold' }}>{stats.totalTime}</Text>
                </View>
                {stats.completed > 0 && (
                  <TouchableOpacity
                    onPress={handleDeleteCompleted}
                    style={{ backgroundColor: 'rgba(239,68,68,0.2)', padding: 8, borderRadius: 8 }}
                  >
                    <Text style={{ color: '#EF4444', fontSize: 12 }}>Clear Completed</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Search */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#12121a', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 }}>
              <Ionicons name="search" size={18} color="#6B7280" style={{ marginRight: 8 }} />
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

            {/* Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {FILTERS.map((filter) => {
                  const active = activeFilter === filter;
                  return (
                    <TouchableOpacity
                      key={filter}
                      onPress={() => setActiveFilter(filter)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: active ? '#00D2FF' : 'rgba(255,255,255,0.05)',
                        borderWidth: 1,
                        borderColor: active ? '#00D2FF' : 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <Text style={{ color: active ? '#000' : '#9CA3AF', fontSize: 13, fontWeight: '600' }}>
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Add Button - FIXED with header */}
            {!modalVisible && (
              <TouchableOpacity
                onPress={() => {
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
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#00D2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Ionicons name="add" size={22} color="#000" />
                </View>
                <View>
                  <Text style={{ color: '#00D2FF', fontSize: 16, fontWeight: 'bold' }}>New Decision</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>Add a strategic task</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* SCROLLABLE DECISIONS - Only decisions scroll here */}
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D2FF" />
          }
        >
          {/* Decision Cards using the new DecisionCard component */}
          {filteredDecisions.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 40, paddingBottom: 60 }}>
              <Ionicons name="document-text-outline" size={48} color="#4B5563" />
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginTop: 12 }}>No decisions found</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 4 }}>
                {searchQuery ? 'Try a different search term' : 'Add your first decision'}
              </Text>
            </View>
          ) : (
            filteredDecisions.map((item) => (
              <DecisionCard
                key={item.id}
                item={item}
                activeTimer={activeTimer}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStartTimer={startTimer}
                onStopTimer={stopTimer}
                formatTime={formatTime}
                formatDueDate={formatDueDate}
                getPriorityConfig={getPriorityConfig}
              />
            ))
          )}
          {/* Bottom padding */}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* AddDecisionModal - REPLACES the old Modal */}
        <AddDecisionModal
          visible={modalVisible}
          onClose={resetForm}
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
          isLoading={isLoading}
          onSave={editingId ? handleUpdate : handleAdd}
          getPriorityConfig={getPriorityConfig}
          getMarkedDates={getMarkedDates}
          PRIORITY_OPTIONS={PRIORITY_OPTIONS}
          RECURRENCE_OPTIONS={RECURRENCE_OPTIONS}
        />

        {/* Custom Modals */}
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
    </GestureHandlerRootView>
  );
}