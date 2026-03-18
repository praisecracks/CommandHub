// components/delegate/AddTaskModal.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  StyleSheet,
  Dimensions,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import {
  collection,
  query,
  onSnapshot,
} from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import NotificationService from '../services/NotificationService';
import CustomInfoModal from '../common/CustomInfoModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const QUADRANT_OPTIONS = [
  { id: 'only-you', label: 'Only You', icon: 'person', color: '#00D2FF' },
  { id: 'delegate', label: 'Delegate', icon: 'swap-horizontal', color: '#A855F7' },
  { id: 'waiting', label: 'Waiting', icon: 'time', color: '#F59E0B' },
  { id: 'escalate', label: 'Escalate', icon: 'warning', color: '#EF4444' },
];

const PRIORITY_OPTIONS = [
  { id: 'low', label: 'Low', color: '#10B981' },
  { id: 'medium', label: 'Medium', color: '#F59E0B' },
  { id: 'high', label: 'High', color: '#EF4444' },
  { id: 'critical', label: 'Critical', color: '#7F1D1D' },
];

const SYSTEM_OPTIONS = ['General', 'Finance', 'Operations', 'HR', 'TrustLine', 'FarmRunner', 'Tech Hub'];

// 🔥 NEW: Department options for your organization
const DEPARTMENT_OPTIONS = [
  { id: 'unleashified', label: '🚀 Unleashified', color: '#00D2FF' },
  { id: 'dimplified', label: '⚡ Dimplified', color: '#A855F7' },
  { id: 'remsana', label: '🌱 Remsana', color: '#10B981' },
  { id: 'gfa', label: '🎓 GFA Foundation', color: '#F59E0B' },
];

