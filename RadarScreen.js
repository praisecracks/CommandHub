import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
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
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomLoader from './components/common/CustomLoader';
import CustomConfirmModal from './components/common/CustomConfirmModal';
import CustomInfoModal from './components/common/CustomInfoModal';
import SignalService from './components/services/SignalService';

// -------------------- Auto Banner --------------------
const AutoDismissBanner = ({ message, type, onDismiss }) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => onDismiss());
    }, 3000);

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
    <Animated.View style={[styles.bannerWrap, { opacity: fadeAnim }]}>
      <View style={[styles.banner, { backgroundColor: getBgColor() }]}>
        <Ionicons name={getIcon()} size={20} color="#000" style={{ marginRight: 8 }} />
        <Text style={styles.bannerText}>{message}</Text>
      </View>
    </Animated.View>
  );
};

// -------------------- Add Signal Modal --------------------
const AddSignalModal = ({ visible, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [system, setSystem] = useState('');
  const [type, setType] = useState('Risk');
  const [level, setLevel] = useState('Medium');
  const [detail, setDetail] = useState('');
  const [trend, setTrend] = useState('flat');
  const [due, setDue] = useState('');
  const [isFocused, setIsFocused] = useState({});

  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 500, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleSave = () => {
    if (!title.trim() || !system.trim() || !detail.trim()) {
      onSave(null); // Signal to show error modal
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    onSave({ title, system, type, level, detail, trend, due });
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setSystem('');
    setType('Risk');
    setLevel('Medium');
    setDetail('');
    setTrend('flat');
    setDue('');
  };

  const typeOptions = ['Risk', 'Opportunity', 'Deadline', 'Watch'];
  const levelOptions = ['High', 'Medium', 'Low'];
  const trendOptions = ['up', 'down', 'flat'];
  const dueOptions = ['Today', 'Tomorrow', 'This week', '4 days', 'Pending'];

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', opacity: fadeAnim, justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Add New Signal</Text>
            <Text style={styles.modalSubtitle}>Track a risk, opportunity, or deadline</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.inputLabel}>TITLE *</Text>
                <TextInput
                  style={[
                    styles.input,
                    isFocused.title && styles.inputFocused,
                  ]}
                  placeholder="e.g., Compliance Deadline"
                  placeholderTextColor="#6B7280"
                  value={title}
                  onChangeText={setTitle}
                  onFocus={() => setIsFocused((prev) => ({ ...prev, title: true }))}
                  onBlur={() => setIsFocused((prev) => ({ ...prev, title: false }))}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.inputLabel}>SYSTEM *</Text>
                <TextInput
                  style={[
                    styles.input,
                    isFocused.system && styles.inputFocused,
                  ]}
                  placeholder="e.g., AMCOS, Tech Hub"
                  placeholderTextColor="#6B7280"
                  value={system}
                  onChangeText={setSystem}
                  onFocus={() => setIsFocused((prev) => ({ ...prev, system: true }))}
                  onBlur={() => setIsFocused((prev) => ({ ...prev, system: false }))}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.inputLabel}>SIGNAL TYPE</Text>
                <View style={styles.optionWrap}>
                  {typeOptions.map((option) => {
                    const active = type === option;
                    const colors = {
                      Risk: '#EF4444',
                      Opportunity: '#10B981',
                      Deadline: '#F59E0B',
                      Watch: '#00D2FF',
                    };
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => setType(option)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? colors[option] : 'rgba(255,255,255,0.05)',
                            borderColor: active ? colors[option] : 'rgba(255,255,255,0.1)',
                          },
                        ]}
                      >
                        <Text style={{ color: active ? '#000' : '#FFF', fontSize: 13, fontWeight: '600' }}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.inputLabel}>PRIORITY LEVEL</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {levelOptions.map((option) => {
                    const active = level === option;
                    const colors = {
                      High: '#EF4444',
                      Medium: '#F59E0B',
                      Low: '#6B7280',
                    };
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => setLevel(option)}
                        style={[
                          styles.flexChip,
                          {
                            backgroundColor: active ? colors[option] : 'rgba(255,255,255,0.05)',
                            borderColor: active ? colors[option] : 'rgba(255,255,255,0.1)',
                          },
                        ]}
                      >
                        <Text style={{ color: active ? '#000' : '#FFF', fontSize: 13, fontWeight: '600' }}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.inputLabel}>DETAIL *</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.detailInput,
                    isFocused.detail && styles.inputFocused,
                  ]}
                  placeholder="Describe the signal..."
                  placeholderTextColor="#6B7280"
                  value={detail}
                  onChangeText={setDetail}
                  multiline
                  onFocus={() => setIsFocused((prev) => ({ ...prev, detail: true }))}
                  onBlur={() => setIsFocused((prev) => ({ ...prev, detail: false }))}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.inputLabel}>TREND</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {trendOptions.map((option) => {
                    const active = trend === option;
                    const icons = { up: 'trending-up', down: 'trending-down', flat: 'remove' };
                    const colors = { up: '#10B981', down: '#EF4444', flat: '#6B7280' };
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => setTrend(option)}
                        style={[
                          styles.flexChip,
                          {
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 4,
                            backgroundColor: active ? colors[option] : 'rgba(255,255,255,0.05)',
                            borderColor: active ? colors[option] : 'rgba(255,255,255,0.1)',
                          },
                        ]}
                      >
                        <Ionicons name={icons[option]} size={16} color={active ? '#000' : '#FFF'} />
                        <Text style={{ color: active ? '#000' : '#FFF', fontSize: 13, fontWeight: '600' }}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ marginBottom: 24 }}>
                <Text style={styles.inputLabel}>DUE</Text>
                <View style={styles.optionWrap}>
                  {dueOptions.map((option) => {
                    const active = due === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => setDue(option)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? '#00D2FF' : 'rgba(255,255,255,0.05)',
                            borderColor: active ? '#00D2FF' : 'rgba(255,255,255,0.1)',
                          },
                        ]}
                      >
                        <Text style={{ color: active ? '#000' : '#FFF', fontSize: 13, fontWeight: '600' }}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={() => {
                    resetForm();
                    onClose();
                  }}
                  style={styles.cancelModalBtn}
                >
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={styles.saveModalBtn}>
                  <Text style={styles.saveModalText}>Add Signal</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// -------------------- Details Modal --------------------
