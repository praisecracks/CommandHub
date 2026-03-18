// components/common/DecisionCard.js
import React, { memo, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

const DecisionCard = memo(({ 
  item, 
  activeTimer, 
  onToggle, 
  onEdit, 
  onDelete, 
  onStartTimer, 
  onStopTimer,
  formatTime,
  formatDueDate,
  getPriorityConfig 
}) => {
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 150,
      friction: 3
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 3
    }).start();
  };

  const priority = getPriorityConfig(item.priority);
  
  const renderRightActions = () => (
    <View style={{ flexDirection: 'row' }}>
      <TouchableOpacity
        style={{ 
          backgroundColor: '#00D2FF', 
          justifyContent: 'center', 
          alignItems: 'center', 
          width: 70, 
          height: '100%' 
        }}
        onPress={() => activeTimer === item.id ? onStopTimer(item.id) : onStartTimer(item.id)}
      >
        <Ionicons name={activeTimer === item.id ? 'stop' : 'play'} size={24} color="#000" />
      </TouchableOpacity>
      <TouchableOpacity
        style={{ 
          backgroundColor: '#FFA500', 
          justifyContent: 'center', 
          alignItems: 'center', 
          width: 70, 
          height: '100%' 
        }}
        onPress={() => onEdit(item)}
      >
        <Ionicons name="pencil" size={24} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity
        style={{ 
          backgroundColor: '#EF4444', 
          justifyContent: 'center', 
          alignItems: 'center', 
          width: 70, 
          height: '100%' 
        }}
        onPress={() => onDelete(item.id)}
      >
        <Ionicons name="trash" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  // Alternative minimalist version
return (
  <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
    <View style={{ 
      backgroundColor: '#0d0d12',
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
      borderLeftWidth: 4,
      borderLeftColor: priority.color,
      opacity: item.done ? 0.6 : 1,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => onToggle(item.id)}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: item.done ? '#00D2FF' : '#4B5563',
            backgroundColor: item.done ? '#00D2FF' : 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}
        >
          {item.done && <Ionicons name="checkmark" size={16} color="#000" />}
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={{ 
            color: item.done ? '#6B7280' : '#FFF',
            fontSize: 16,
            fontWeight: '500',
            textDecorationLine: item.done ? 'line-through' : 'none',
            marginBottom: 4,
          }}>
            {item.task}
          </Text>
          
          <Text style={{ color: priority.color, fontSize: 12, fontWeight: '600' }}>
            {priority.label} • {formatDueDate(item.due)}
          </Text>
        </View>
      </View>
    </View>
  </Swipeable>
);
});

export default DecisionCard;