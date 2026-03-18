// components/delegate/TaskCard.js
import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TaskCard = ({ 
  task, 
  quadrant,
  onPress,
  onEdit,
  onDelete,
  onComplete,
  onFollowUp,
  onEscalate,
  onAction,      // For "Take Action" in Escalate quadrant
  onReassign      // For "Reassign" in Escalate quadrant
}) => {
  
  // Get priority color
  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  // Get status badge style
  const getStatusBadge = () => {
    if (task.status === 'completed') {
      return { bg: '#10B98120', text: '#10B981', label: '✓ Completed' };
    }
    if (task.status === 'blocked') {
      return { bg: '#EF444420', text: '#EF4444', label: '⚠ Blocked' };
    }
    if (task.status === 'in-progress') {
      return { bg: '#F59E0B20', text: '#F59E0B', label: '⋯ In Progress' };
    }
    return { bg: '#6B728020', text: '#6B7280', label: '○ Pending' };
  };

  // Get days waiting text
  const getDaysWaiting = () => {
    if (!task.waitingSince) return null;
    
    const days = Math.floor((Date.now() - new Date(task.waitingSince).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  // Get assignee initials
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const status = getStatusBadge();
  const daysWaiting = getDaysWaiting();

  // Handle delete with immediate feedback
  const handleDelete = () => {
    onDelete?.(task); // Pass the whole task to the parent for the custom modal
  };

  // Handle complete with immediate feedback and notification
  const handleComplete = () => {
    // Immediate visual feedback - remove from list instantly
    onComplete?.(task, true); // Pass true to indicate this is from TaskCard
  };

  return (
    <TouchableOpacity
      onPress={() => onPress?.(task)}
      onLongPress={() => onEdit?.(task)}
      delayLongPress={500}
      activeOpacity={0.85}
      style={{
        backgroundColor: '#0D1117',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 16,
      }}
    >
      {/* Header with Edit and Delete buttons */}
      <View style={{ 
        position: 'absolute', 
        top: 12, 
        right: 12, 
        flexDirection: 'row', 
        gap: 12,
        zIndex: 1,
      }}>
        <TouchableOpacity onPress={() => onEdit?.(task)}>
          <Ionicons name="pencil-outline" size={16} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Header Row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 6 }}>
            {task.title}
          </Text>
          
          {/* Department Badge */}
          {task.departmentName && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <View style={{ 
                backgroundColor: 
                  task.department === 'unleashified' ? 'rgba(0,210,255,0.1)' :
                  task.department === 'dimplified' ? 'rgba(168,85,247,0.1)' :
                  task.department === 'remsana' ? 'rgba(16,185,129,0.1)' :
                  'rgba(245,158,11,0.1)',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: 
                  task.department === 'unleashified' ? 'rgba(0,210,255,0.2)' :
                  task.department === 'dimplified' ? 'rgba(168,85,247,0.2)' :
                  task.department === 'remsana' ? 'rgba(16,185,129,0.2)' :
                  'rgba(245,158,11,0.2)',
              }}>
                <Text style={{ 
                  color: 
                    task.department === 'unleashified' ? '#00D2FF' :
                    task.department === 'dimplified' ? '#A855F7' :
                    task.department === 'remsana' ? '#10B981' :
                    '#F59E0B',
                  fontSize: 10, 
                  fontWeight: '700' 
                }}>
                  {task.departmentName}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Priority Badge (if exists) */}
        {task.priority && (
          <View style={{ 
            backgroundColor: `${getPriorityColor(task.priority)}20`,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
          }}>
            <Text style={{ color: getPriorityColor(task.priority), fontSize: 10, fontWeight: '700' }}>
              {task.priority}
            </Text>
          </View>
        )}
      </View>

      {/* Assignee Info (for delegated tasks) */}
      {task.assignedToName && (
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          backgroundColor: 'rgba(255,255,255,0.03)',
          padding: 12,
          borderRadius: 16,
          marginBottom: 12,
        }}>
          <View style={{ 
            width: 32, 
            height: 32, 
            borderRadius: 16, 
            backgroundColor: '#A855F7',
            alignItems: 'center', 
            justifyContent: 'center',
            marginRight: 10,
          }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 12 }}>
              {getInitials(task.assignedToName)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '500' }}>
              {task.assignedToName}
            </Text>
            {task.assignedToPhone && (
              <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>
                {task.assignedToPhone}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Description (if exists) */}
      {task.description && (
        <Text style={{ 
          color: '#9CA3AF', 
          fontSize: 13, 
          lineHeight: 18, 
          marginBottom: 12,
          fontStyle: 'italic',
        }} numberOfLines={2}>
          "{task.description}"
        </Text>
      )}

      {/* Status & Meta Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        {/* Status Badge */}
        <View style={{ 
          backgroundColor: status.bg,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
        }}>
          <Text style={{ color: status.text, fontSize: 11, fontWeight: '600' }}>
            {status.label}
          </Text>
        </View>

        {/* Due Date or Waiting Time */}
        {task.dueDate && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="calendar-outline" size={12} color="#6B7280" />
            <Text style={{ color: '#6B7280', fontSize: 11, marginLeft: 4 }}>
              Due {new Date(task.dueDate).toLocaleDateString()}
            </Text>
          </View>
        )}

        {daysWaiting && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="time-outline" size={12} color="#F59E0B" />
            <Text style={{ color: '#F59E0B', fontSize: 11, marginLeft: 4 }}>
              {daysWaiting}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons - COMPLETE button for ALL quadrants + quadrant-specific action */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* COMPLETE Button - Shows for ALL quadrants - With immediate feedback */}
        <TouchableOpacity
          onPress={handleComplete}
          style={{ 
            flex: 1,
            backgroundColor: '#10B981',
            paddingVertical: 10,
            borderRadius: 14,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 4
          }}
        >
          <Ionicons name="checkmark" size={16} color="#000" />
          <Text style={{ color: '#000', fontWeight: '600', fontSize: 12 }}>Complete</Text>
        </TouchableOpacity>

        {/* Quadrant-specific secondary action */}
        {quadrant === 'Only You' && (
          <TouchableOpacity
            onPress={() => onAction?.(task)}
            style={{ 
              width: 44,
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="swap-horizontal" size={18} color="#A855F7" />
          </TouchableOpacity>
        )}

        {quadrant === 'Delegate' && (
          <TouchableOpacity
            onPress={() => onFollowUp?.(task)}
            style={{ 
              width: 44,
              backgroundColor: '#F59E0B',
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="time-outline" size={18} color="#000" />
          </TouchableOpacity>
        )}

        {quadrant === 'Waiting' && (
          <TouchableOpacity
            onPress={() => onFollowUp?.(task)}
            style={{ 
              width: 44,
              backgroundColor: '#F59E0B',
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="send-outline" size={18} color="#000" />
          </TouchableOpacity>
        )}

        {quadrant === 'Escalate' && (
          <TouchableOpacity
            onPress={() => onAction?.(task)}  // Take Action
            style={{ 
              width: 44,
              backgroundColor: '#EF4444',
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="flash-outline" size={18} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Reassign button for Escalate - second row if needed */}
      {quadrant === 'Escalate' && (
        <TouchableOpacity
          onPress={() => onReassign?.(task)}
          style={{ 
            marginTop: 8,
            backgroundColor: 'rgba(168,85,247,0.1)',
            paddingVertical: 8,
            borderRadius: 12,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'rgba(168,85,247,0.3)',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 4
          }}
        >
          <Ionicons name="swap-horizontal" size={14} color="#A855F7" />
          <Text style={{ color: '#A855F7', fontWeight: '600', fontSize: 11 }}>Reassign to another person</Text>
        </TouchableOpacity>
      )}

      {/* Comment/Note Indicator */}
      {task.comments?.length > 0 && (
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.05)',
        }}>
          <Ionicons name="chatbubble-outline" size={12} color="#6B7280" />
          <Text style={{ color: '#6B7280', fontSize: 11, marginLeft: 4 }}>
            {task.comments.length} {task.comments.length === 1 ? 'comment' : 'comments'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default TaskCard;