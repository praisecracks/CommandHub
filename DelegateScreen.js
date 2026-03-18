// screens/DelegateScreen.js - Fixed Add Button
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  getDocs,
} from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomLoader from './components/common/CustomLoader';
import CustomConfirmModal from './components/common/CustomConfirmModal';
import CustomInfoModal from './components/common/CustomInfoModal';
import QuadrantCard from './components/delegate/QuadrantCard';
import TaskCard from './components/delegate/TaskCard';
import AddTaskModal from './components/delegate/AddTaskModal';
import TaskDetailsModal from './components/delegate/TaskDetailsModal';
import MobileContactPicker from './components/delegate/MobileContactPicker';
import NotificationService from './components/services/NotificationService';
import InAppNotificationService from './components/services/InAppNotificationService';
import DeleteConfirmationModal from './components/delegate/DeleteConfirmationModal';
import NotificationModal from './components/delegate/NotificationModal';
import { useNavigation } from '@react-navigation/native';

const QUADRANTS = [
  { id: 'only-you', title: 'Only You', icon: 'person', color: '#00D2FF' },
  { id: 'delegate', title: 'Delegate', icon: 'swap-horizontal', color: '#A855F7' },
  { id: 'waiting', title: 'Waiting', icon: 'time', color: '#F59E0B' },
  { id: 'escalate', title: 'Escalate', icon: 'warning', color: '#EF4444' },
];

const CACHE_KEY = '@delegations_cache';

// Celebration messages array
const CELEBRATION_MESSAGES = [
  { emoji: '🎉', message: 'Great job! Task completed!' },
  { emoji: '🚀', message: 'You\'re on fire! Another one done!' },
  { emoji: '⭐', message: 'Excellent work! Task accomplished!' },
  { emoji: '🏆', message: 'Winner! Task completed successfully!' },
  { emoji: '✨', message: 'Amazing! One less thing to worry about!' },
  { emoji: '🌟', message: 'Brilliant! Task finished!' },
  { emoji: '🎯', message: 'Nailed it! Task complete!' },
  { emoji: '💪', message: 'Strong work! Task conquered!' },
  { emoji: '👏', message: 'Well done! Keep up the momentum!' },
  { emoji: '🔥', message: 'On a roll! Task completed!' },
];

