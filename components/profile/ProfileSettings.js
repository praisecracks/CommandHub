import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileSettings({
  activeTab,
  onTabChange,
  recentActivity,
  onViewAllActivity,
  onNavigateToDecision,
  onNavigateToDelegate,
  onEditProfile,
  getActivityIcon,
  getActivityColor,
  formatTimestamp
}) {
  const renderActivityItem = (activity, index) => {
    const isLast = index === recentActivity.length - 1;
    return (
      <View key={activity.id || index} style={{ position: 'relative', paddingLeft: 20, marginBottom: isLast ? 0 : 24 }}>
        {/* Timeline Line */}
        {!isLast && (
          <View style={{ 
            position: 'absolute', left: 9, top: 30, bottom: -30, width: 2, 
            backgroundColor: 'rgba(255,255,255,0.05)' 
          }} />
        )}
        
        {/* Timeline Dot */}
        <View style={{ 
          position: 'absolute', left: 0, top: 0, width: 20, height: 20, borderRadius: 10,
          backgroundColor: '#050508', borderWidth: 2, borderColor: getActivityColor(activity),
          justifyContent: 'center', alignItems: 'center', zIndex: 1
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: getActivityColor(activity) }} />
        </View>

        <TouchableOpacity 
          style={styles.activityCard}
          onPress={() => activity.type === 'decision' ? onNavigateToDecision() : onNavigateToDelegate()}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Text style={[styles.activityType, { color: getActivityColor(activity) }]}>
                {activity.action.toUpperCase()}
              </Text>
              <Text style={{ color: '#6B7280', fontSize: 10, marginHorizontal: 6 }}>•</Text>
              <Text style={styles.activityTime}>{formatTimestamp(activity.timestamp)}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tabs - Changed from settings to about */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          onPress={() => onTabChange('activity')}
          style={[styles.tab, activeTab === 'activity' && styles.activeTab]}
        >
          <Ionicons 
            name="time-outline" 
            size={18} 
            color={activeTab === 'activity' ? '#00D2FF' : '#9CA3AF'} 
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>Activity</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => onTabChange('about')}
          style={[styles.tab, activeTab === 'about' && styles.activeTab]}
        >
          <Ionicons 
            name="information-circle-outline" 
            size={18} 
            color={activeTab === 'about' ? '#00D2FF' : '#9CA3AF'} 
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>About</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'activity' ? (
        <View style={styles.contentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {recentActivity.length > 0 && (
              <TouchableOpacity onPress={onViewAllActivity}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => renderActivityItem(activity, index))
          ) : (
            <View style={styles.emptyActivity}>
              <Ionicons name="document-text-outline" size={48} color="#4B5563" />
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptySubtitle}>Complete tasks to see them here</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.contentSection}>
          {/* About Section */}
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <View style={styles.aboutGroup}>
            <View style={styles.aboutItem}>
              <View style={[styles.aboutIcon, { backgroundColor: 'rgba(0,210,255,0.1)' }]}>
                <Ionicons name="person-outline" size={24} color="#00D2FF" />
              </View>
              <View style={styles.aboutInfo}>
                <Text style={styles.aboutLabel}>Account Type</Text>
                <Text style={styles.aboutValue}>Standard User</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.aboutItem} onPress={onEditProfile}>
              <View style={[styles.aboutIcon, { backgroundColor: 'rgba(168,85,247,0.1)' }]}>
                <Ionicons name="create-outline" size={24} color="#A855F7" />
              </View>
              <View style={styles.aboutInfo}>
                <Text style={styles.aboutLabel}>Edit Profile</Text>
                <Text style={styles.aboutValue}>Update your name and bio</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#4B5563" />
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <Text style={styles.sectionLabel}>APP INFO</Text>
          <View style={styles.aboutGroup}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build</Text>
              <Text style={styles.infoValue}>2025.03.17</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Environment</Text>
              <Text style={styles.infoValue}>Production</Text>
            </View>
          </View>

          {/* Quick Stats */}
          <Text style={styles.sectionLabel}>QUICK STATS</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="document-text" size={24} color="#00D2FF" />
              <Text style={styles.statNumber}>{recentActivity.length}</Text>
              <Text style={styles.statLabel}>Activities</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="time" size={24} color="#10B981" />
              <Text style={styles.statNumber}>24/7</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="shield-checkmark" size={24} color="#A855F7" />
              <Text style={styles.statNumber}>Secure</Text>
              <Text style={styles.statLabel}>Account</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: 'rgba(0,210,255,0.1)',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#00D2FF',
  },
  contentSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAllText: {
    color: '#00D2FF',
    fontSize: 14,
    fontWeight: '600',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  activityTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  activityType: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  activityTime: {
    color: '#6B7280',
    fontSize: 11,
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtitle: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  aboutGroup: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  aboutIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  aboutInfo: {
    flex: 1,
  },
  aboutLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 2,
  },
  aboutValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  infoLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 2,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
  },
});