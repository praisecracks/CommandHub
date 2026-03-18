// components/delegate/TaskDetailsModal.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth, db } from '../../firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import MobileContactPicker from './MobileContactPicker';

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

// 🔥 NEW: Department options for your organization
const DEPARTMENT_OPTIONS = [
  { id: 'unleashified', label: '🚀 Unleashified', color: '#00D2FF' },
  { id: 'dimplified', label: '⚡ Dimplified', color: '#A855F7' },
  { id: 'remsana', label: '🌱 Remsana', color: '#10B981' },
  { id: 'gfa', label: '🎓 GFA Foundation', color: '#F59E0B' },
];

export default function TaskDetailsModal({ visible, task, onClose, onUpdate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quadrant, setQuadrant] = useState('only-you');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 🔥 NEW: Department state
  const [department, setDepartment] = useState('unleashified');
  
  // State for assignee
  const [assignedTo, setAssignedTo] = useState(null);
  const [assignedToName, setAssignedToName] = useState('');
  const [assignedToPhone, setAssignedToPhone] = useState('');
  const [assignedToSystem, setAssignedToSystem] = useState('');
  
  // State for contact picker
  const [showContactPicker, setShowContactPicker] = useState(false);

  // Load task data when modal opens
  useEffect(() => {
    console.log('TaskDetailsModal useEffect - visible:', visible, 'task:', task?.id);
    if (task && visible) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setQuadrant(task.quadrant || 'only-you');
      setPriority(task.priority || 'medium');
      setDueDate(task.dueDate ? new Date(task.dueDate) : null);
      
      // 🔥 NEW: Set department from task data
      setDepartment(task.department || 'unleashified');
      
      setAssignedTo(task.assignedTo || null);
      setAssignedToName(task.assignedToName || '');
      setAssignedToPhone(task.assignedToPhone || '');
      setAssignedToSystem(task.assignedToSystem || '');
    }
  }, [task, visible]);

  const handleSelectContact = (contact) => {
    console.log('✅ Contact selected:', contact.name);
    setAssignedTo(contact.id);
    setAssignedToName(contact.name);
    setAssignedToPhone(contact.phone || '');
    setAssignedToSystem(contact.system || '');
    setShowContactPicker(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title cannot be empty');
      return;
    }

    if (quadrant === 'delegate' && !assignedTo) {
      Alert.alert('Error', 'Please select someone to delegate to');
      return;
    }

    setIsLoading(true);
    const user = auth?.currentUser;
    if (!user) return;

    try {
      const taskRef = doc(db, 'users', user.uid, 'delegations', task.id);
      
      const updateData = {
        title: title.trim(),
        description: description.trim(),
        quadrant,
        priority,
        dueDate: dueDate ? dueDate.toISOString() : null,
        // 🔥 NEW: Include department in update
        department: department,
        departmentName: DEPARTMENT_OPTIONS.find(d => d.id === department)?.label,
        updatedAt: serverTimestamp(),
      };

      if (quadrant === 'delegate') {
        updateData.assignedTo = assignedTo;
        updateData.assignedToName = assignedToName;
        updateData.assignedToPhone = assignedToPhone || '';
        updateData.assignedToSystem = assignedToSystem || '';
      } else {
        updateData.assignedTo = null;
        updateData.assignedToName = null;
        updateData.assignedToPhone = null;
        updateData.assignedToSystem = null;
      }

      await updateDoc(taskRef, updateData);
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    } finally {
      setIsLoading(false);
    }
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
      year: 'numeric',
    });
  };

  if (!task) {
    return null;
  }

  console.log('TaskDetailsModal rendering, showContactPicker:', showContactPicker);

  return (
    <>
      {/* Main Modal */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ 
            flex: 1,
            justifyContent: 'flex-end',
          }}>
            <View style={{ 
              backgroundColor: '#111B21',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              maxHeight: '90%',
            }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' }}>Edit Task</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Title */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 6 }}>TITLE</Text>
                  <TextInput
                    style={{ backgroundColor: '#1B1C24', color: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Task title"
                    placeholderTextColor="#6B7280"
                  />
                </View>

                {/* Description */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 6 }}>DESCRIPTION</Text>
                  <TextInput
                    style={{ backgroundColor: '#1B1C24', color: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', minHeight: 80, textAlignVertical: 'top' }}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Task description"
                    placeholderTextColor="#6B7280"
                    multiline
                  />
                </View>

                {/* Quadrant */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 6 }}>QUADRANT</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {QUADRANT_OPTIONS.map((q) => (
                        <TouchableOpacity
                          key={q.id}
                          onPress={() => setQuadrant(q.id)}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            borderRadius: 24,
                            backgroundColor: quadrant === q.id ? q.color : '#1B1C24',
                            borderWidth: 1,
                            borderColor: quadrant === q.id ? q.color : 'rgba(255,255,255,0.1)',
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                        >
                          <Ionicons name={q.icon} size={16} color={quadrant === q.id ? '#000' : '#9CA3AF'} style={{ marginRight: 6 }} />
                          <Text style={{ color: quadrant === q.id ? '#000' : '#FFF', fontWeight: '600' }}>{q.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Assignee Section - Only show for Delegate quadrant */}
                {quadrant === 'delegate' && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 6 }}>ASSIGNED TO</Text>
                    <TouchableOpacity
                      onPress={() => {
                        console.log('👆 Opening contact picker');
                        setShowContactPicker(true);
                      }}
                      activeOpacity={0.7}
                      style={{
                        backgroundColor: '#1B1C24',
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      {assignedToName ? (
                        <>
                          <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: '#A855F7',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                          }}>
                            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>
                              {getInitials(assignedToName)}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '500' }}>
                              {assignedToName}
                            </Text>
                            {assignedToPhone ? (
                              <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
                                {assignedToPhone}
                              </Text>
                            ) : null}
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                        </>
                      ) : (
                        <>
                          <Ionicons name="person-add-outline" size={20} color="#00D2FF" />
                          <Text style={{ color: '#9CA3AF', marginLeft: 10, flex: 1 }}>
                            Select person to delegate to
                          </Text>
                          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Priority */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 6 }}>PRIORITY</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {PRIORITY_OPTIONS.map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          onPress={() => setPriority(p.id)}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 24,
                            backgroundColor: priority === p.id ? p.color : '#1B1C24',
                            borderWidth: 1,
                            borderColor: priority === p.id ? p.color : 'rgba(255,255,255,0.1)',
                          }}
                        >
                          <Text style={{ color: priority === p.id ? '#000' : '#FFF', fontWeight: '600', textTransform: 'capitalize' }}>
                            {p.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* 🔥 NEW: Department Selection */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 6 }}>DEPARTMENT</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {DEPARTMENT_OPTIONS.map((dept) => (
                        <TouchableOpacity
                          key={dept.id}
                          onPress={() => setDepartment(dept.id)}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 24,
                            backgroundColor: department === dept.id ? dept.color : '#1B1C24',
                            borderWidth: 1,
                            borderColor: department === dept.id ? dept.color : 'rgba(255,255,255,0.1)',
                          }}
                        >
                          <Text style={{ 
                            color: department === dept.id ? '#000' : '#FFF', 
                            fontWeight: '600' 
                          }}>
                            {dept.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Due Date */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 6 }}>DUE DATE</Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={{ backgroundColor: '#1B1C24', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#00D2FF" />
                    <Text style={{ color: dueDate ? '#FFF' : '#6B7280', marginLeft: 10, flex: 1 }}>
                      {dueDate ? formatDate(dueDate) : 'Set due date (optional)'}
                    </Text>
                    {dueDate && (
                      <TouchableOpacity onPress={() => setDueDate(null)}>
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

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                  <TouchableOpacity onPress={onClose} style={{ flex: 1, backgroundColor: '#1B1C24', paddingVertical: 16, borderRadius: 14, alignItems: 'center' }}>
                    <Text style={{ color: '#9CA3AF', fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSave} disabled={isLoading} style={{ flex: 1, backgroundColor: '#00D2FF', paddingVertical: 16, borderRadius: 14, alignItems: 'center' }}>
                    <Text style={{ color: '#000', fontWeight: 'bold' }}>{isLoading ? 'Saving...' : 'Save Changes'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contact Picker Modal - Separate from main modal */}
      {showContactPicker && (
      <MobileContactPicker
        visible={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        onSelect={handleSelectContact}
        title="Select Assignee"
      />
      )}
    </>
  );
}