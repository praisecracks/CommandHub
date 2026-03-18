// components/hub/ActivityDashboard.js
import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const COLORS = {
  bg: '#07080D',
  surface: '#11131A',
  surfaceSoft: '#151821',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textSoft: '#64748B',
  primary: '#22C7FF',
  primarySoft: 'rgba(34,199,255,0.14)',
  purple: '#8B5CF6',
  purpleSoft: 'rgba(139,92,246,0.14)',
  success: '#10B981',
  successSoft: 'rgba(16,185,129,0.14)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.14)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.14)',
  white10: 'rgba(255,255,255,0.1)',
  white05: 'rgba(255,255,255,0.05)',
};

// Department definitions - matches your DepartmentPerformanceScreen
const DEPARTMENTS = [
  { id: 'unleashified', label: ' Unleashified', color: '#00D2FF', icon: 'rocket-outline' },
  { id: 'dimplified', label: ' Dimplified', color: '#A855F7', icon: 'flash-outline' },
  { id: 'remsana', label: ' Remsana', color: '#10B981', icon: 'leaf-outline' },
  { id: 'gfa', label: ' GFA Foundation', color: '#F59E0B', icon: 'school-outline' },
];

const ActivityBar = memo(({ department, tasks }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const hasNoTasks = totalTasks === 0;
  const filledBars = Math.round(percentage / 10);

  return (
    <View style={styles.barRow}>
      <View style={styles.barLeft}>
        <View style={[styles.barIcon, { backgroundColor: `${department.color}20` }]}>
          <Ionicons name={department.icon} size={14} color={hasNoTasks ? COLORS.textSoft : department.color} />
        </View>
        <View>
          <Text style={[styles.barLabel, hasNoTasks && styles.textMuted]}>
            {department.label}
          </Text>
          {!hasNoTasks && (
            <Text style={styles.barSubtext}>
              {completedTasks}/{totalTasks} tasks
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.barContainer}>
        <View style={styles.barTrack}>
          {[...Array(10)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.barSegment,
                i < filledBars && { backgroundColor: department.color },
                i >= filledBars && { backgroundColor: COLORS.white10 }
              ]}
            />
          ))}
        </View>
        {!hasNoTasks && (
          <Text style={[styles.barPercentage, { color: department.color }]}>
            {percentage}%
          </Text>
        )}
      </View>
    </View>
  );
});

const ActivityDashboard = memo(({ 
  delegations = [] // We only need delegations since departments come from tasks
}) => {
  const navigation = useNavigation();

  // Group tasks by department
  const departmentTasks = useMemo(() => {
    const deptMap = {};
    
    DEPARTMENTS.forEach(dept => {
      deptMap[dept.id] = delegations.filter(task => 
        task.department === dept.id || 
        task.departmentName?.includes(dept.label) ||
        task.assignedToSystem?.toLowerCase().includes(dept.id)
      );
    });

    return deptMap;
  }, [delegations]);

  // Calculate total active tasks across all departments
  const activeCount = useMemo(() => {
    return delegations.filter(t => t.status !== 'completed').length;
  }, [delegations]);

  const handlePress = () => {
    // Navigate to DepartmentPerformanceScreen
    navigation.navigate('DepartmentPerformance');
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title}>TODAY'S ACTIVITY</Text>
        <View style={styles.headerLine} />
      </View>
      
      <View style={styles.activitiesContainer}>
        {DEPARTMENTS.map(dept => (
          <ActivityBar
            key={dept.id}
            department={dept}
            tasks={departmentTasks[dept.id] || []}
          />
        ))}
      </View>
      
      {activeCount > 0 && (
        <View style={styles.activeRow}>
          <View style={styles.activeDot} />
          <Text style={styles.activeText}>
            <Text style={styles.activeCount}>{activeCount}</Text> active task{activeCount !== 1 ? 's' : ''} across all departments
          </Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} style={styles.chevron} />
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.white05,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  headerLine: {
    height: 1,
    backgroundColor: COLORS.white10,
    width: '100%',
  },
  activitiesContainer: {
    gap: 12,
    marginBottom: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 140,
  },
  barIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  barLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  barSubtext: {
    color: COLORS.textMuted,
    fontSize: 9,
    marginTop: 2,
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 6,
  },
  barTrack: {
    flex: 1,
    flexDirection: 'row',
    height: 4,
    gap: 2,
  },
  barSegment: {
    flex: 1,
    height: '100%',
    borderRadius: 1,
  },
  barPercentage: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.white10,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  activeText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '500',
    flex: 1,
  },
  activeCount: {
    color: COLORS.success,
    fontWeight: '800',
  },
  chevron: {
    marginLeft: 4,
  },
  textMuted: {
    color: COLORS.textMuted,
  },
});

export default ActivityDashboard;