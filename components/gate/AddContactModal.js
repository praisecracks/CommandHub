// components/gate/AddContactModal.js
import React, { useEffect, useState } from 'react';
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
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ROLE_OPTIONS = ['Developer', 'Designer', 'Editor', 'HR', 'Team Lead', 'Others'];
const SYSTEM_OPTIONS = ['Unleashified', 'Dimpified', 'Remsana', 'GFA Foundation'];

const AddContactModal = ({ visible, onClose, onSave, initialData = null }) => {
  const [name, setName] = useState('');
  const [system, setSystem] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Developer');

  useEffect(() => {
    if (!visible) return;

    if (initialData) {
      setName(initialData.name || '');
      setSystem(initialData.system || '');
      setPhone(initialData.phone || '');
      setRole(initialData.role || 'Developer');
    } else {
      resetForm();
    }
  }, [visible, initialData]);

  const resetForm = () => {
    setName('');
    setSystem('');
    setPhone('');
    setRole('Developer');
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose?.();
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter the contact name.');
      return;
    }

    if (!system.trim()) {
      Alert.alert('Missing System', 'Please select a system.');
      return;
    }

    const contactData = {
      name: name.trim(),
      system: system.trim(),
      phone: phone.trim(),
      role: role,
    };

    onSave?.(contactData);
    resetForm();
    handleClose();
  };

  const getRoleClasses = (option, active) => {
    if (!active) {
      return 'bg-[#1B1C24] border border-white/10';
    }

    // Different colors for different roles
    switch (option) {
      case 'Developer':
        return 'bg-blue-500 border border-blue-500';
      case 'Designer':
        return 'bg-purple-500 border border-purple-500';
      case 'Editor':
        return 'bg-green-500 border border-green-500';
      case 'HR':
        return 'bg-pink-500 border border-pink-500';
      case 'Team Lead':
        return 'bg-amber-500 border border-amber-500';
      case 'Others':
        return 'bg-gray-500 border border-gray-500';
      default:
        return 'bg-cyan-400 border border-cyan-400';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 justify-end bg-black/70">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
            className="w-full"
          >
            <View className="max-h-[90%] rounded-t-[28px] bg-[#111B21] px-5 pb-6 pt-3">
              <View className="mb-5 h-1 w-11 self-center rounded-full bg-white/20" />

              <View className="mb-5 flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-[22px] font-extrabold text-white">
                    {initialData ? 'Edit Contact' : 'Add Contact'}
                  </Text>
                  <Text className="mt-1 text-[13px] text-[#8696A0]">
                    Save a contact for quick call or message access
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleClose}
                  activeOpacity={0.8}
                  className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5"
                >
                  <Ionicons name="close" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 12 }}
              >
                <View className="mb-5">
                  <Text className="mb-2 text-[12px] font-bold tracking-[0.6px] text-[#9CA3AF]">
                    NAME *
                  </Text>
                  <View className="flex-row items-center rounded-2xl border border-white/10 bg-[#1B1C24] px-4">
                    <Ionicons name="person-outline" size={18} color="#8696A0" />
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. Tunde Adebayo"
                      placeholderTextColor="#6B7280"
                      returnKeyType="next"
                      className="flex-1 px-3 py-4 text-[14px] text-white"
                    />
                  </View>
                </View>

                <View className="mb-5">
                  <Text className="mb-2 text-[12px] font-bold tracking-[0.6px] text-[#9CA3AF]">
                    SYSTEM *
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingRight: 8 }}
                  >
                    {SYSTEM_OPTIONS.map((option) => {
                      const active = system === option;

                      return (
                        <TouchableOpacity
                          key={option}
                          onPress={() => setSystem(option)}
                          activeOpacity={0.85}
                          className={`mr-3 rounded-full px-4 py-2.5 ${
                            active
                              ? 'border border-[#25D366] bg-[#25D366]'
                              : 'border border-white/10 bg-[#1B1C24]'
                          }`}
                        >
                          <Text
                            className={`text-[13px] font-bold ${
                              active ? 'text-black' : 'text-white'
                            }`}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View className="mb-5">
                  <Text className="mb-2 text-[12px] font-bold tracking-[0.6px] text-[#9CA3AF]">
                    PHONE
                  </Text>
                  <View className="flex-row items-center rounded-2xl border border-white/10 bg-[#1B1C24] px-4">
                    <Ionicons name="call-outline" size={18} color="#8696A0" />
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+234 123 456 7890"
                      placeholderTextColor="#6B7280"
                      keyboardType="phone-pad"
                      className="flex-1 px-3 py-4 text-[14px] text-white"
                    />
                  </View>
                </View>

                <View className="mb-6">
                  <Text className="mb-2 text-[12px] font-bold tracking-[0.6px] text-[#9CA3AF]">
                    ROLE
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingRight: 8 }}
                  >
                    {ROLE_OPTIONS.map((option) => {
                      const active = role === option;

                      return (
                        <TouchableOpacity
                          key={option}
                          onPress={() => setRole(option)}
                          activeOpacity={0.85}
                          className={`mr-3 rounded-full px-4 py-2.5 ${getRoleClasses(
                            option,
                            active
                          )}`}
                        >
                          <Text
                            className={`text-[13px] font-bold ${
                              active ? 'text-black' : 'text-white'
                            }`}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View className="mt-1 flex-row gap-3">
                  <TouchableOpacity
                    onPress={handleClose}
                    activeOpacity={0.85}
                    className="flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-4"
                  >
                    <Text className="text-[15px] font-bold text-[#9CA3AF]">
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSave}
                    activeOpacity={0.85}
                    className="flex-1 items-center justify-center rounded-2xl bg-[#25D366] py-4"
                  >
                    <Text className="text-[15px] font-extrabold text-black">
                      {initialData ? 'Save Contact' : 'Add Contact'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default AddContactModal;