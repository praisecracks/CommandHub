// components/delegate/QuadrantCard.js
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const QuadrantCard = ({ 
  title, 
  count, 
  icon, 
  color, 
  isActive, 
  onPress 
}) => {
  // Get icon name based on quadrant
  const getIconName = () => {
    switch(icon) {
      case 'person': return 'person-outline';
      case 'swap-horizontal': return 'swap-horizontal-outline';
      case 'time': return 'time-outline';
      case 'warning': return 'warning-outline';
      default: return 'help-outline';
    }
  };

  // Get background color based on quadrant
  const getBgColor = () => {
    return `${color}20`; // 20 = 12% opacity
  };

  // Get border color based on active state
  const getBorderColor = () => {
    return isActive ? color : 'rgba(255,255,255,0.05)';
  };

  // Get background color based on active state
  const getBgCardColor = () => {
    return isActive ? '#0D1117' : 'rgba(13,17,23,0.4)';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        width: '48%',
        backgroundColor: getBgCardColor(),
        borderWidth: 1,
        borderColor: getBorderColor(),
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
      }}
    >
      {/* Top Row: Icon and Count */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
      }}>
        <View style={{
          backgroundColor: getBgColor(),
          padding: 8,
          borderRadius: 8,
        }}>
          <Ionicons name={getIconName()} size={18} color={color} />
        </View>
        <Text style={{
          color: '#FFFFFF',
          fontWeight: 'bold',
          fontSize: 18,
        }}>
          {count}
        </Text>
      </View>

      {/* Title */}
      <Text style={{
        color: '#9CA3AF',
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
      }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default QuadrantCard;