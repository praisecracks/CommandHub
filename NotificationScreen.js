import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from './firebaseConfig';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  writeBatch,
  serverTimestamp,
  limit,
  deleteDoc,
} from 'firebase/firestore';
import * as Haptics from 'expo-haptics';

const NOTIFICATION_TYPES = {
  task_assigned: { icon: '📋', color: '#6EA8FE', label: 'Task Assigned' },
  deadline_approaching: { icon: '⏰', color: '#F59E0B', label: 'Deadline' },
  task_completed: { icon: '✅', color: '#30C48D', label: 'Completed' },
  follow_up: { icon: '👋', color: '#8B5CF6', label: 'Follow-up' },
  escalated: { icon: '⚠️', color: '#EF4444', label: 'Escalated' },
  comment: { icon: '💬', color: '#94A3B8', label: 'Comment' },
  decision_reminder: { icon: '📊', color: '#F59E0B', label: 'Decision Reminder' },
  decision_overdue: { icon: '⚠️', color: '#EF4444', label: 'Decision Overdue' },
  decision_completed: { icon: '✅', color: '#30C48D', label: 'Decision Completed' },
};

const FILTERS = ['All', 'Unread', 'Tasks', 'Decisions'];

const COLORS = {
  bg: '#0B1118',
  surface: '#121A23',
  surfaceSoft: '#16202B',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.12)',
  text: '#F3F6FA',
  textMuted: '#A7B4C2',
  textSoft: '#7F8C99',
  primary: '#6EA8FE',
  danger: '#EF4444',
  success: '#30C48D',
  warning: '#F59E0B',
};

function buildFallbackEventKey(item) {
  return [
    item.type || 'notification',
    item.title || '',
    item.body || '',
    item.data?.taskId || '',
    item.data?.decisionId || '',
    item.data?.commentId || '',
    item.data?.followUpId || '',
    item.recipientUid || '',
  ].join('__');
}