const SignalDetailsModal = ({ visible, signal, onClose }) => {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 500, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const getTypeColor = (type) => {
    if (type === 'Risk') return '#EF4444';
    if (type === 'Opportunity') return '#10B981';
    if (type === 'Deadline') return '#F59E0B';
    return '#00D2FF';
  };

  if (!signal) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', opacity: fadeAnim, justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={onClose} />
        <Animated.View style={{ transform: [{ translateY: slideAnim }], width: '90%', maxWidth: 420 }}>
          <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.detailsIcon, { backgroundColor: getTypeColor(signal.type) }]}>
                  <Ionicons name="eye" size={22} color="#000" />
                </View>
                <Text style={styles.detailsHeaderTitle}>Signal Details</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.detailsCloseBtn}>
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.detailsLabel}>TITLE</Text>
                <Text style={styles.detailsBigText}>{signal.title}</Text>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailsLabel}>SYSTEM</Text>
                  <Text style={styles.detailsSystem}>{signal.system}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailsLabel}>TYPE</Text>
                  <View
                    style={{
                      backgroundColor: `${getTypeColor(signal.type)}20`,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Text style={{ color: getTypeColor(signal.type), fontSize: 14, fontWeight: '600' }}>
                      {signal.type}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailsLabel}>PRIORITY</Text>
                  <Text
                    style={{
                      color:
                        signal.level === 'High'
                          ? '#EF4444'
                          : signal.level === 'Medium'
                          ? '#F59E0B'
                          : '#6B7280',
                      fontSize: 16,
                      fontWeight: '600',
                    }}
                  >
                    {signal.level}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailsLabel}>TREND</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons
                      name={
                        signal.trend === 'up'
                          ? 'trending-up'
                          : signal.trend === 'down'
                          ? 'trending-down'
                          : 'remove'
                      }
                      size={18}
                      color={
                        signal.trend === 'up'
                          ? '#10B981'
                          : signal.trend === 'down'
                          ? '#EF4444'
                          : '#6B7280'
                      }
                    />
                    <Text
                      style={{
                        color:
                          signal.trend === 'up'
                            ? '#10B981'
                            : signal.trend === 'down'
                            ? '#EF4444'
                            : '#6B7280',
                        fontSize: 14,
                        marginLeft: 4,
                        textTransform: 'capitalize',
                      }}
                    >
                      {signal.trend}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.detailsLabel}>DETAIL</Text>
                <Text style={styles.detailsDetail}>{signal.detail}</Text>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailsLabel}>DUE</Text>
                  <Text style={styles.detailsDue}>{signal.due || 'Pending'}</Text>
                </View>
                {signal.autoGenerated && (
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailsLabel}>SOURCE</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="cloud-download" size={14} color="#00D2FF" />
                      <Text style={{ color: '#00D2FF', fontSize: 14, marginLeft: 4 }}>Auto-generated</Text>
                    </View>
                  </View>
                )}
              </View>

              <TouchableOpacity onPress={onClose} style={styles.closeDetailsBtn}>
                <Text style={styles.closeDetailsText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// -------------------- Helpers --------------------
const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();

const dedupeSignals = (items) => {
  const map = new Map();

  for (const item of items) {
    const key = [
      normalizeText(item.title),
      normalizeText(item.system),
      normalizeText(item.type),
      normalizeText(item.detail),
    ].join('|');

    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
    } else {
      const currentTime = item.createdAt || 0;
      const existingTime = existing.createdAt || 0;

      if (currentTime > existingTime) {
        map.set(key, item);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
};

// -------------------- Main Screen --------------------
export default function RadarScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [signals, setSignals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const checkingRef = useRef(false);

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

  const [banner, setBanner] = useState({ visible: false, message: '', type: '' });

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [lastChecked, setLastChecked] = useState(null);

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadLocalSignals();
  }, []);

  const loadLocalSignals = async () => {
    try {
      const saved = await AsyncStorage.getItem('radarSignals');
      if (saved) {
        setSignals(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading local signals:', error);
    }
  };

  const saveLocalSignals = async (signalsToSave) => {
    try {
      await AsyncStorage.setItem('radarSignals', JSON.stringify(signalsToSave));
    } catch (error) {
      console.error('Error saving local signals:', error);
    }
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

  const showBanner = (message, type = 'offline') => {
    setBanner({ visible: true, message, type });
  };

  const hideBanner = () => {
    setBanner({ visible: false, message: '', type: '' });
  };

  useEffect(() => {
    const user = auth?.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const signalsRef = collection(db, 'users', user.uid, 'signals');
    const q = query(signalsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const signalsData = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
          createdAt: item.data().createdAt?.toDate?.()?.getTime() || Date.now(),
        }));

        setSignals(signalsData);
        saveLocalSignals(signalsData);
        setIsLoading(false);
        setIsOffline(false);
      },
      async (error) => {
        console.error('Firestore error:', error);
        await loadLocalSignals();
        showBanner('You are offline. Showing saved data.', 'offline');
        setIsOffline(true);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filters = ['All', 'Risk', 'Opportunity', 'Deadline', 'Watch', 'External'];

  const uniqueSignals = useMemo(() => dedupeSignals(signals), [signals]);

  const filteredSignals = useMemo(() => {
    let result = uniqueSignals;

    if (activeFilter === 'External') {
      result = uniqueSignals.filter((item) => item.autoGenerated);
    } else if (activeFilter !== 'All') {
      result = uniqueSignals.filter((item) => item.type === activeFilter);
    }

    return result.sort((a, b) => {
      const aTime = a.createdAt || 0;
      const bTime = b.createdAt || 0;
      return bTime - aTime;
    });
  }, [activeFilter, uniqueSignals]);

  const visibleSignals = useMemo(() => {
    return filteredSignals.slice(0, visibleCount);
  }, [filteredSignals, visibleCount]);

  useEffect(() => {
    setVisibleCount(8);
  }, [activeFilter]);

  const stats = useMemo(() => {
    return {
      total: uniqueSignals.length,
      risks: uniqueSignals.filter((item) => item.type === 'Risk').length,
      opportunities: uniqueSignals.filter((item) => item.type === 'Opportunity').length,
      deadlines: uniqueSignals.filter((item) => item.type === 'Deadline').length,
      watchItems: uniqueSignals.filter((item) => item.type === 'Watch').length,
      highPriority: uniqueSignals.filter((item) => item.level === 'High').length,
      external: uniqueSignals.filter((item) => item.autoGenerated).length,
    };
  }, [uniqueSignals]);

  const handleAddSignal = async (signalData) => {
    if (!signalData) {
      showInfo('Error', 'Please fill in all required fields', 'error');
      return;
    }

    const user = auth?.currentUser;
    if (!user) {
      showInfo('Error', 'You must be logged in', 'error');
      return;
    }

    try {
      const signalsRef = collection(db, 'users', user.uid, 'signals');
      await addDoc(signalsRef, {
        ...signalData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        autoGenerated: false,
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setModalVisible(false);
      showInfo('Success', 'Signal added successfully', 'success');
    } catch (error) {
      console.error('Error adding signal:', error);
      showInfo('Error', 'Failed to add signal', 'error');
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const enterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedIds([]);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const selectAll = () => {
    const allIds = filteredSignals.map((s) => s.id);
    setSelectedIds(allIds);
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) {
      showInfo('No Selection', 'Please select signals to delete', 'warning');
      return;
    }

    showConfirm(
      'Delete Selected',
      `Delete ${selectedIds.length} selected signals?`,
      async () => {
        const user = auth?.currentUser;
        if (!user) return;

        try {
          const batch = writeBatch(db);
          selectedIds.forEach((id) => {
            const ref = doc(db, 'users', user.uid, 'signals', id);
            batch.delete(ref);
          });
          await batch.commit();

          setConfirmModal((prev) => ({ ...prev, visible: false }));
          exitSelectionMode();
          showInfo('Deleted', `${selectedIds.length} signals removed successfully`, 'success');

          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } catch (error) {
          console.error('Error batch deleting:', error);
          showInfo('Error', 'Failed to delete selected signals', 'error');
        }
      },
      'danger',
      'trash-outline'
    );
  };

  const handleDeleteSignal = (id) => {
    if (selectionMode) {
      toggleSelection(id);
      return;
    }

    showConfirm(
      'Delete Signal',
      'Are you sure you want to delete this signal?',
      async () => {
        const user = auth?.currentUser;
        if (!user) return;

        try {
          const signalRef = doc(db, 'users', user.uid, 'signals', id);
          await deleteDoc(signalRef);
          setConfirmModal((prev) => ({ ...prev, visible: false }));
          showInfo('Deleted', 'Signal removed successfully', 'success');
        } catch (error) {
          console.error('Error deleting signal:', error);
          showInfo('Error', 'Failed to delete signal', 'error');
        }
      },
      'danger',
      'trash-outline'
    );
  };

  const handleSignalPress = (signal) => {
    if (selectionMode) {
      toggleSelection(signal.id);
    } else {
      setSelectedSignal(signal);
      setDetailsModalVisible(true);
    }
  };

  const onRefresh = useCallback(async () => {
    if (checkingRef.current) return;

    checkingRef.current = true;
    setRefreshing(true);

    try {
      const user = auth?.currentUser;
      if (user) {
        console.log('🔄 Manual refresh - checking external signals');

        const newSignals = await SignalService.checkAllSources();

        if (Array.isArray(newSignals) && newSignals.length > 0) {
          showInfo('New Signals', `${newSignals.length} new external signals detected!`, 'success');
        } else {
          showBanner('No new external signals found.', 'success');
        }

        setLastChecked(new Date());
      }
    } catch (error) {
      console.error('Error checking signals on refresh:', error);
      showBanner('Failed to refresh signals.', 'error');
    } finally {
      checkingRef.current = false;
      setRefreshing(false);
    }
  }, []);

  const getTypeColor = (type) => {
    if (type === 'Risk') return '#EF4444';
    if (type === 'Opportunity') return '#10B981';
    if (type === 'Deadline') return '#F59E0B';
    return '#00D2FF';
  };

  const getTypeBg = (type) => {
    if (type === 'Risk') return 'rgba(239,68,68,0.10)';
    if (type === 'Opportunity') return 'rgba(16,185,129,0.10)';
    if (type === 'Deadline') return 'rgba(245,158,11,0.10)';
    return 'rgba(0,210,255,0.10)';
  };

  const getTypeIcon = (type) => {
    if (type === 'Risk') return 'alert-circle-outline';
    if (type === 'Opportunity') return 'trending-up-outline';
    if (type === 'Deadline') return 'time-outline';
    return 'eye-outline';
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return 'caret-up';
    if (trend === 'down') return 'caret-down';
    return 'remove';
  };

  const getTrendColor = (trend, type) => {
    if (trend === 'up') return type === 'Opportunity' ? '#10B981' : '#F59E0B';
    if (trend === 'down') return '#EF4444';
    return '#6B7280';
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  if (isLoading && signals.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#050508' }}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>RADAR</Text>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <CustomLoader 
              type="inline" 
              message="Scanning Radar..." 
              subtext="Detecting emerging signals and system alerts"
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {banner.visible && (
        <AutoDismissBanner message={banner.message} type={banner.type} onDismiss={hideBanner} />
      )}

      {selectionMode && (
        <View style={styles.selectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="checkbox-outline" size={20} color="#000" />
            <Text style={styles.selectionText}>{selectedIds.length} selected</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 16 }}>
            <TouchableOpacity onPress={selectAll}>
              <Text style={styles.selectionAction}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={deleteSelected}>
              <Text style={styles.selectionAction}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={exitSelectionMode}>
              <Ionicons name="close" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Animated.View style={[styles.fixedHeader, { opacity: headerOpacity }]}>
        <View style={styles.header}>
          <Text style={styles.topLabel}>Strategic Intelligence</Text>
          <Text style={styles.title}>Radar</Text>
          <Text style={styles.subtitle}>
            Watch risks, deadlines, opportunities and weak signals.
          </Text>
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Radar Overview</Text>

          <View style={styles.overviewTopRow}>
            <View>
              <Text style={styles.bigNumber}>{stats.total}</Text>
              <Text style={styles.smallMuted}>Unique Signals</Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.highPriorityNumber}>{stats.highPriority}</Text>
              <Text style={styles.smallMuted}>High Priority</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#EF4444' }]}>{stats.risks}</Text>
              <Text style={styles.statLabel}>Risks</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.opportunities}</Text>
              <Text style={styles.statLabel}>Opp.</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.deadlines}</Text>
              <Text style={styles.statLabel}>Deadlines</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#00D2FF' }]}>{stats.watchItems}</Text>
              <Text style={styles.statLabel}>Watch</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#8B5CF6' }]}>{stats.external}</Text>
              <Text style={styles.statLabel}>External</Text>
            </View>
          </View>
        </View>

        {lastChecked && (
          <View style={styles.lastCheckedRow}>
            <Ionicons name="cloud-done" size={14} color="#00D2FF" />
            <Text style={styles.lastCheckedText}>
              Last checked: {lastChecked.toLocaleTimeString()}
            </Text>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {filters.map((filter) => {
              const active = activeFilter === filter;

              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  activeOpacity={0.85}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.topActionRow}>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.newButton}>
            <Ionicons name="add" size={22} color="#00D2FF" />
            <Text style={styles.newButtonText}>New</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={enterSelectionMode} style={styles.selectButton}>
            <Ionicons name="checkbox-outline" size={22} color="#00D2FF" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.signalsScrollView}
        contentContainerStyle={styles.signalsContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D2FF" />
        }
      >
        <View style={styles.signalsHeader}>
          <Text style={styles.sectionTitle}>Signals</Text>
          <Text style={styles.sectionSubtitle}>Items that need awareness, not just action.</Text>
        </View>

        {filteredSignals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="radio-outline" size={48} color="#4B5563" />
            <Text style={styles.emptyTitle}>No signals here</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'All'
                ? 'Add your first signal to start tracking'
                : activeFilter === 'External'
                ? 'No external signals detected yet'
                : `No ${activeFilter.toLowerCase()} signals found`}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.emptyAddBtn}>
              <Text style={styles.emptyAddBtnText}>Add Signal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {visibleSignals.map((alert) => (
              <TouchableOpacity
                key={alert.id}
                activeOpacity={0.85}
                style={[
                  styles.signalCard,
                  selectionMode &&
                    selectedIds.includes(alert.id) && {
                      borderColor: '#00D2FF',
                      borderWidth: 2,
                      backgroundColor: 'rgba(0,210,255,0.05)',
                    },
                ]}
                onPress={() => handleSignalPress(alert)}
                onLongPress={() => {
                  if (!selectionMode) {
                    enterSelectionMode();
                    toggleSelection(alert.id);
                  }
                }}
                delayLongPress={500}
              >
                <View style={styles.signalRow}>
                  {selectionMode && (
                    <View
                      style={[
                        styles.selectionCircle,
                        selectedIds.includes(alert.id) && styles.selectionCircleActive,
                      ]}
                    >
                      {selectedIds.includes(alert.id) && (
                        <Ionicons name="checkmark" size={14} color="#000" />
                      )}
                    </View>
                  )}

                  <View style={[styles.iconWrap, { backgroundColor: getTypeBg(alert.type) }]}>
                    <Ionicons
                      name={getTypeIcon(alert.type)}
                      size={22}
                      color={getTypeColor(alert.type)}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.signalTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Text style={styles.systemText}>{alert.system}</Text>
                        {alert.autoGenerated && (
                          <View style={styles.autoBadge}>
                            <Ionicons name="cloud-download" size={10} color="#00D2FF" />
                            <Text style={styles.autoBadgeText}>AUTO</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.levelRow}>
                        <Ionicons
                          name={getTrendIcon(alert.trend)}
                          size={12}
                          color={getTrendColor(alert.trend, alert.type)}
                        />
                        <Text
                          style={[
                            styles.levelText,
                            { color: getTrendColor(alert.trend, alert.type) },
                          ]}
                        >
                          {alert.level}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.signalTitle}>{alert.title}</Text>
                    <Text style={styles.signalDetail} numberOfLines={2}>
                      {alert.detail}
                    </Text>

                    <View style={styles.signalBottomRow}>
                      <View
                        style={[
                          styles.typeBadge,
                          { backgroundColor: `${getTypeColor(alert.type)}20` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeBadgeText,
                            { color: getTypeColor(alert.type) },
                          ]}
                        >
                          {alert.type}
                        </Text>
                      </View>

                      <Text style={styles.dueText}>{alert.due || 'Pending'}</Text>
                    </View>
                  </View>

                  {!selectionMode && (
                    <TouchableOpacity
                      onPress={() => handleDeleteSignal(alert.id)}
                      style={{ marginLeft: 10, paddingTop: 2 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {visibleCount < filteredSignals.length && (
              <TouchableOpacity
                onPress={() => setVisibleCount((prev) => prev + 8)}
                style={styles.loadMoreBtn}
              >
                <Ionicons name="chevron-down" size={18} color="#00D2FF" />
                <Text style={styles.loadMoreText}>
                  View more signals ({filteredSignals.length - visibleCount} more)
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </Animated.ScrollView>

      <AddSignalModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleAddSignal}
      />

      <SignalDetailsModal
        visible={detailsModalVisible}
        signal={selectedSignal}
        onClose={() => {
          setDetailsModalVisible(false);
          setSelectedSignal(null);
        }}
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
    backgroundColor: '#050508',
  },
  loaderScreen: {
    flex: 1,
    backgroundColor: '#050508',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: '#FFFFFF',
    marginTop: 16,
  },
  bannerWrap: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  banner: {
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerText: {
    color: '#000',
    flex: 1,
    fontWeight: '500',
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#00D2FF',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 16,
  },
  selectionText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  selectionAction: {
    color: '#000',
    fontWeight: '600',
  },
  fixedHeader: {
    backgroundColor: '#050508',
    paddingHorizontal: 24,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  header: {
    marginBottom: 20,
  },
  topLabel: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
    opacity: 0.5,
  },
  title: {
    color: 'white',
    fontSize: 36,
    fontWeight: '700',
    marginTop: 4,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 8,
  },
  overviewCard: {
    backgroundColor: '#0D1117',
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20,
  },
  overviewLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 18,
  },
  overviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  bigNumber: {
    color: 'white',
    fontSize: 48,
    fontWeight: '300',
  },
  highPriorityNumber: {
    color: '#EF4444',
    fontSize: 28,
    fontWeight: '700',
  },
  smallMuted: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 18,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 4,
  },
  lastCheckedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  lastCheckedText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginLeft: 4,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginRight: 10,
  },
  filterPillActive: {
    backgroundColor: '#00D2FF',
    borderColor: '#00D2FF',
  },
  filterText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterTextActive: {
    color: 'black',
  },
  topActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  newButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,210,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,210,255,0.3)',
    padding: 16,
    borderRadius: 16,
  },
  newButtonText: {
    color: '#00D2FF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  selectButton: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signalsScrollView: {
    flex: 1,
    backgroundColor: '#050508',
  },
  signalsContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  signalsHeader: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: '#6B7280',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#0D1117',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  emptyTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 14,
  },
  emptySubtitle: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyAddBtn: {
    marginTop: 16,
    backgroundColor: '#00D2FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyAddBtnText: {
    color: '#000',
    fontWeight: '600',
  },
  signalCard: {
    backgroundColor: '#0D1117',
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 14,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  selectionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectionCircleActive: {
    borderColor: '#00D2FF',
    backgroundColor: '#00D2FF',
  },
  iconWrap: {
    padding: 14,
    borderRadius: 18,
    marginRight: 14,
  },
  signalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  systemText: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  autoBadge: {
    backgroundColor: 'rgba(0,210,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  autoBadgeText: {
    color: '#00D2FF',
    fontSize: 8,
    marginLeft: 2,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  signalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  signalDetail: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  signalBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  dueText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  loadMoreBtn: {
    marginTop: 6,
    backgroundColor: 'rgba(0,210,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,210,255,0.18)',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  loadMoreText: {
    color: '#00D2FF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSheet: {
    backgroundColor: '#12121a',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#4B5563',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 24,
  },
  inputLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1f1f2a',
    color: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputFocused: {
    backgroundColor: 'rgba(0,210,255,0.05)',
    borderColor: '#00D2FF',
  },
  detailInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionWrap: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  flexChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  cancelModalText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveModalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#00D2FF',
    alignItems: 'center',
  },
  saveModalText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  detailsCard: {
    backgroundColor: '#12121a',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: '82%',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  detailsCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
  },
  detailsBigText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  detailsSystem: {
    color: '#00D2FF',
    fontSize: 16,
    fontWeight: '500',
  },
  detailsDetail: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },
  detailsDue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  closeDetailsBtn: {
    backgroundColor: '#00D2FF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  closeDetailsText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});