export default function DelegateScreen({ route }) {
  const navigation = useNavigation();
  const taskId = route?.params?.taskId;
  const [delegations, setDelegations] = useState([]);
  const [activeQuadrant, setActiveQuadrant] = useState('only-you');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // State for contact picker
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [reassigningTask, setReassigningTask] = useState(null);

  // State for custom modals
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [pendingNotification, setPendingNotification] = useState(null);
  const [notificationType, setNotificationType] = useState('task'); // 'task' or 'followup'
  const [smsAvailable, setSmsAvailable] = useState(false);

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

  // Loading state to prevent duplicate submissions
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCachedDelegations();
    checkSMSAvailability();

    const user = auth?.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

    const delegationsRef = collection(db, 'users', user.uid, 'delegations');
    const q = query(delegationsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const delegationsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        }));

        setDelegations(delegationsData);
        cacheDelegations(delegationsData);
        setIsLoading(false);
        setError(null);

        // Check if we need to open a specific task from navigation params
        if (taskId) {
          const task = delegationsData.find(t => t.id === taskId);
          if (task) {
            setActiveQuadrant(task.quadrant);
            setEditingTask(task);
            setShowEditModal(true);
          }
        }
      },
      (error) => {
        console.error('Error loading delegations:', error);
        setError(error.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Check SMS availability
  const checkSMSAvailability = async () => {
    const available = await NotificationService.isSMSAvailable();
    setSmsAvailable(available);
  };

  const loadCachedDelegations = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        setDelegations(JSON.parse(cached));
        setIsLoading(false);
      }
    } catch (error) {
      console.log('No cached delegations yet');
    }
  };

  const cacheDelegations = async (data) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to cache delegations:', error);
    }
  };

  // Filter tasks by quadrant AND exclude completed tasks
  const filteredTasks = useMemo(() => {
    return delegations.filter((task) => 
      task.quadrant === activeQuadrant && task.status !== 'completed'
    );
  }, [delegations, activeQuadrant]);

  // Get counts for each quadrant (excluding completed tasks)
  const quadrantCounts = useMemo(() => {
    const counts = {
      'only-you': 0,
      'delegate': 0,
      'waiting': 0,
      'escalate': 0,
    };

    delegations.forEach((task) => {
      if (task.status !== 'completed' && counts[task.quadrant] !== undefined) {
        counts[task.quadrant]++;
      }
    });

    return counts;
  }, [delegations]);

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

  // Get random celebration message
  const getRandomCelebration = () => {
    const randomIndex = Math.floor(Math.random() * CELEBRATION_MESSAGES.length);
    return CELEBRATION_MESSAGES[randomIndex];
  };

  // UPDATED: Handle Add Task with notification and Optimistic UI
  const handleAddTask = async (taskData) => {
    // Prevent duplicate submissions
    if (isSubmitting) return;
    
    console.log('📝 Adding task:', taskData);
    const user = auth?.currentUser;
    if (!user) return;

    setIsSubmitting(true);

    // Optimistic Update
    const optimisticTask = {
      ...taskData,
      id: `temp-${Date.now()}`,
      status: 'pending',
      createdAt: new Date(),
      isOptimistic: true,
    };
    
    setDelegations(prev => [optimisticTask, ...prev]);

    try {
      const docRef = await addDoc(collection(db, 'users', user.uid, 'delegations'), {
        ...taskData,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // 🔔 Send in-app notification if it's a delegated task - BUT DON'T AWAIT IT
      if (taskData.quadrant === 'delegate' && taskData.assignedTo) {
        // Fire and forget - don't await to avoid blocking
        InAppNotificationService.taskAssigned(
          taskData.title,
          taskData.description || '',
          user.displayName || user.email?.split('@')[0] || 'A manager',
          taskData.assignedTo,
          docRef.id
        ).catch(err => console.log('Notification error (non-critical):', err.message));
      }

      showInfo('Success', 'Task created successfully', 'success');

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error adding task:', error);
      // Rollback on error
      setDelegations(prev => prev.filter(t => t.id !== optimisticTask.id));
      showInfo('Error', 'Failed to create task. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTask = (task) => {
    console.log('✏️ Editing task:', task.id);
    setEditingTask(task);
    setShowEditModal(true);
  };

  const handleTaskUpdated = () => {
    console.log('✅ Task updated');
    showInfo('Success', 'Task updated successfully', 'success');
  };

  // Delete task function with custom modal
  const handleDeleteTask = (task) => {
    showConfirm(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      async () => {
        const user = auth?.currentUser;
        if (!user) return;

        // Optimistic update
        setDelegations(prev => prev.filter(t => t.id !== task.id));
        setConfirmModal(prev => ({ ...prev, visible: false }));

        try {
          const taskRef = doc(db, 'users', user.uid, 'delegations', task.id);
          await deleteDoc(taskRef);
          showInfo('Deleted', 'Task removed successfully', 'success');
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } catch (error) {
          console.error('Error deleting task:', error);
          showInfo('Error', 'Failed to delete task', 'error');
        }
      },
      'danger',
      'trash-outline'
    );
  };

  // UPDATED: Handle Complete Task with notification and immediate feedback
  const handleCompleteTask = async (task, immediate = false) => {
    const user = auth?.currentUser;
    if (!user) return;

    // Get random celebration message
    const celebration = getRandomCelebration();

    // IMMEDIATE visual feedback - remove from list right away
    if (immediate) {
      setDelegations(prev => prev.filter(t => t.id !== task.id));
    } else {
      // Optimistic update
      const updatedTasks = delegations.map(t => 
        t.id === task.id ? { ...t, status: 'completed' } : t
      );
      setDelegations(updatedTasks);
    }

    try {
      const taskRef = doc(db, 'users', user.uid, 'delegations', task.id);
      await updateDoc(taskRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Also save to history collection
      await addDoc(collection(db, 'users', user.uid, 'history'), {
        ...task,
        completedAt: new Date().toISOString(),
        originalId: task.id
      });

      // 🔔 Send notification for task completion
      if (task.assignedToName) {
        // Fire and forget - don't await
        InAppNotificationService.decisionCompleted(
          task.title,
          task.description || '',
          user.uid,
          task.id
        ).catch(err => console.log('Notification error (non-critical):', err.message));
      }

      // 🔔 If this was a delegated task, notify the person who assigned it
      if (task.assignedTo && task.assignedTo !== user.uid) {
        InAppNotificationService.taskCompleted(
          task.title,
          task.description || '',
          user.displayName || user.email?.split('@')[0] || 'Someone',
          task.assignedTo,
          task.id
        ).catch(err => console.log('Notification error (non-critical):', err.message));
      }

      // Show celebration message
      showInfo(
        `${celebration.emoji} Congratulations! ${celebration.emoji}`, 
        celebration.message, 
        'success'
      );

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error completing task:', error);
      // Only rollback if we removed it
      if (immediate) {
        setDelegations(prev => [...prev, task]);
      } else {
        setDelegations(delegations);
      }
      showInfo('Error', 'Failed to complete task', 'error');
    }
  };

  // UPDATED: Handle Follow Up with notification
  const handleFollowUp = async (task) => {
    console.log('👋 Follow-up for task:', task.id);
    const user = auth?.currentUser;
    if (!user) return;

    try {
      // Update follow-up count in Firestore
      const taskRef = doc(db, 'users', user.uid, 'delegations', task.id);
      await updateDoc(taskRef, {
        followUpCount: (task.followUpCount || 0) + 1,
        lastFollowUp: serverTimestamp(),
      });

      // 🔔 Create a follow-up notification for yourself
      if (task.assignedToName) {
        await InAppNotificationService.followUpReminder(
          task.title,
          task.description || '',
          task.assignedToName,
          user.uid,
          task.id
        );
      }

      // Show notification modal for WhatsApp/SMS
      setPendingNotification(task);
      setNotificationType('followup');
      
      const available = await NotificationService.isSMSAvailable();
      setSmsAvailable(available);
      setShowNotificationModal(true);

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error sending follow-up:', error);
      showInfo('Error', 'Failed to send follow-up', 'error');
    }
  };

  // UPDATED: Handle Escalate with notification
  const handleEscalate = async (task) => {
    const user = auth?.currentUser;
    if (!user) return;

    const updatedTasks = delegations.map(t => 
      t.id === task.id ? { ...t, quadrant: 'escalate', priority: 'high' } : t
    );
    setDelegations(updatedTasks);

    try {
      const taskRef = doc(db, 'users', user.uid, 'delegations', task.id);
      await updateDoc(taskRef, {
        quadrant: 'escalate',
        priority: 'high',
        escalatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 🔔 Create escalation notification
      await InAppNotificationService.taskEscalated(
        task.title,
        task.description || '',
        user.displayName || user.email?.split('@')[0] || 'Someone',
        user.uid,
        task.id
      );

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      showInfo('Escalated', 'Task has been escalated', 'success');
    } catch (error) {
      setDelegations(delegations);
      console.error('Error escalating task:', error);
      showInfo('Error', 'Failed to escalate task', 'error');
    }
  };

  // Handle Take Action - Moves from Escalate to Waiting
  const handleTakeAction = async (task) => {
    console.log('🎯 Taking action on task:', task.id);
    const user = auth?.currentUser;
    if (!user) return;

    // Optimistic update - move to Waiting quadrant
    const updatedTasks = delegations.map(t => 
      t.id === task.id 
        ? { 
            ...t, 
            quadrant: 'waiting',
            takenActionAt: new Date(),
            status: 'pending'
          } 
        : t
    );
    setDelegations(updatedTasks);

    try {
      const taskRef = doc(db, 'users', user.uid, 'delegations', task.id);
      await updateDoc(taskRef, {
        quadrant: 'waiting',
        takenActionAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      showInfo('Task Moved', 'Task moved to Waiting (your to-do list)', 'success');
    } catch (error) {
      // Rollback on error
      setDelegations(delegations);
      console.error('Error taking action:', error);
      showInfo('Error', 'Failed to take action', 'error');
    }
  };

  // Handle reassign - opens contact picker
  const handleReassign = (task) => {
    console.log('🔄 Reassigning task:', task.id);
    setReassigningTask(task);
    setShowContactPicker(true);
  };

  // UPDATED: Handle reassign save with notification
  const handleReassignSave = async (contact) => {
    if (!reassigningTask || !contact) return;

    console.log('📞 Reassigning to:', contact.name);
    const user = auth?.currentUser;
    if (!user) return;

    // Optimistic update
    const updatedTasks = delegations.map(t => 
      t.id === reassigningTask.id 
        ? { 
            ...t, 
            assignedTo: contact.id,
            assignedToName: contact.name,
            assignedToPhone: contact.phone,
            assignedToSystem: contact.system,
            assignedToRole: contact.role,
            quadrant: 'delegate',
            reassignedAt: new Date(),
          } 
        : t
    );
    setDelegations(updatedTasks);

    try {
      const taskRef = doc(db, 'users', user.uid, 'delegations', reassigningTask.id);
      await updateDoc(taskRef, {
        assignedTo: contact.id,
        assignedToName: contact.name,
        assignedToPhone: contact.phone,
        assignedToSystem: contact.system,
        assignedToRole: contact.role,
        quadrant: 'delegate',
        reassignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 🔔 Send notification to the new assignee
      await InAppNotificationService.taskReassigned(
        reassigningTask.title,
        reassigningTask.description || '',
        user.displayName || user.email?.split('@')[0] || 'A manager',
        contact.id,
        reassigningTask.id
      );

      // Show notification modal for WhatsApp/SMS
      const currentTask = { ...reassigningTask };
      setPendingNotification({
        ...currentTask,
        assignedToPhone: contact.phone,
        assignedToName: contact.name
      });
      setNotificationType('task');
      
      const available = await NotificationService.isSMSAvailable();
      setSmsAvailable(available);
      setShowNotificationModal(true);

      showInfo('Reassigned', `Task reassigned to ${contact.name}`, 'success');
      
    } catch (error) {
      // Rollback on error
      setDelegations(delegations);
      console.error('Error reassigning task:', error);
      showInfo('Error', 'Failed to reassign task', 'error');
    } finally {
      setReassigningTask(null);
    }
  };

  // Handle notification option selection
  const handleNotificationOption = async (type) => {
    console.log('Sending notification via:', type);
    setShowNotificationModal(false);
    
    const user = auth?.currentUser;
    if (!user || !pendingNotification) return;

    try {
      const assignedByName = user.displayName || user.email?.split('@')[0] || 'A manager';
      let result;

      if (type === 'sms') {
        if (notificationType === 'followup') {
          result = await NotificationService.sendFollowUpSMS(
            pendingNotification.assignedToPhone,
            pendingNotification.title,
            pendingNotification.description || '',
            assignedByName
          );
        } else {
          result = await NotificationService.sendSMS(
            pendingNotification.assignedToPhone,
            pendingNotification.title,
            pendingNotification.description || '',
            assignedByName
          );
        }
      } else if (type === 'whatsapp') {
        if (notificationType === 'followup') {
          result = await NotificationService.sendFollowUpWhatsApp(
            pendingNotification.assignedToPhone,
            pendingNotification.title,
            pendingNotification.description || '',
            assignedByName
          );
        } else {
          result = await NotificationService.sendWhatsApp(
            pendingNotification.assignedToPhone,
            pendingNotification.title,
            pendingNotification.description || '',
            assignedByName
          );
        }
      }

      // Show the result in our custom modal
      if (result) {
        if (result.success) {
          showInfo('Success', result.message, 'success');
        } else {
          showInfo('Notice', result.message, result.type || 'info');
        }
      }
      
      // Update follow-up count in Firestore for follow-ups
      if (notificationType === 'followup' && pendingNotification.id && result?.success) {
        const taskRef = doc(db, 'users', user.uid, 'delegations', pendingNotification.id);
        await updateDoc(taskRef, {
          followUpCount: (pendingNotification.followUpCount || 0) + 1,
          lastFollowUp: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      showInfo('Error', 'Failed to process notification', 'error');
    } finally {
      setPendingNotification(null);
    }
  };

  const handleTaskPress = (task) => {
    showInfo(task.title, task.description || 'No description', 'info');
  };

  const handleRefresh = useCallback(() => {
    console.log('🔄 Refreshing...');
    setIsRefreshing(true);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  }, []);

  const getActiveQuadrantTitle = () => {
    const quadrant = QUADRANTS.find(q => q.id === activeQuadrant);
    return quadrant ? quadrant.title : 'Tasks';
  };

  const getActiveQuadrantColor = () => {
    const quadrant = QUADRANTS.find(q => q.id === activeQuadrant);
    return quadrant ? quadrant.color : '#00D2FF';
  };

  if (isLoading && delegations.length === 0) {
    return (
      <CustomLoader 
        type="fullscreen" 
        message="Fetching tasks..." 
        subtext="Synchronizing your delegation matrix"
      />
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#050508', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.1)', justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="alert-circle" size={40} color="#EF4444" />
        </View>
        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginTop: 20 }}>Failed to load</Text>
        <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 8 }}>{error}</Text>
        <TouchableOpacity onPress={handleRefresh} style={{ marginTop: 24, backgroundColor: '#00D2FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 }}>
          <Text style={{ color: '#000', fontWeight: 'bold' }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#050508' }}>
      <StatusBar barStyle="light-content" />

      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
        {/* Header with History Button */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(0,210,255,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(0,210,255,0.2)' }}>
              <Text style={{ color: '#00D2FF', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>COMMAND ROUTING</Text>
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: 12 }}>Delegation</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>Track, assign, and follow up on tasks</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* History Button */}
            <TouchableOpacity
              onPress={() => navigation.navigate('TaskHistory')}
              style={{ width: 48, height: 48, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="time-outline" size={22} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Add Button */}
            <TouchableOpacity
              onPress={() => {
                console.log('➕ Opening add task modal');
                setShowAddModal(true);
              }}
              activeOpacity={0.85}
              style={{ width: 48, height: 48, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,210,255,0.3)', backgroundColor: 'rgba(0,210,255,0.1)', justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="add" size={24} color="#00D2FF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quadrant Cards */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 }}>
          {QUADRANTS.map((quadrant) => (
            <QuadrantCard
              key={quadrant.id}
              title={quadrant.title}
              count={quadrantCounts[quadrant.id] || 0}
              icon={quadrant.icon}
              color={quadrant.color}
              isActive={activeQuadrant === quadrant.id}
              onPress={() => setActiveQuadrant(quadrant.id)}
            />
          ))}
        </View>

        {/* 🔥 NEW: Department Performance Call-to-Action Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('DepartmentPerformance')}
          style={{
            backgroundColor: 'rgba(0,210,255,0.1)',
            padding: 16,
            borderRadius: 16,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: 'rgba(0,210,255,0.3)',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ 
              width: 48, 
              height: 48, 
              borderRadius: 14, 
              backgroundColor: 'rgba(0,210,255,0.2)',
              justifyContent: 'center', 
              alignItems: 'center' 
            }}>
              <Ionicons name="stats-chart" size={24} color="#00D2FF" />
            </View>
            <View>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                Department Performance
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
                Track completion rates and urgent tasks
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ 
              backgroundColor: '#00D2FF',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
            }}>
              <Text style={{ color: '#000', fontSize: 11, fontWeight: '700' }}>
                {delegations.filter(t => t.department).length} tasks
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#00D2FF" />
          </View>
        </TouchableOpacity>

        {/* Active Quadrant Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>
            {getActiveQuadrantTitle()}
          </Text>
          <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: getActiveQuadrantColor() }}>
            <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 13 }}>
              {filteredTasks.length}
            </Text>
          </View>
        </View>

        {/* Task List */}
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              quadrant={getActiveQuadrantTitle()}
              onPress={handleTaskPress}
              onEdit={handleEditTask}
              onDelete={() => handleDeleteTask(item)}
              onComplete={(task) => handleCompleteTask(task, true)}
              onFollowUp={handleFollowUp}
              onEscalate={handleEscalate}
              onAction={handleTakeAction}
              onReassign={handleReassign}
            />
          )}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#00D2FF"
              colors={['#00D2FF']}
            />
          }
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingBottom: 40 }}>
              <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="checkbox-outline" size={42} color="#4B5563" />
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>
                No tasks in {getActiveQuadrantTitle()}
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 }}>
                {activeQuadrant === 'only-you' 
                  ? 'Add your first task to get started'
                  : activeQuadrant === 'delegate'
                  ? 'Tasks you assign will appear here'
                  : activeQuadrant === 'waiting'
                  ? 'Tasks waiting for others will appear here'
                  : 'Urgent tasks that need attention will appear here'}
              </Text>
              {activeQuadrant === 'only-you' && (
                <TouchableOpacity
                  onPress={() => setShowAddModal(true)}
                  style={{ marginTop: 24, flexDirection: 'row', alignItems: 'center', backgroundColor: '#00D2FF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 }}
                >
                  <Ionicons name="add" size={18} color="#000" />
                  <Text style={{ color: '#000', fontWeight: 'bold', marginLeft: 8 }}>Add Task</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </View>

      {/* Add Task Modal */}
      <AddTaskModal
        visible={showAddModal}
        onClose={() => {
          console.log('Closing add task modal');
          setShowAddModal(false);
        }}
        onSave={handleAddTask}
      />

      {/* Task Details Modal */}
      <TaskDetailsModal
        visible={showEditModal}
        task={editingTask}
        onClose={() => {
          console.log('Closing edit modal');
          setShowEditModal(false);
          setEditingTask(null);
        }}
        onUpdate={handleTaskUpdated}
      />

      {/* Contact Picker Modal for Reassign */}
      <MobileContactPicker
        visible={showContactPicker}
        onClose={() => {
          console.log('Closing contact picker');
          setShowContactPicker(false);
          setReassigningTask(null);
        }}
        onSelect={handleReassignSave}
        title="Reassign Task"
      />

      {/* Notification Modal for WhatsApp/SMS */}
      <NotificationModal
        visible={showNotificationModal}
        onClose={() => {
          console.log('Closing notification modal');
          setShowNotificationModal(false);
          setPendingNotification(null);
        }}
        onSMS={() => handleNotificationOption('sms')}
        onWhatsApp={() => handleNotificationOption('whatsapp')}
        contactName={pendingNotification?.assignedToName || ''}
        smsAvailable={smsAvailable}
        messageType={notificationType}
      />

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