// components/settings/SettingItem.js
import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  surface: '#0D0D12',
  surfaceSoft: '#151821',
  text: '#FFFFFF',
  textMuted: '#9CA3AF',
  primary: '#00D2FF',
  primarySoft: 'rgba(0,210,255,0.1)',
  danger: '#EF4444',
  white10: 'rgba(255,255,255,0.1)',
};

const SettingItem = ({ 
  icon, 
  title, 
  subtitle, 
  onPress,
  showToggle,
  toggleValue,
  onToggle,
  type = 'default', // 'default' or 'danger'
  showChevron = true,
}) => {
  const getIconColor = () => {
    if (type === 'danger') return COLORS.danger;
    return COLORS.primary;
  };

  const getIconBg = () => {
    if (type === 'danger') return 'rgba(239,68,68,0.1)';
    return COLORS.primarySoft;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={showToggle}
      activeOpacity={0.7}
      style={[
        styles.container,
        type === 'danger' && styles.dangerContainer
      ]}
    >
      <View style={styles.leftSection}>
        <View style={[styles.iconContainer, { backgroundColor: getIconBg() }]}>
          <Ionicons name={icon} size={20} color={getIconColor()} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, type === 'danger' && styles.dangerTitle]}>
            {title}
          </Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      {showToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: COLORS.white10, true: COLORS.primary }}
          thumbColor={toggleValue ? '#FFFFFF' : '#f4f3f4'}
          ios_backgroundColor={COLORS.white10}
        />
      ) : (
        showChevron && <Ionicons name="chevron-forward" size={18} color="#6B7280" />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.white10,
  },
  dangerContainer: {
    backgroundColor: 'rgba(239,68,68,0.05)',
    borderColor: 'rgba(239,68,68,0.2)',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  dangerTitle: {
    color: COLORS.danger,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});

export default SettingItem;