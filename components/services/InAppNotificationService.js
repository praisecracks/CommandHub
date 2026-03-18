// components/services/InAppNotificationService.js
import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

class InAppNotificationService {
  
  // Send notification to specific user
  static async sendNotification(userId, notification) {
    try {
      const notificationsRef = collection(db, 'users', userId, 'notifications');
      
      await addDoc(notificationsRef, {
        ...notification,
        read: false,
        createdAt: serverTimestamp(),
      });
      
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }
  
  // Get unread count for current user
  static async getUnreadCount() {
    const user = auth?.currentUser;
    if (!user) return 0;
    
    try {
      const notificationsRef = collection(db, 'users', user.uid, 'notifications');
      const q = query(notificationsRef, where('read', '==', false));
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
  
  // Task assigned notification
  static async taskAssigned(taskTitle, taskDescription, assignedByName, assigneeId, taskId) {
    return this.sendNotification(assigneeId, {
      type: 'task_assigned',
      title: '📋 New Task Assigned',
      body: `${assignedByName} assigned you: "${taskTitle}"${taskDescription ? ` - ${taskDescription}` : ''}`,
      data: { taskTitle, taskDescription, assignedByName, taskId }
    });
  }
  
  // Task reassigned notification
  static async taskReassigned(taskTitle, taskDescription, reassignedByName, newAssigneeId, taskId) {
    return this.sendNotification(newAssigneeId, {
      type: 'task_assigned',
      title: '🔄 Task Reassigned',
      body: `${reassignedByName} reassigned: "${taskTitle}" to you${taskDescription ? ` - ${taskDescription}` : ''}`,
      data: { taskTitle, taskDescription, reassignedByName, taskId }
    });
  }
  
  // Deadline approaching notification
  static async deadlineApproaching(taskTitle, taskDescription, dueDate, userId, taskId) {
    const formattedDate = new Date(dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    return this.sendNotification(userId, {
      type: 'deadline_approaching',
      title: '⏰ Deadline Approaching',
      body: `"${taskTitle}" is due on ${formattedDate}${taskDescription ? ` - ${taskDescription}` : ''}`,
      data: { taskTitle, taskDescription, dueDate, taskId }
    });
  }
  
  // Task completed notification (for the person who assigned it)
  static async taskCompleted(taskTitle, taskDescription, completedBy, assignerId, taskId) {
    return this.sendNotification(assignerId, {
      type: 'task_completed',
      title: '✅ Task Completed',
      body: `${completedBy} completed: "${taskTitle}"${taskDescription ? ` - ${taskDescription}` : ''}`,
      data: { taskTitle, taskDescription, completedBy, taskId }
    });
  }
  
  // Follow-up reminder notification
  static async followUpReminder(taskTitle, taskDescription, delegatedTo, userId, taskId) {
    return this.sendNotification(userId, {
      type: 'follow_up',
      title: '👋 Follow-up Reminder',
      body: `Check status of task "${taskTitle}" assigned to ${delegatedTo}${taskDescription ? ` - ${taskDescription}` : ''}`,
      data: { taskTitle, taskDescription, delegatedTo, taskId }
    });
  }
  
  // Task escalated notification
  static async taskEscalated(taskTitle, taskDescription, escalatedBy, userId, taskId) {
    return this.sendNotification(userId, {
      type: 'escalated',
      title: '⚠️ Task Escalated',
      body: `${escalatedBy} escalated: "${taskTitle}"${taskDescription ? ` - ${taskDescription}` : ''}`,
      data: { taskTitle, taskDescription, escalatedBy, taskId }
    });
  }
  
  // New comment on task notification
  static async newComment(taskTitle, commenterName, commentText, userId, taskId) {
    return this.sendNotification(userId, {
      type: 'comment',
      title: '💬 New Comment',
      body: `${commenterName} commented on "${taskTitle}": "${commentText}"`,
      data: { taskTitle, commenterName, commentText, taskId }
    });
  }

  // 🔔 NEW: Decision reminder notification
  static async decisionReminder(decisionTitle, decisionDescription, dueDate, userId, decisionId) {
    const formattedDate = new Date(dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    const timeUntilDue = this.getTimeUntilDue(dueDate);
    
    return this.sendNotification(userId, {
      type: 'decision_reminder',
      title: `📊 Decision ${timeUntilDue}`,
      body: `"${decisionTitle}" is due ${formattedDate}${decisionDescription ? ` - ${decisionDescription}` : ''}`,
      data: { decisionTitle, decisionDescription, dueDate, decisionId }
    });
  }

  // 🔔 NEW: Decision overdue notification
  static async decisionOverdue(decisionTitle, decisionDescription, dueDate, userId, decisionId) {
    const formattedDate = new Date(dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    return this.sendNotification(userId, {
      type: 'decision_overdue',
      title: '⚠️ Decision Overdue',
      body: `"${decisionTitle}" was due on ${formattedDate}${decisionDescription ? ` - ${decisionDescription}` : ''}`,
      data: { decisionTitle, decisionDescription, dueDate, decisionId }
    });
  }

  // 🔔 NEW: Decision completed notification
  static async decisionCompleted(decisionTitle, decisionDescription, userId, decisionId) {
    return this.sendNotification(userId, {
      type: 'decision_completed',
      title: '✅ Decision Completed',
      body: `You completed: "${decisionTitle}"${decisionDescription ? ` - ${decisionDescription}` : ''}`,
      data: { decisionTitle, decisionDescription, decisionId }
    });
  }

  // Helper to determine time until due
  static getTimeUntilDue(dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due Today';
    if (diffDays === 1) return 'Due Tomorrow';
    if (diffDays <= 3) return `Due in ${diffDays} days`;
    return 'Reminder';
  }
  
  // Mark notification as read
  static async markAsRead(notificationId) {
    const user = auth?.currentUser;
    if (!user) return false;
    
    try {
      const notificationRef = doc(db, 'users', user.uid, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }
  
  // Mark all notifications as read
  static async markAllAsRead() {
    const user = auth?.currentUser;
    if (!user) return false;
    
    try {
      const notificationsRef = collection(db, 'users', user.uid, 'notifications');
      const q = query(notificationsRef, where('read', '==', false));
      const snapshot = await getDocs(q);
      
      const batch = [];
      snapshot.docs.forEach((doc) => {
        batch.push(
          updateDoc(doc.ref, {
            read: true,
            readAt: serverTimestamp(),
          })
        );
      });
      
      await Promise.all(batch);
      return true;
    } catch (error) {
      console.error('Error marking all as read:', error);
      return false;
    }
  }
}

export default InAppNotificationService;