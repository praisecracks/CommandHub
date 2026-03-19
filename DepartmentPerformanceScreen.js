// screens/DepartmentPerformanceScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from './firebaseConfig';
import { collection, doc, query, orderBy, onSnapshot } from 'firebase/firestore';
import CustomLoader from './components/common/CustomLoader';

const COLORS = {
  bg: '#050508',
  surface: '#0D0D12',
  surfaceSoft: '#151821',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textSoft: '#64748B',
  primary: '#00D2FF',
  primarySoft: 'rgba(0,210,255,0.14)',
  success: '#10B981',
  successSoft: 'rgba(16,185,129,0.14)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.14)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.14)',
  purple: '#A855F7',
  purpleSoft: 'rgba(168,85,247,0.14)',
  white10: 'rgba(255,255,255,0.1)',
};

const DEPARTMENTS = [
  { id: 'unleashified', label: ' Unleashified', color: '#00D2FF', icon: 'rocket-outline' },
  { id: 'dimplified', label: ' Dimplified', color: '#A855F7', icon: 'flash-outline' },
  { id: 'remsana', label: ' Remsana', color: '#10B981', icon: 'leaf-outline' },
  { id: 'gfa', label: ' GFA Foundation', color: '#F59E0B', icon: 'school-outline' },
];

const DepartmentCard = ({ department, tasks }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = totalTasks - completedTasks;
  const urgentTasks = tasks.filter(t => 
    t.status !== 'completed' && (t.priority === 'critical' || t.priority === 'high')
  ).length;

  const hasNoTasks = totalTasks === 0;

  return (
    <View style={[styles.card, hasNoTasks && styles.cardInactive]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${department.color}20` }]}>
          <Ionicons name={department.icon} size={24} color={hasNoTasks ? COLORS.textSoft : department.color} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, hasNoTasks && styles.textMuted]}>{department.label}</Text>
          <Text style={[styles.cardSubtitle, hasNoTasks && styles.textMuted]}>
            {hasNoTasks ? 'No tasks assigned yet' : `${completedTasks} of ${totalTasks} tasks completed`}
          </Text>
        </View>
      </View>

      {!hasNoTasks && (
        <>
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${(completedTasks / totalTasks) * 100}%`,
                    backgroundColor: department.color 
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round((completedTasks / totalTasks) * 100)}%
            </Text>
          </View>

          <View style={styles.badgeContainer}>
            {pendingTasks > 0 && (
              <View style={[styles.badge, { backgroundColor: COLORS.warningSoft }]}>
                <Text style={[styles.badgeText, { color: COLORS.warning }]}>
                  {pendingTasks} pending
                </Text>
              </View>
            )}
            {urgentTasks > 0 && (
              <View style={[styles.badge, { backgroundColor: COLORS.dangerSoft }]}>
                <Text style={[styles.badgeText, { color: COLORS.danger }]}>
                  {urgentTasks} urgent
                </Text>
              </View>
            )}
            {completedTasks === totalTasks && totalTasks > 0 && (
              <View style={[styles.badge, { backgroundColor: COLORS.successSoft }]}>
                <Text style={[styles.badgeText, { color: COLORS.success }]}>
                  ✓ All done
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {hasNoTasks && (
        <View style={[styles.badge, { backgroundColor: COLORS.white05, alignSelf: 'flex-start' }]}>
          <Text style={[styles.badgeText, { color: COLORS.textMuted }]}>
            No tasks
          </Text>
        </View>
      )}
    </View>
  );
};

export default function DepartmentPerformanceScreen() {
  const navigation = useNavigation();
  const [delegations, setDelegations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const user = auth?.currentUser;
    if (!user) return;

    // Firestore listener (using Firebase v9+ modular syntax)
    const delegationsRef = collection(db, 'users', user.uid, 'delegations');
    const q = query(delegationsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));
        setDelegations(data);
        setLastUpdated(new Date());
        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading delegations:', error);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const departmentTasks = useMemo(() => {
    const deptMap = {};
    DEPARTMENTS.forEach(dept => {
      deptMap[dept.id] = delegations.filter(task => 
        task.department === dept.id || task.departmentName?.includes(dept.label)
      );
    });
    return deptMap;
  }, [delegations]);

  const stats = useMemo(() => {
    const total = delegations.length;
    const completed = delegations.filter(t => t.status === 'completed').length;
    const pending = total - completed;
    const urgent = delegations.filter(t => 
      t.status !== 'completed' && (t.priority === 'critical' || t.priority === 'high')
    ).length;
    
    return { total, completed, pending, urgent };
  }, [delegations]);

  if (isLoading) {
    return (
      <CustomLoader 
        type="fullscreen" 
        message="Loading department data..." 
        subtext="Analyzing team performance"
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Departments</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: COLORS.success }]}>{stats.completed}</Text>
          <Text style={styles.summaryLabel}>Done</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: COLORS.warning }]}>{stats.pending}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: COLORS.danger }]}>{stats.urgent}</Text>
          <Text style={styles.summaryLabel}>Urgent</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* ALL Departments - Always Visible */}
        <View style={styles.departmentsContainer}>
          {DEPARTMENTS.map(dept => (
            <DepartmentCard
              key={dept.id}
              department={dept}
              tasks={departmentTasks[dept.id] || []}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  offlineBanner: {
    backgroundColor: '#F59E0B',
    padding: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  offlineSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    marginTop: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.white10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.white05,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.white10,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
  },
  departmentsContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.white10,
  },
  cardInactive: {
    opacity: 0.7,
    borderColor: COLORS.white05,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.white10,
    borderRadius: 3,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textMuted: {
    color: COLORS.textMuted,
  },
});
