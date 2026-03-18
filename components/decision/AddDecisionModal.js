// components/decision/AddDecisionModal.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';

const AddDecisionModal = ({
  visible,
  onClose,
  editingId,
  newText,
  setNewText,
  selectedPriority,
  setSelectedPriority,
  selectedDue,
  setSelectedDue,
  showCalendar,
  setShowCalendar,
  reminderEnabled,
  setReminderEnabled,
  reminderTime,
  setReminderTime,
  showTimePicker,
  setShowTimePicker,
  isRecurring,
  setIsRecurring,
  recurrence,
  setRecurrence,
  isLoading,
  onSave,
  getPriorityConfig,
  getMarkedDates,
  PRIORITY_OPTIONS,
  RECURRENCE_OPTIONS
}) => {
  
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isFocused, setIsFocused] = useState({});

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { 
          toValue: 0, 
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }),
        Animated.timing(fadeAnim, { 
          toValue: 1, 
          duration: 300, 
          useNativeDriver: true 
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { 
          toValue: 500, 
          duration: 300, 
          useNativeDriver: true 
        }),
        Animated.timing(fadeAnim, { 
          toValue: 0, 
          duration: 200, 
          useNativeDriver: true 
        })
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <Animated.View style={{
              transform: [{ translateY: slideAnim }],
              opacity: fadeAnim,
            }}>
              <View style={{ 
                backgroundColor: '#12121a', 
                borderTopLeftRadius: 20, 
                borderTopRightRadius: 20, 
                padding: 20,
                maxHeight: 500,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                borderTopWidth: 0,
              }}>
                <View style={{ 
                  width: 40, 
                  height: 4, 
                  backgroundColor: '#4B5563', 
                  borderRadius: 2, 
                  alignSelf: 'center', 
                  marginBottom: 16 
                }} />

                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: 20, 
                  fontWeight: 'bold', 
                  marginBottom: 16 
                }}>
                  {editingId ? 'Edit Decision' : 'Create Decision'}
                </Text>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <TextInput
                    style={{ 
                      backgroundColor: isFocused.title ? 'rgba(0,210,255,0.05)' : '#1f1f2a',
                      color: '#FFFFFF', 
                      padding: 12, 
                      borderRadius: 8, 
                      fontSize: 15, 
                      minHeight: 80, 
                      textAlignVertical: 'top', 
                      marginBottom: 16,
                      borderWidth: 2,
                      borderColor: isFocused.title ? '#00D2FF' : 'rgba(255,255,255,0.1)',
                    }}
                    placeholder="Enter strategic decision..."
                    placeholderTextColor="#6B7280"
                    value={newText}
                    onChangeText={setNewText}
                    multiline
                    autoFocus
                    onFocus={() => setIsFocused({...isFocused, title: true})}
                    onBlur={() => setIsFocused({...isFocused, title: false})}
                  />

                  <Text style={{ color: '#9CA3AF', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
                    Priority
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {PRIORITY_OPTIONS.map((item) => {
                        const active = selectedPriority === item;
                        const cfg = getPriorityConfig(item);
                        return (
                          <TouchableOpacity
                            key={item}
                            onPress={() => setSelectedPriority(item)}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 20,
                              backgroundColor: active ? cfg.color : 'rgba(255,255,255,0.05)',
                              borderWidth: 1,
                              borderColor: active ? cfg.color : 'rgba(255,255,255,0.1)',
                            }}
                          >
                            <Text style={{ 
                              color: active ? '#000' : '#FFF', 
                              fontSize: 12, 
                              fontWeight: '600' 
                            }}>
                              {cfg.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* Calendar Section */}
                  <View style={{ marginBottom: 16 }}>
                    <TouchableOpacity
                      onPress={() => setShowCalendar(!showCalendar)}
                      style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        backgroundColor: '#1f1f2a', 
                        padding: 12, 
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="calendar-outline" size={20} color="#00D2FF" style={{ marginRight: 8 }} />
                        <Text style={{ color: '#FFFFFF' }}>
                          {selectedDue.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </Text>
                      </View>
                      <Ionicons name={showCalendar ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    {showCalendar && (
                      <View style={{ 
                        marginTop: 12, 
                        backgroundColor: '#1f1f2a', 
                        borderRadius: 12, 
                        padding: 8,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                      }}>
                        <Calendar
                          onDayPress={(day) => {
                            setSelectedDue(new Date(day.timestamp));
                            setShowCalendar(false);
                          }}
                          markedDates={getMarkedDates()}
                          theme={{
                            backgroundColor: '#1f1f2a',
                            calendarBackground: '#1f1f2a',
                            textSectionTitleColor: '#9CA3AF',
                            selectedDayBackgroundColor: '#00D2FF',
                            selectedDayTextColor: '#000000',
                            todayTextColor: '#00D2FF',
                            dayTextColor: '#FFFFFF',
                            textDisabledColor: '#4B5563',
                            dotColor: '#00D2FF',
                            selectedDotColor: '#000000',
                            arrowColor: '#00D2FF',
                            monthTextColor: '#FFFFFF',
                            indicatorColor: '#00D2FF',
                            textDayFontWeight: '400',
                            textMonthFontWeight: 'bold',
                            textDayHeaderFontWeight: '600',
                            textDayFontSize: 14,
                            textMonthFontSize: 16,
                            textDayHeaderFontSize: 13,
                          }}
                        />
                      </View>
                    )}
                  </View>

                  {/* Reminder Toggle */}
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    marginBottom: 16,
                    backgroundColor: '#1f1f2a',
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 15 }}>Set Reminder</Text>
                    <Switch
                      value={reminderEnabled}
                      onValueChange={setReminderEnabled}
                      trackColor={{ false: '#4B5563', true: '#00D2FF' }}
                      thumbColor={reminderEnabled ? '#FFFFFF' : '#9CA3AF'}
                    />
                  </View>

                  {reminderEnabled && (
                    <TouchableOpacity
                      onPress={() => setShowTimePicker(true)}
                      style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        backgroundColor: '#1f1f2a', 
                        padding: 12, 
                        borderRadius: 8, 
                        marginBottom: 16,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <Ionicons name="time-outline" size={20} color="#00D2FF" style={{ marginRight: 8 }} />
                      <Text style={{ color: '#FFFFFF' }}>
                        Remind at: {reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Recurring Toggle */}
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    marginBottom: 16,
                    backgroundColor: '#1f1f2a',
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 15 }}>Recurring Decision</Text>
                    <Switch
                      value={isRecurring}
                      onValueChange={setIsRecurring}
                      trackColor={{ false: '#4B5563', true: '#00D2FF' }}
                      thumbColor={isRecurring ? '#FFFFFF' : '#9CA3AF'}
                    />
                  </View>

                  {isRecurring && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {RECURRENCE_OPTIONS.filter(opt => opt !== 'none').map((item) => {
                          const active = recurrence === item;
                          return (
                            <TouchableOpacity
                              key={item}
                              onPress={() => setRecurrence(item)}
                              style={{
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 20,
                                backgroundColor: active ? '#00D2FF' : 'rgba(255,255,255,0.05)',
                                borderWidth: 1,
                                borderColor: active ? '#00D2FF' : 'rgba(255,255,255,0.1)',
                              }}
                            >
                              <Text style={{ 
                                color: active ? '#000' : '#FFF', 
                                fontSize: 12, 
                                fontWeight: '600', 
                                textTransform: 'capitalize' 
                              }}>
                                {item}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  )}

                  {showTimePicker && (
                    <DateTimePicker
                      value={reminderTime}
                      mode="time"
                      is24Hour={false}
                      display="default"
                      onChange={(event, selectedTime) => {
                        setShowTimePicker(false);
                        if (selectedTime) {
                          setReminderTime(selectedTime);
                        }
                      }}
                    />
                  )}

                  {isLoading && (
                    <View style={{ alignItems: 'center', marginVertical: 16 }}>
                      <ActivityIndicator size="small" color="#00D2FF" />
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                    <TouchableOpacity 
                      onPress={onClose}
                      style={{ paddingHorizontal: 20, paddingVertical: 12 }}
                    >
                      <Text style={{ color: '#9CA3AF', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={onSave}
                      disabled={!newText.trim() || isLoading}
                      style={{
                        backgroundColor: (!newText.trim() || isLoading) ? 'rgba(0,210,255,0.5)' : '#00D2FF',
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: '#000', fontSize: 15, fontWeight: 'bold' }}>
                        {editingId ? 'Update' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

export default AddDecisionModal;