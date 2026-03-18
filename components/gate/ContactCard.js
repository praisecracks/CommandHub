// components/gate/ContactCard.js
import React, { useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

const ContactCard = ({ contact, onDismiss }) => {
  const swipeableRef = useRef(null);

  const getRoleColor = (role) => {
    switch (role) {
      case 'Developer':
        return '#3B82F6'; // Blue
      case 'Designer':
        return '#A855F7'; // Purple
      case 'Editor':
        return '#10B981'; // Green
      case 'HR':
        return '#EC4899'; // Pink
      case 'Team Lead':
        return '#F59E0B'; // Amber
      case 'Others':
        return '#6B7280'; // Gray
      default:
        return '#8696A0';
    }
  };

  const getInitials = (name = '') => {
    return name
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const sanitizePhone = (phone) => {
    return phone ? phone.replace(/[^0-9+]/g, '') : '';
  };

  const parseDate = (value) => {
    if (!value) return new Date();

    if (typeof value?.toDate === 'function') {
      return value.toDate();
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'number') {
      return new Date(value);
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return new Date();
  };

  const formatRelativeTime = (dateValue) => {
    const createdDate = parseDate(dateValue);
    const now = new Date();
    const diffMs = now.getTime() - createdDate.getTime();

    if (diffMs <= 0 || diffMs < 60000) {
      return 'Just now';
    }

    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) {
      return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    }

    const hours = Math.floor(diffMs / 3600000);
    if (hours < 24) {
      return `${hours} hr${hours > 1 ? 's' : ''} ago`;
    }

    const days = Math.floor(diffMs / 86400000);
    if (days < 7) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 5) {
      return `${weeks} wk${weeks > 1 ? 's' : ''} ago`;
    }

    return createdDate.toLocaleDateString();
  };

  const timeLabel = useMemo(() => {
    return formatRelativeTime(contact?.createdAt || contact?.updatedAt || contact?.lastSeenAt);
  }, [contact]);

  const handleCall = () => {
    if (!contact?.phone) {
      Alert.alert('No Number', 'This contact has no phone number');
      return;
    }

    const phone = sanitizePhone(contact.phone);
    Linking.openURL(`tel:${phone}`);
  };

  const handleMessage = () => {
    if (!contact?.phone) {
      Alert.alert('No Number', 'This contact has no phone number');
      return;
    }

    const phone = sanitizePhone(contact.phone);
    Linking.openURL(`sms:${phone}`);
  };

  const confirmDelete = () => {
    swipeableRef.current?.close();

    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact?.name || 'this contact'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDismiss?.(contact?.id),
        },
      ]
    );
  };

  const renderRightActions = () => {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={confirmDelete}
        className="mb-3 ml-2 w-[88px] items-center justify-center rounded-[18px] bg-red-500"
      >
        <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
        <Text className="mt-1 text-[13px] font-bold text-white">Delete</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      rightThreshold={40}
    >
      <View className="mb-3 rounded-[18px] border border-white/5 bg-[#111B21] px-3.5 py-3.5">
        <View className="flex-row items-center">
          {/* Avatar */}
          <View className="relative">
            <View 
              className="h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: getRoleColor(contact?.role) + '20' }}
            >
              <Text className="text-[18px] font-bold text-[#E9EDEF]">
                {getInitials(contact?.name)}
              </Text>
            </View>

            {/* Role indicator dot */}
            <View
              style={{ backgroundColor: getRoleColor(contact?.role) }}
              className="absolute bottom-[1px] right-[1px] h-3.5 w-3.5 rounded-full border-2 border-[#111B21]"
            />
          </View>

          {/* Main Content */}
          <View className="ml-3 flex-1 justify-center">
            <View className="flex-row justify-between items-start">
              <Text
                numberOfLines={1}
                className="mr-2 flex-1 text-[16px] font-bold text-[#E9EDEF]"
              >
                {contact?.name}
              </Text>

              <Text className="text-[12px] font-medium text-[#8696A0]">
                {timeLabel}
              </Text>
            </View>

            <View className="flex-row items-center mt-1">
              <Text 
                className="text-[13px] font-medium mr-2"
                style={{ color: getRoleColor(contact?.role) }}
              >
                {contact?.role || 'Team Member'}
              </Text>
              <Text className="text-[13px] text-[#8696A0]">•</Text>
              <Text numberOfLines={1} className="ml-2 text-[13px] text-[#8696A0] flex-1">
                {contact?.system || 'No system'}
              </Text>
            </View>

            <Text
              numberOfLines={1}
              className="mt-1 text-[13px] font-medium text-[#25D366]"
            >
              {contact?.phone || 'No phone number'}
            </Text>
          </View>
        </View>

        {/* Action Row */}
        <View className="mt-3.5 flex-row border-t border-white/5 pt-3">
          <TouchableOpacity
            onPress={handleCall}
            activeOpacity={0.8}
            className="mr-2 h-11 flex-1 flex-row items-center justify-center rounded-xl bg-[#25D366]"
          >
            <Ionicons name="call" size={18} color="#FFFFFF" />
            <Text className="ml-2 text-[14px] font-bold text-white">Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleMessage}
            activeOpacity={0.8}
            className="ml-2 h-11 flex-1 flex-row items-center justify-center rounded-xl border border-white/10 bg-[#1F2C34]"
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#E9EDEF" />
            <Text className="ml-2 text-[14px] font-bold text-[#E9EDEF]">
              Message
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Swipeable>
  );
};

export default ContactCard;