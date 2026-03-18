// screens/GateScreen.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  FlatList,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CustomLoader from './components/common/CustomLoader';
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
} from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomConfirmModal from './components/common/CustomConfirmModal';
import CustomInfoModal from './components/common/CustomInfoModal';
import ContactCard from './components/gate/ContactCard';
import AddContactModal from './components/gate/AddContactModal';

const SORT_OPTIONS = [
  { label: 'Name (A-Z)', value: 'name-asc', field: 'name', order: 'asc' },
  { label: 'Name (Z-A)', value: 'name-desc', field: 'name', order: 'desc' },
  { label: 'Newest First', value: 'createdAt-desc', field: 'createdAt', order: 'desc' },
  { label: 'Oldest First', value: 'createdAt-asc', field: 'createdAt', order: 'asc' },
  { label: 'System', value: 'system', field: 'system', order: 'asc' },
  { label: 'Role', value: 'role', field: 'role', order: 'asc' },
];

const CACHE_KEY = '@contacts_cache';

export default function GateScreen() {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('All');
  const [sortBy, setSortBy] = useState('createdAt-desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState(null);

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

  // Load cached contacts first, then fetch fresh
  useEffect(() => {
    loadCachedContacts();
    
    const user = auth?.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

    const contactsRef = collection(db, 'users', user.uid, 'contacts');
    const contactsQuery = query(contactsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      contactsQuery,
      (snapshot) => {
        const contactsData = snapshot.docs.map((contactDoc) => ({
          id: contactDoc.id,
          ...contactDoc.data(),
          createdAt: contactDoc.data().createdAt?.toDate?.() || new Date(),
        }));

        setContacts(contactsData);
        cacheContacts(contactsData);
        setIsLoading(false);
        setError(null);
      },
      (snapshotError) => {
        console.error('Error loading contacts:', snapshotError);
        setError(snapshotError.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const loadCachedContacts = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        setContacts(JSON.parse(cached));
        setIsLoading(false);
      }
    } catch (error) {
      console.log('No cached contacts yet');
    }
  };

  const cacheContacts = async (contactsData) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(contactsData));
    } catch (error) {
      console.error('Failed to cache contacts:', error);
    }
  };

  const systems = useMemo(() => {
    const uniqueSystems = Array.from(
      new Set(
        contacts
          .map((contact) => contact.system)
          .filter(Boolean)
      )
    ).sort();

    return ['All', ...uniqueSystems];
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    let filtered = [...contacts];

    if (selectedSystem !== 'All') {
      filtered = filtered.filter((contact) => contact.system === selectedSystem);
    }

    if (searchQuery.trim()) {
      const normalizedQuery = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((contact) => {
        return (
          contact.name?.toLowerCase().includes(normalizedQuery) ||
          contact.phone?.toLowerCase().includes(normalizedQuery) ||
          contact.system?.toLowerCase().includes(normalizedQuery) ||
          contact.role?.toLowerCase().includes(normalizedQuery)
        );
      });
    }

    const sortOption = SORT_OPTIONS.find(opt => opt.value === sortBy) || SORT_OPTIONS[2];
    
    filtered.sort((a, b) => {
      let aVal = a[sortOption.field];
      let bVal = b[sortOption.field];

      if (!aVal && !bVal) return 0;
      if (!aVal) return sortOption.order === 'asc' ? -1 : 1;
      if (!bVal) return sortOption.order === 'asc' ? 1 : -1;

      if (sortOption.field === 'createdAt') {
        aVal = aVal instanceof Date ? aVal.getTime() : new Date(aVal).getTime();
        bVal = bVal instanceof Date ? bVal.getTime() : new Date(bVal).getTime();
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortOption.order === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOption.order === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [contacts, searchQuery, selectedSystem, sortBy]);

  const systemCounts = useMemo(() => {
    const counts = { All: contacts.length };

    contacts.forEach((contact) => {
      const key = contact.system || 'Uncategorized';
      counts[key] = (counts[key] || 0) + 1;
    });

    return counts;
  }, [contacts]);

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

  const handleAddContact = async (contactData) => {
    const user = auth?.currentUser;
    if (!user) return;

    // Optimistic update
    const tempId = 'temp-' + Date.now();
    const tempContact = {
      id: tempId,
      ...contactData,
      createdAt: new Date(),
    };
    
    setContacts(prev => [tempContact, ...prev]);

    try {
      await addDoc(collection(db, 'users', user.uid, 'contacts'), {
        ...contactData,
        createdAt: serverTimestamp(),
      });

      setModalVisible(false);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (addError) {
      // Rollback on error
      setContacts(prev => prev.filter(c => c.id !== tempId));
      console.error('Add contact error:', addError);
      showInfo('Error', 'Failed to add contact', 'error');
    }
  };

  const handleDeleteContact = (id) => {
    if (!id) return;

    const contact = contacts.find(c => c.id === id);
    
    showConfirm(
      'Delete Contact',
      `Are you sure you want to remove ${contact?.name || 'this contact'}?`,
      async () => {
        const user = auth?.currentUser;
        if (!user) return;

        // Optimistic delete
        const deletedContact = contacts.find(c => c.id === id);
        setContacts(prev => prev.filter(c => c.id !== id));
        setConfirmModal((prev) => ({ ...prev, visible: false }));

        try {
          await deleteDoc(doc(db, 'users', user.uid, 'contacts', id));

          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
          showInfo('Success', 'Contact removed successfully', 'success');
        } catch (deleteError) {
          // Rollback on error
          setContacts(prev => [deletedContact, ...prev]);
          console.error('Error deleting contact:', deleteError);
          showInfo('Error', 'Failed to remove contact', 'error');
        }
      },
      'danger',
      'trash-outline'
    );
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Simulate refresh - Firebase will update via onSnapshot
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  }, []);

  const getCurrentSortLabel = () => {
    return SORT_OPTIONS.find(opt => opt.value === sortBy)?.label || 'Newest First';
  };

  // Show a minimal loading state only on first launch with no cached data
  if (isLoading && contacts.length === 0) {
    return (
      <View style={styles.minimalLoadingContainer}>
        <CustomLoader type="button" size="small" color="#22D3EE" />
        <Text style={styles.minimalLoadingText}>Syncing Contacts...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.container}>
        {/* Header - Always visible */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <View style={styles.teamBadge}>
              <Text style={styles.teamBadgeText}>MY TEAM</Text>
            </View>
            <Text style={styles.title}>Contacts</Text>
            <Text style={styles.subtitle}>Manage your people, calls, and follow-up flow</Text>
          </View>

          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#22D3EE" />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL</Text>
            <Text style={styles.statValue}>{contacts.length}</Text>
            <Text style={styles.statSubtext}>
              {contacts.length === 1 ? '1 contact' : `${contacts.length} contacts`}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>FILTER</Text>
            <Text style={styles.statValueSmall} numberOfLines={1}>{selectedSystem}</Text>
            <Text style={styles.statSubtext}>{filteredContacts.length} showing</Text>
          </View>
        </View>

        {/* Search and Sort */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color="#67E8F9" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, phone, role..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.8}>
                <Ionicons name="close-circle" size={18} color="#64748B" />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() => setShowSortMenu(!showSortMenu)}
            activeOpacity={0.8}
            style={styles.sortButton}
          >
            <Ionicons name="swap-vertical" size={20} color="#67E8F9" />
            {isLoading && (
              <View style={styles.loadingDot} />
            )}
          </TouchableOpacity>
        </View>

        {/* Sort Menu */}
        {showSortMenu && (
          <View style={styles.sortMenu}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  setSortBy(option.value);
                  setShowSortMenu(false);
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={[
                  styles.sortOption,
                  sortBy === option.value && styles.sortOptionActive
                ]}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === option.value && styles.sortOptionTextActive
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Ionicons name="checkmark" size={18} color="#67E8F9" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Sort Indicator */}
        <View style={styles.sortIndicator}>
          <Text style={styles.sortIndicatorText}>
            Sorted by: <Text style={styles.sortIndicatorHighlight}>{getCurrentSortLabel()}</Text>
          </Text>
          <Text style={styles.systemCountText}>{systems.length - 1} systems</Text>
        </View>

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {systems.map((system) => {
              const active = selectedSystem === system;
              const count = systemCounts[system] || 0;

              return (
                <TouchableOpacity
                  key={system}
                  onPress={() => setSelectedSystem(system)}
                  activeOpacity={0.85}
                  style={[
                    styles.categoryChip,
                    active ? styles.categoryChipActive : styles.categoryChipInactive
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      active ? styles.categoryChipTextActive : styles.categoryChipTextInactive
                    ]}
                    numberOfLines={1}
                  >
                    {system}
                  </Text>
                  <View
                    style={[
                      styles.categoryChipCount,
                      active ? styles.categoryChipCountActive : styles.categoryChipCountInactive
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipCountText,
                        active ? styles.categoryChipCountTextActive : styles.categoryChipCountTextInactive
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Contact List */}
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ContactCard
              contact={item}
              onDelete={handleDeleteContact}
            />
          )}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#22D3EE"
              colors={['#22D3EE']}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons
                  name={searchQuery || selectedSystem !== 'All' ? 'search' : 'people'}
                  size={42}
                  color="#22D3EE"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery || selectedSystem !== 'All'
                  ? 'No matching contacts'
                  : 'No contacts yet'}
              </Text>
              <Text style={styles.emptyMessage}>
                {searchQuery || selectedSystem !== 'All'
                  ? 'Try another search or filter'
                  : 'Add your first contact to get started'}
              </Text>
              {!searchQuery && selectedSystem === 'All' && (
                <TouchableOpacity
                  onPress={() => setModalVisible(true)}
                  activeOpacity={0.85}
                  style={styles.emptyAddButton}
                >
                  <Ionicons name="add" size={18} color="#000" />
                  <Text style={styles.emptyAddButtonText}>Add Contact</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </View>

      <AddContactModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleAddContact}
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
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  minimalLoadingContainer: {
    flex: 1,
    backgroundColor: '#050508',
    justifyContent: 'center',
    alignItems: 'center',
  },
  minimalLoadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#9CA3AF',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  teamBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.2)',
    backgroundColor: 'rgba(34,211,238,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  teamBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: '#67E8F9',
  },
  title: {
    marginTop: 12,
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#94A3B8',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.3)',
    backgroundColor: 'rgba(34,211,238,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.15)',
    backgroundColor: '#0B1117',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#94A3B8',
  },
  statValue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statValueSmall: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#67E8F9',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.1)',
    backgroundColor: '#10161D',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  sortButton: {
    width: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.1)',
    backgroundColor: '#10161D',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  loadingDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22D3EE',
  },
  sortMenu: {
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.1)',
    backgroundColor: '#10161D',
    padding: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortOptionActive: {
    backgroundColor: 'rgba(34,211,238,0.15)',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  sortOptionTextActive: {
    fontWeight: 'bold',
    color: '#67E8F9',
  },
  sortIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sortIndicatorText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  sortIndicatorHighlight: {
    fontWeight: 'bold',
    color: '#67E8F9',
  },
  systemCountText: {
    fontSize: 12,
    color: '#67E8F9',
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesScrollContent: {
    paddingRight: 8,
  },
  categoryChip: {
    minWidth: 108,
    marginRight: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryChipActive: {
    borderColor: '#22D3EE',
    backgroundColor: 'rgba(34,211,238,0.15)',
  },
  categoryChipInactive: {
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#11161D',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  categoryChipTextActive: {
    color: '#67E8F9',
  },
  categoryChipTextInactive: {
    color: '#FFFFFF',
  },
  categoryChipCount: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryChipCountActive: {
    backgroundColor: '#22D3EE',
  },
  categoryChipCountInactive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  categoryChipCountText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  categoryChipCountTextActive: {
    color: '#000000',
  },
  categoryChipCountTextInactive: {
    color: '#94A3B8',
  },
  listContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 64,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.2)',
    backgroundColor: 'rgba(34,211,238,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  emptyMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
    color: '#94A3B8',
  },
  emptyAddButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#22D3EE',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyAddButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
});