// screens/TaskHistoryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CustomLoader from './components/common/CustomLoader';
import { auth, db } from './firebaseConfig';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import CustomConfirmModal from './components/common/CustomConfirmModal';
import CustomInfoModal from './components/common/CustomInfoModal';

export default function TaskHistoryScreen({ navigation }) {
  const [completedTasks, setCompletedTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    const user = auth?.currentUser;
    if (!user) return;

    const tasksRef = collection(db, 'users', user.uid, 'delegations');
    const q = query(tasksRef, where('status', '==', 'completed'), orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCompletedTasks(tasks);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading history:', error);
        showInfo('Error', 'Failed to load history', 'error');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

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

  const toggleSelection = (id) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedTasks([id]);
    } else {
      if (selectedTasks.includes(id)) {
        const newSelected = selectedTasks.filter(taskId => taskId !== id);
        setSelectedTasks(newSelected);
        if (newSelected.length === 0) {
          setSelectionMode(false);
        }
      } else {
        setSelectedTasks([...selectedTasks, id]);
      }
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedTasks([]);
  };

  const handleRestore = async (id) => {
    const user = auth?.currentUser;
    if (!user) return;

    try {
      const taskRef = doc(db, 'users', user.uid, 'delegations', id);
      await updateDoc(taskRef, {
        status: 'pending',
        updatedAt: serverTimestamp()
      });
      showInfo('Restored', 'Task moved back to active', 'success');
    } catch (error) {
      console.error('Error restoring task:', error);
      showInfo('Error', 'Failed to restore task', 'error');
    }
  };

  const handleBulkRestore = async () => {
    if (selectedTasks.length === 0) {
      showInfo('No Selection', 'Please select tasks to restore', 'warning');
      return;
    }

    const user = auth?.currentUser;
    if (!user) return;

    try {
      const batch = writeBatch(db);
      selectedTasks.forEach(id => {
        const ref = doc(db, 'users', user.uid, 'delegations', id);
        batch.update(ref, { status: 'pending', updatedAt: serverTimestamp() });
      });
      await batch.commit();
      exitSelectionMode();
      showInfo('Restored', `${selectedTasks.length} task${selectedTasks.length > 1 ? 's' : ''} restored`, 'success');
    } catch (error) {
      console.error('Error restoring tasks:', error);
      showInfo('Error', 'Failed to restore tasks', 'error');
    }
  };

  const handleDelete = (id) => {
    showConfirm(
      'Delete Task',
      'This task will be permanently removed from history. Continue?',
      async () => {
        const user = auth?.currentUser;
        if (!user) return;

        try {
          const taskRef = doc(db, 'users', user.uid, 'delegations', id);
          await deleteDoc(taskRef);
          setConfirmModal((prev) => ({ ...prev, visible: false }));
          showInfo('Deleted', 'Task removed permanently', 'success');
        } catch (error) {
          console.error('Error deleting task:', error);
          showInfo('Error', 'Failed to delete task', 'error');
        }
      },
      'danger',
      'trash-outline'
    );
  };

  const handleBulkDelete = () => {
    if (selectedTasks.length === 0) {
      showInfo('No Selection', 'Please select tasks to delete', 'warning');
      return;
    }

    showConfirm(
      'Delete Selected',
      `Permanently delete ${selectedTasks.length} selected tasks?`,
      async () => {
        const user = auth?.currentUser;
        if (!user) return;

        try {
          const batch = writeBatch(db);
          selectedTasks.forEach(id => {
            const ref = doc(db, 'users', user.uid, 'delegations', id);
            batch.delete(ref);
          });
          await batch.commit();
          setConfirmModal((prev) => ({ ...prev, visible: false }));
          exitSelectionMode();
          showInfo('Deleted', `${selectedTasks.length} task${selectedTasks.length > 1 ? 's' : ''} removed`, 'success');
        } catch (error) {
          console.error('Error deleting tasks:', error);
          showInfo('Error', 'Failed to delete tasks', 'error');
        }
      },
      'danger',
      'trash-outline'
    );
  };

  const handleDeleteAll = () => {
    if (completedTasks.length === 0) return;

    showConfirm(
      'Clear History',
      'This will permanently delete ALL completed tasks. This action cannot be undone.',
      async () => {
        const user = auth?.currentUser;
        if (!user) return;

        try {
          const batch = writeBatch(db);
          completedTasks.forEach(task => {
            const ref = doc(db, 'users', user.uid, 'delegations', task.id);
            batch.delete(ref);
          });
          await batch.commit();
          setConfirmModal((prev) => ({ ...prev, visible: false }));
          showInfo('Deleted', 'All completed tasks removed', 'success');
        } catch (error) {
          console.error('Error clearing history:', error);
          showInfo('Error', 'Failed to delete tasks', 'error');
        }
      },
      'danger',
      'trash-outline'
    );
  };

  if (isLoading) {
    return (
      <CustomLoader 
        type="fullscreen" 
        message="Loading history..." 
        subtext="Retrieving completed mission logs"
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#050508]">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-white/5">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#00D2FF" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold ml-4">
            {selectionMode ? `${selectedTasks.length} selected` : 'Task History'}
          </Text>
        </View>
        
        {selectionMode ? (
          <View className="flex-row gap-3">
            <TouchableOpacity onPress={handleBulkRestore}>
              <Ionicons name="refresh-outline" size={22} color="#10B981" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBulkDelete}>
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity onPress={exitSelectionMode}>
              <Ionicons name="close-outline" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        ) : (
          completedTasks.length > 0 && (
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setSelectionMode(true)}>
                <Ionicons name="checkbox-outline" size={22} color="#00D2FF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteAll}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )
        )}
      </View>

      {/* Task List */}
      <FlatList
        data={completedTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => selectionMode ? toggleSelection(item.id) : null}
            onLongPress={() => !selectionMode && toggleSelection(item.id)}
            activeOpacity={0.7}
          >
            <View className={`mx-4 mb-2 p-4 rounded-xl border ${
              selectionMode && selectedTasks.includes(item.id)
                ? 'border-[#00D2FF] bg-[#00D2FF]/5'
                : 'border-white/5 bg-[#0D1117]'
            }`}>
              <View className="flex-row items-center">
                {/* Selection Checkbox */}
                {selectionMode && (
                  <View className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                    selectedTasks.includes(item.id)
                      ? 'border-[#00D2FF] bg-[#00D2FF]'
                      : 'border-white/20'
                  }`}>
                    {selectedTasks.includes(item.id) && (
                      <Ionicons name="checkmark" size={14} color="#000" />
                    )}
                  </View>
                )}

                {/* Task Content */}
                <View className="flex-1">
                  <Text className="text-white text-base font-semibold">
                    {item.title}
                  </Text>
                  <View className="flex-row items-center mt-2">
                    <Ionicons name="time-outline" size={12} color="#6B7280" />
                    <Text className="text-[#6B7280] text-xs ml-1">
                      Completed: {item.updatedAt?.toDate?.().toLocaleDateString()}
                    </Text>
                  </View>
                  {item.assignedToName && (
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="person-outline" size={12} color="#A855F7" />
                      <Text className="text-[#A855F7] text-xs ml-1">
                        Assigned to: {item.assignedToName}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons (only visible when not in selection mode) */}
                {!selectionMode && (
                  <View className="flex-row gap-3">
                    <TouchableOpacity onPress={() => handleRestore(item.id)}>
                      <Ionicons name="refresh-outline" size={20} color="#10B981" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center pt-32">
            <View className="w-20 h-20 rounded-full bg-white/5 items-center justify-center mb-4">
              <Ionicons name="checkbox-outline" size={40} color="#4B5563" />
            </View>
            <Text className="text-white text-lg font-bold">No completed tasks</Text>
            <Text className="text-[#9CA3AF] text-sm text-center mt-2 px-8">
              Tasks you complete will appear here for history and archiving
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
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