export default function AddTaskModal({ visible, onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quadrant, setQuadrant] = useState('only-you');
  const [priority, setPriority] = useState('medium');
  const [system, setSystem] = useState('General');
  const [customSystem, setCustomSystem] = useState('');
  const [showCustomSystem, setShowCustomSystem] = useState(false);
  
  // 🔥 NEW: Department state
  const [department, setDepartment] = useState('unleashified');
  
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [dueDate, setDueDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isSending, setIsSending] = useState(false);

  // Error modal state
  const [errorModal, setErrorModal] = useState({
    visible: false,
    title: '',
    message: '',
  });

  const showError = (title, message) => {
    setErrorModal({ visible: true, title, message });
  };

  useEffect(() => {
    const user = auth?.currentUser;
    if (!user) return;

    const contactsRef = collection(db, 'users', user.uid, 'contacts');
    const q = query(contactsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contactsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setContacts(contactsData);
    });

    return () => unsubscribe();
  }, []);

  const filteredContacts = contacts.filter(contact => 
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.includes(searchQuery)
  );

  const resetForm = () => {
    setStep(1);
    setTitle('');
    setDescription('');
    setQuadrant('only-you');
    setPriority('medium');
    setSystem('General');
    setCustomSystem('');
    setShowCustomSystem(false);
    setDepartment('unleashified'); // Reset department
    setSelectedContact(null);
    setSearchQuery('');
    setDueDate(null);
    setIsSending(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateStep1 = () => {
    if (!title.trim()) {
      showError('Error', 'Please enter a task title');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep1()) return;
    
    if (quadrant === 'delegate') {
      setStep(2);
    } else {
      handleSave();
    }
  };

  const handleSave = () => {
    if (quadrant === 'delegate' && !selectedContact) {
      showError('Error', 'Please select someone to delegate to');
      return;
    }

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      quadrant,
      priority,
      system: showCustomSystem ? customSystem.trim() : system,
      // 🔥 NEW: Include department in task data
      department: department,
      departmentName: DEPARTMENT_OPTIONS.find(d => d.id === department)?.label,
      status: 'pending',
      createdAt: new Date(),
      dueDate: dueDate ? dueDate.toISOString() : null,
    };

    if (quadrant === 'delegate' && selectedContact) {
      taskData.assignedTo = selectedContact.id;
      taskData.assignedToName = selectedContact.name;
      taskData.assignedToPhone = selectedContact.phone;
      taskData.assignedToSystem = selectedContact.system;
      taskData.assignedToRole = selectedContact.role;
      taskData.delegatedAt = new Date();
    }

    if (quadrant === 'waiting') {
      taskData.waitingSince = new Date();
      taskData.waitingReason = description.trim() || 'Awaiting response';
    }

    // Save the task first
    onSave(taskData);

    // Send notification if it's a delegated task with a phone number
    if (quadrant === 'delegate' && selectedContact?.phone) {
      showNotificationPrompt(taskData);
    } else {
      resetForm();
    }
  };

  // UPDATED: Using the enhanced NotificationService
  const showNotificationPrompt = (taskData) => {
    const user = auth?.currentUser;
    const assignedByName =
      user?.displayName || user?.email?.split('@')[0] || 'A manager';

    // Use the enhanced notifyAssignee function from NotificationService
    NotificationService.notifyAssignee(
      {
        assignedToPhone: selectedContact.phone,
        assignedToName: selectedContact.name,
        title: taskData.title,
        description: taskData.description // Added description
      },
      assignedByName
    ).then(() => {
      resetForm();
    });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const formatDate = (date) => {
    if (!date) return 'No due date';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>
                  {step === 1 ? 'Create Task' : 'Select Assignee'}
                </Text>
                {step === 2 && (
                  <Text style={styles.headerSubtitle}>
                    Step 2 of 2
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton} disabled={isSending}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Step Indicator */}
            <View style={styles.stepIndicator}>
              <View style={[styles.stepProgress, step >= 1 && styles.stepActive]} />
              <View style={[styles.stepProgress, step >= 2 && styles.stepActive]} />
            </View>

            {/* Step Content */}
            {step === 1 ? (
              /* Step 1: Basic Info */
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {/* Title Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>TITLE *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Prepare Q3 Report"
                    placeholderTextColor="#6B7280"
                    value={title}
                    onChangeText={setTitle}
                    autoFocus
                    editable={!isSending}
                  />
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>DESCRIPTION</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add details, instructions, or context..."
                    placeholderTextColor="#6B7280"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    editable={!isSending}
                  />
                </View>

                {/* Quadrant Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>QUADRANT *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.optionsRow}>
                      {QUADRANT_OPTIONS.map((q) => (
                        <TouchableOpacity
                          key={q.id}
                          onPress={() => setQuadrant(q.id)}
                          style={[
                            styles.optionChip,
                            quadrant === q.id && { backgroundColor: q.color }
                          ]}
                          disabled={isSending}
                        >
                          <Ionicons 
                            name={q.icon} 
                            size={16} 
                            color={quadrant === q.id ? '#000' : '#9CA3AF'} 
                          />
                          <Text style={[
                            styles.optionText,
                            { color: quadrant === q.id ? '#000' : '#FFF' }
                          ]}>
                            {q.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Priority Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PRIORITY</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.optionsRow}>
                      {PRIORITY_OPTIONS.map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          onPress={() => setPriority(p.id)}
                          style={[
                            styles.optionChip,
                            priority === p.id && { backgroundColor: p.color }
                          ]}
                          disabled={isSending}
                        >
                          <Text style={[
                            styles.optionText,
                            { color: priority === p.id ? '#000' : '#FFF' },
                            { textTransform: 'capitalize' }
                          ]}>
                            {p.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* System Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>SYSTEM</Text>
                  {!showCustomSystem ? (
                    <>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.optionsRow}>
                          {SYSTEM_OPTIONS.map((opt) => (
                            <TouchableOpacity
                              key={opt}
                              onPress={() => setSystem(opt)}
                              style={[
                                styles.optionChip,
                                system === opt && { backgroundColor: '#00D2FF' }
                              ]}
                              disabled={isSending}
                            >
                              <Text style={[
                                styles.optionText,
                                { color: system === opt ? '#000' : '#FFF' }
                              ]}>
                                {opt}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                      <TouchableOpacity
                        onPress={() => setShowCustomSystem(true)}
                        style={styles.customSystemButton}
                        disabled={isSending}
                      >
                        <Ionicons name="add-circle-outline" size={16} color="#00D2FF" />
                        <Text style={styles.customSystemText}>Add custom system</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter custom system name"
                        placeholderTextColor="#6B7280"
                        value={customSystem}
                        onChangeText={setCustomSystem}
                        autoFocus
                        editable={!isSending}
                      />
                      <TouchableOpacity
                        onPress={() => {
                          setShowCustomSystem(false);
                          setCustomSystem('');
                        }}
                        style={styles.cancelCustomButton}
                        disabled={isSending}
                      >
                        <Text style={styles.cancelCustomText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* 🔥 NEW: Department Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>DEPARTMENT</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.optionsRow}>
                      {DEPARTMENT_OPTIONS.map((dept) => (
                        <TouchableOpacity
                          key={dept.id}
                          onPress={() => setDepartment(dept.id)}
                          style={[
                            styles.optionChip,
                            department === dept.id && { backgroundColor: dept.color }
                          ]}
                          disabled={isSending}
                        >
                          <Text style={[
                            styles.optionText,
                            { color: department === dept.id ? '#000' : '#FFF' }
                          ]}>
                            {dept.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Due Date */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>DUE DATE</Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={styles.datePickerButton}
                    disabled={isSending}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#00D2FF" />
                    <Text style={[styles.dateText, dueDate && styles.dateTextSelected]}>
                      {dueDate ? formatDate(dueDate) : 'Set due date (optional)'}
                    </Text>
                    {dueDate && (
                      <TouchableOpacity onPress={() => setDueDate(null)} disabled={isSending}>
                        <Ionicons name="close-circle" size={18} color="#6B7280" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={dueDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setDueDate(selectedDate);
                      }}
                    />
                  )}
                </View>

                {/* Navigation Buttons */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    onPress={handleClose} 
                    style={styles.cancelButton}
                    disabled={isSending}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleNext} 
                    style={styles.nextButton}
                    disabled={isSending}
                  >
                    <Text style={styles.nextButtonText}>
                      {isSending ? 'Sending...' : (quadrant === 'delegate' ? 'Next' : 'Create Task')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              /* Step 2: Assignee Selection */
              <View style={styles.step2Container}>
                {/* Search */}
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={18} color="#6B7280" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search contacts..."
                    placeholderTextColor="#6B7280"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    editable={!isSending}
                  />
                </View>

                {/* Contacts List */}
                {contacts.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={48} color="#4B5563" />
                    <Text style={styles.emptyTitle}>No contacts available</Text>
                    <Text style={styles.emptySubtitle}>Add contacts in the Contacts screen first</Text>
                  </View>
                ) : filteredContacts.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={48} color="#4B5563" />
                    <Text style={styles.emptyTitle}>No matching contacts</Text>
                    <Text style={styles.emptySubtitle}>Try a different search term</Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredContacts}
                    keyExtractor={(item) => item.id}
                    style={styles.contactsList}
                    showsVerticalScrollIndicator={true}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => setSelectedContact(item)}
                        style={[
                          styles.contactItem,
                          selectedContact?.id === item.id && styles.contactItemSelected
                        ]}
                        disabled={isSending}
                      >
                        <View style={[styles.contactAvatar, { backgroundColor: item.color || '#A855F7' }]}>
                          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                        </View>
                        <View style={styles.contactInfo}>
                          <Text style={styles.contactName}>{item.name}</Text>
                          <Text style={styles.contactDetails}>
                            {item.system || 'Contact'} • {item.phone || 'No phone'}
                          </Text>
                        </View>
                        {selectedContact?.id === item.id && (
                          <Ionicons name="checkmark-circle" size={20} color="#00D2FF" />
                        )}
                      </TouchableOpacity>
                    )}
                  />
                )}

                {/* Action Buttons */}
                <View style={styles.step2ButtonRow}>
                  <TouchableOpacity 
                    onPress={() => setStep(1)} 
                    style={styles.backButton}
                    disabled={isSending}
                  >
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    style={[styles.assignButton, (!selectedContact || isSending) && styles.assignButtonDisabled]}
                    disabled={!selectedContact || isSending}
                  >
                    <Text style={[styles.assignButtonText, (!selectedContact || isSending) && styles.assignButtonTextDisabled]}>
                      {isSending ? 'Sending...' : 'Assign Task'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111B21',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    height: SCREEN_HEIGHT * 0.9,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  stepIndicator: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  stepProgress: {
    flex: 1,
    height: 4,
    backgroundColor: '#2A2F36',
    borderRadius: 2,
  },
  stepActive: {
    backgroundColor: '#00D2FF',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1B1C24',
    color: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#1B1C24',
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
  },
  customSystemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  customSystemText: {
    color: '#00D2FF',
    fontSize: 12,
    marginLeft: 6,
  },
  cancelCustomButton: {
    marginTop: 6,
  },
  cancelCustomText: {
    color: '#EF4444',
    fontSize: 12,
  },
  datePickerButton: {
    backgroundColor: '#1B1C24',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: '#6B7280',
    marginLeft: 10,
    flex: 1,
    fontSize: 15,
  },
  dateTextSelected: {
    color: '#FFFFFF',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#1B1C24',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#00D2FF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  step2Container: {
    flex: 1,
    height: SCREEN_HEIGHT * 0.7,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B1C24',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    marginLeft: 10,
    fontSize: 14,
  },
  contactsList: {
    flex: 1,
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  contactItemSelected: {
    backgroundColor: 'rgba(0,210,255,0.1)',
    borderWidth: 1,
    borderColor: '#00D2FF',
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactDetails: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  step2ButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 10,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#1B1C24',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  assignButton: {
    flex: 1,
    backgroundColor: '#00D2FF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  assignButtonDisabled: {
    backgroundColor: '#2A2F36',
  },
  assignButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  assignButtonTextDisabled: {
    color: '#6B7280',
  },
});