function dedupeNotifications(items) {
  const map = new Map();

  for (const item of items) {
    if (item.deleted) continue;

    const dedupeKey = item.eventKey || buildFallbackEventKey(item);

    if (!map.has(dedupeKey)) {
      map.set(dedupeKey, item);
    } else {
      const existing = map.get(dedupeKey);
      const existingTime = existing.createdAt?.getTime?.() || 0;
      const currentTime = item.createdAt?.getTime?.() || 0;

      if (currentTime > existingTime) {
        map.set(dedupeKey, item);
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0)
  );
}

export default function NotificationScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [detailModal, setDetailModal] = useState({
    visible: false,
    notification: null,
  });
  const [deleteModal, setDeleteModal] = useState({
    visible: false,
    mode: 'single',
    id: null,
  });
  const [clearReadModal, setClearReadModal] = useState(false);

  useEffect(() => {
    const user = auth?.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const notificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(300));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const raw = snapshot.docs.map((itemDoc) => {
          const data = itemDoc.data();

          return {
            id: itemDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(0),
          };
        });

        const cleaned = dedupeNotifications(raw);
        setNotifications(cleaned);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading notifications:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const readCount = useMemo(() => {
    return notifications.filter((n) => n.read).length;
  }, [notifications]);

  const selectedCount = selectedIds.length;

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    if (filter === 'Unread') {
      filtered = filtered.filter((n) => !n.read);
    } else if (filter === 'Tasks') {
      filtered = filtered.filter((n) => n.type?.startsWith('task_'));
    } else if (filter === 'Decisions') {
      filtered = filtered.filter((n) => n.type?.startsWith('decision_'));
    }

    return filtered;
  }, [notifications, filter]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  const handleMarkAsRead = useCallback(async (id) => {
    const user = auth?.currentUser;
    if (!user || !id) return;

    try {
      await updateDoc(doc(db, 'users', user.uid, 'notifications', id), {
        read: true,
        readAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, []);

  const handleMarkAsUnread = useCallback(async (id) => {
    const user = auth?.currentUser;
    if (!user || !id) return;

    try {
      await updateDoc(doc(db, 'users', user.uid, 'notifications', id), {
        read: false,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error marking as unread:', error);
    }
  }, []);

  const handleMarkSelectedAsRead = useCallback(async () => {
    const user = auth?.currentUser;
    if (!user || selectedIds.length === 0) return;

    try {
      const batch = writeBatch(db);

      selectedIds.forEach((id) => {
        batch.update(doc(db, 'users', user.uid, 'notifications', id), {
          read: true,
          readAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedIds([]);
      setSelectionMode(false);
    } catch (error) {
      console.error('Error marking selected as read:', error);
    }
  }, [selectedIds]);

  const handleMarkSelectedAsUnread = useCallback(async () => {
    const user = auth?.currentUser;
    if (!user || selectedIds.length === 0) return;

    try {
      const batch = writeBatch(db);

      selectedIds.forEach((id) => {
        batch.update(doc(db, 'users', user.uid, 'notifications', id), {
          read: false,
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedIds([]);
      setSelectionMode(false);
    } catch (error) {
      console.error('Error marking selected as unread:', error);
    }
  }, [selectedIds]);

  const handleMarkAllAsRead = useCallback(async () => {
    const user = auth?.currentUser;
    if (!user) return;

    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    try {
      const batch = writeBatch(db);

      unread.forEach((n) => {
        batch.update(doc(db, 'users', user.uid, 'notifications', n.id), {
          read: true,
          readAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [notifications]);

  const handleDelete = useCallback((id) => {
    setDeleteModal({ visible: true, mode: 'single', id });
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    setDeleteModal({ visible: true, mode: 'multiple', id: null });
  }, [selectedIds]);

  const confirmDelete = useCallback(async () => {
    const user = auth?.currentUser;
    if (!user) return;

    try {
      if (deleteModal.mode === 'single' && deleteModal.id) {
        await deleteDoc(doc(db, 'users', user.uid, 'notifications', deleteModal.id));
      } else if (deleteModal.mode === 'multiple' && selectedIds.length > 0) {
        const batch = writeBatch(db);

        selectedIds.forEach((selectedId) => {
          batch.delete(doc(db, 'users', user.uid, 'notifications', selectedId));
        });

        await batch.commit();
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedIds([]);
      setSelectionMode(false);
      setDeleteModal({ visible: false, mode: 'single', id: null });
    } catch (error) {
      console.error('Error deleting notifications:', error);
      setDeleteModal({ visible: false, mode: 'single', id: null });
    }
  }, [deleteModal, selectedIds]);

  const handleClearReadNotifications = useCallback(async () => {
    const user = auth?.currentUser;
    if (!user) return;

    const readNotifications = notifications.filter((item) => item.read);
    if (readNotifications.length === 0) {
      setClearReadModal(false);
      return;
    }

    try {
      const batch = writeBatch(db);

      readNotifications.forEach((item) => {
        batch.delete(doc(db, 'users', user.uid, 'notifications', item.id));
      });

      await batch.commit();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error clearing read notifications:', error);
    } finally {
      setClearReadModal(false);
    }
  }, [notifications]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds([]);
  }, []);

  const handlePress = useCallback(
    async (notification) => {
      if (selectionMode) {
        setSelectedIds((prev) => {
          const exists = prev.includes(notification.id);
          const next = exists
            ? prev.filter((id) => id !== notification.id)
            : [...prev, notification.id];

          if (next.length === 0) {
            setSelectionMode(false);
          }

          return next;
        });

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      if (!notification.read) {
        await handleMarkAsRead(notification.id);
      }

      setDetailModal({
        visible: true,
        notification: {
          ...notification,
          read: true,
        },
      });
    },
    [selectionMode, handleMarkAsRead]
  );

  const handleLongPress = useCallback((notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectionMode(true);
    setSelectedIds([notification.id]);
  }, []);

  const timeAgo = (date) => {
    if (!date) return '';

    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDeleteMessage = () => {
    if (deleteModal.mode === 'multiple') {
      return `Delete ${selectedIds.length} notification${selectedIds.length > 1 ? 's' : ''}?`;
    }
    return 'Delete this notification?';
  };

  const navigateFromNotification = (notification) => {
    if (!notification) return;

    if (notification.type?.startsWith('decision') && notification.data?.decisionId) {
      navigation.navigate('DecisionScreen', {
        decisionId: notification.data.decisionId,
      });
      return;
    }

    if (notification.type?.startsWith('task_') && notification.data?.taskId) {
      navigation.navigate('MainTabs', {
        screen: 'Delegate',
        params: { taskId: notification.data.taskId },
      });
      return;
    }

    if (notification.type === 'comment' && notification.data?.postId) {
      navigation.navigate('MainTabs', {
        screen: 'Hub',
        params: { postId: notification.data.postId },
      });
      return;
    }
  };

  const NotificationItem = memo(({ item, isSelected }) => {
    const type =
      NOTIFICATION_TYPES[item.type] || {
        icon: '🔔',
        color: '#94A3B8',
        label: 'Notification',
      };

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
        style={[
          styles.notificationItem,
          !item.read && styles.unreadItem,
          isSelected && styles.selectedItem,
        ]}
      >
        {selectionMode && (
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
              {isSelected && <Ionicons name="checkmark" size={14} color="#081018" />}
            </View>
          </View>
        )}

        <View style={styles.leadingBlock}>
          <View style={[styles.iconContainer, { backgroundColor: `${type.color}18` }]}>
            <Text style={styles.iconText}>{type.icon}</Text>
          </View>

          {!item.read && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.typeLabel, { color: type.color }]}>{type.label}</Text>
            <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
          </View>

          <Text style={styles.titleText} numberOfLines={1}>
            {item.title}
          </Text>

          <Text style={styles.bodyText} numberOfLines={2}>
            {item.body}
          </Text>
        </View>

        {!selectionMode && (
          <View style={styles.actionsColumn}>
            <TouchableOpacity
              onPress={() => (item.read ? handleMarkAsUnread(item.id) : handleMarkAsRead(item.id))}
              style={styles.smallActionButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={item.read ? 'mail-unread-outline' : 'checkmark-done-outline'}
                size={17}
                color={item.read ? COLORS.textMuted : COLORS.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              style={styles.smallActionButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  });

  const renderItem = useCallback(
    ({ item }) => (
      <NotificationItem item={item} isSelected={selectedIds.includes(item.id)} />
    ),
    [selectedIds, selectionMode, handlePress, handleLongPress]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {selectionMode ? `${selectedCount} selected` : 'Notifications'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {selectionMode ? (
            <>
              <TouchableOpacity onPress={handleMarkSelectedAsRead} style={styles.headerButton}>
                <Ionicons name="checkmark-done-outline" size={22} color={COLORS.primary} />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleMarkSelectedAsUnread} style={styles.headerButton}>
                <Ionicons name="mail-unread-outline" size={22} color={COLORS.warning} />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleDeleteSelected} style={styles.headerButton}>
                <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
              </TouchableOpacity>

              <TouchableOpacity onPress={exitSelectionMode} style={styles.headerButton}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.headerButton}>
                  <Ionicons name="checkmark-done-outline" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              )}

              {readCount > 0 && (
                <TouchableOpacity
                  onPress={() => setClearReadModal(true)}
                  style={styles.headerButton}
                >
                  <Ionicons name="layers-outline" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{notifications.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: COLORS.primary }]}>{unreadCount}</Text>
          <Text style={styles.summaryLabel}>Unread</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: COLORS.success }]}>{readCount}</Text>
          <Text style={styles.summaryLabel}>Read</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f}
              {f === 'Unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredNotifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color={COLORS.textSoft} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'Unread'
                ? 'No unread notifications'
                : filter === 'Tasks'
                ? 'No task notifications'
                : filter === 'Decisions'
                ? 'No decision notifications'
                : "When you get notifications, they'll appear here."}
            </Text>
          </View>
        }
      />

      <Modal transparent visible={deleteModal.visible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Ionicons
              name={deleteModal.mode === 'multiple' ? 'trash-bin' : 'trash-outline'}
              size={40}
              color={COLORS.danger}
            />

            <Text style={styles.confirmTitle}>Delete Notification</Text>
            <Text style={styles.confirmText}>{getDeleteMessage()}</Text>
            <Text style={styles.confirmWarning}>This action cannot be undone.</Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setDeleteModal({ visible: false, mode: 'single', id: null })}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, styles.deleteConfirmButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={clearReadModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Ionicons name="layers-outline" size={40} color={COLORS.primary} />

            <Text style={styles.confirmTitle}>Clear Read Notifications</Text>
            <Text style={styles.confirmText}>
              Remove all notifications you have already read?
            </Text>
            <Text style={styles.confirmWarning}>Unread notifications will remain.</Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setClearReadModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, styles.primaryConfirmButton]}
                onPress={handleClearReadNotifications}
              >
                <Text style={styles.primaryConfirmText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={detailModal.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            <View style={styles.detailHeader}>
              <View
                style={[
                  styles.detailIcon,
                  {
                    backgroundColor: `${
                      NOTIFICATION_TYPES[detailModal.notification?.type]?.color || '#94A3B8'
                    }20`,
                  },
                ]}
              >
                <Text style={styles.detailIconText}>
                  {NOTIFICATION_TYPES[detailModal.notification?.type]?.icon || '🔔'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setDetailModal({ visible: false, notification: null })}
              >
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.detailType}>
              {NOTIFICATION_TYPES[detailModal.notification?.type]?.label || 'Notification'}
            </Text>

            <Text style={styles.detailTitle}>
              {detailModal.notification?.title}
            </Text>

            <Text style={styles.detailTime}>
              {detailModal.notification?.createdAt
                ? timeAgo(detailModal.notification.createdAt)
                : ''}
            </Text>

            <View style={styles.detailDivider} />

            <ScrollView style={styles.detailBody}>
              <Text style={styles.detailBodyText}>
                {detailModal.notification?.body}
              </Text>
            </ScrollView>

            <View style={styles.detailFooterActions}>
              <TouchableOpacity
                style={styles.detailSecondaryAction}
                onPress={() => {
                  const n = detailModal.notification;
                  if (!n) return;

                  if (n.read) {
                    handleMarkAsUnread(n.id);
                  } else {
                    handleMarkAsRead(n.id);
                  }

                  setDetailModal({ visible: false, notification: null });
                }}
              >
                <Ionicons
                  name={detailModal.notification?.read ? 'mail-unread-outline' : 'checkmark-done-outline'}
                  size={18}
                  color={COLORS.text}
                />
                <Text style={styles.detailSecondaryActionText}>
                  {detailModal.notification?.read ? 'Mark unread' : 'Mark read'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.detailAction,
                  {
                    backgroundColor:
                      NOTIFICATION_TYPES[detailModal.notification?.type]?.color ||
                      COLORS.primary,
                  },
                ]}
                onPress={() => {
                  const n = detailModal.notification;
                  setDetailModal({ visible: false, notification: null });
                  navigateFromNotification(n);
                }}
              >
                <Text style={styles.detailActionText}>View Details</Text>
                <Ionicons name="arrow-forward" size={18} color="#081018" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryLabel: {
    color: COLORS.textSoft,
    fontSize: 12,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(110,168,254,0.10)',
    borderColor: 'rgba(110,168,254,0.25)',
  },
  filterText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(18,26,35,0.92)',
    borderRadius: 18,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unreadItem: {
    backgroundColor: 'rgba(110,168,254,0.06)',
    borderColor: 'rgba(110,168,254,0.18)',
  },
  selectedItem: {
    backgroundColor: 'rgba(110,168,254,0.14)',
    borderColor: COLORS.primary,
  },
  checkboxContainer: {
    justifyContent: 'center',
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  leadingBlock: {
    alignItems: 'center',
    marginRight: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 8,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timeText: {
    color: COLORS.textSoft,
    fontSize: 11,
  },
  titleText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  bodyText: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  actionsColumn: {
    justifyContent: 'space-between',
    marginLeft: 8,
  },
  smallActionButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 21,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  confirmModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  confirmText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  confirmWarning: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  deleteConfirmButton: {
    backgroundColor: COLORS.danger,
  },
  primaryConfirmButton: {
    backgroundColor: COLORS.primary,
  },
  cancelText: {
    color: COLORS.text,
    fontWeight: '700',
  },
  deleteConfirmText: {
    color: '#FFF',
    fontWeight: '800',
  },
  primaryConfirmText: {
    color: '#081018',
    fontWeight: '800',
  },
  detailModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailIconText: {
    fontSize: 28,
  },
  detailType: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  detailTitle: {
    color: COLORS.text,
    fontSize: 23,
    fontWeight: '800',
    marginBottom: 8,
  },
  detailTime: {
    color: COLORS.textSoft,
    fontSize: 13,
    marginBottom: 20,
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 20,
  },
  detailBody: {
    maxHeight: 220,
    marginBottom: 20,
  },
  detailBodyText: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 23,
  },
  detailFooterActions: {
    gap: 10,
  },
  detailSecondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailSecondaryActionText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  detailAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  detailActionText: {
    color: '#081018',
    fontSize: 16,
    fontWeight: '800',
  },
});