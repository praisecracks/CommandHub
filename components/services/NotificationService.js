// components/services/NotificationService.js
import { Linking, Platform } from 'react-native';

// Cache for SMS module and availability
let cachedSMSModule = null;
let smsModuleFailed = false;
let smsAvailabilityResult = null;

class NotificationService {
  
  // Helper to dynamically import SMS module - THIS PREVENTS THE CRASH
  static async getSMSModule() {
    // SMS functionality is disabled - expo-sms is not installed
    // To enable SMS:
    // 1. Run: npx expo install expo-sms
    // 2. Rebuild the app (expo run:android or expo run:ios)
    // 3. Uncomment the dynamic import code below:
    /*
    if (smsModuleFailed) return null;
    if (cachedSMSModule) return cachedSMSModule;
    try {
      const smsModule = await import('expo-sms');
      cachedSMSModule = smsModule;
      return smsModule;
    } catch (error) {
      smsModuleFailed = true;
      return null;
    }
    */
    smsModuleFailed = true;
    return null;
  }

  // Check if SMS is available
  static async isSMSAvailable() {
    // Return cached result if we already know it
    if (smsAvailabilityResult !== null) return smsAvailabilityResult;
    if (smsModuleFailed) return false;

    try {
      const SMS = await this.getSMSModule();
      if (!SMS) {
        smsAvailabilityResult = false;
        return false;
      }
      
      // Some Expo versions might throw "Cannot find native module 'ExpoSMS'" 
      // here if the app wasn't rebuilt after installing the package.
      const isAvailable = await SMS.isAvailableAsync().catch(err => {
        if (err.message.includes('native module')) {
          smsModuleFailed = true;
          return false;
        }
        throw err;
      });
      
      smsAvailabilityResult = isAvailable;
      return isAvailable;
    } catch (error) {
      // Silently fail for availability check to avoid red screen/error logs
      smsAvailabilityResult = false;
      return false;
    }
  }

  // NEW: Format task message with description
  static formatTaskMessage(taskTitle, taskDescription, assignedByName) {
    let message = `📋 *NEW TASK ASSIGNED*\n\n`;
    message += `*Task:* ${taskTitle}\n`;
    
    if (taskDescription && taskDescription.trim() !== '') {
      message += `*Description:* ${taskDescription}\n`;
    }
    
    message += `*Assigned by:* ${assignedByName}\n\n`;
    message += `Please get back to me as fast as possible.`;
    
    return message;
  }

  // NEW: Format follow-up message with description
  static formatFollowUpMessage(taskTitle, taskDescription, assignedByName) {
    let message = `👋 *TASK FOLLOW-UP*\n\n`;
    message += `Just checking in on: *${taskTitle}*\n`;
    
    if (taskDescription && taskDescription.trim() !== '') {
      message += `*Description:* ${taskDescription}\n`;
    }
    
    message += `*Assigned by:* ${assignedByName}\n\n`;
    message += `Any updates on this? Let me know when it's completed.`;
    
    return message;
  }

  // Send SMS notification - UPDATED with taskDescription parameter
  static async sendSMS(phoneNumber, taskTitle, taskDescription, assignedByName) {
    try {
      const SMS = await this.getSMSModule();
      if (!SMS) {
        return { success: false, message: 'SMS is not available on this device', type: 'error' };
      }

      // Check if SMS is available
      const isAvailable = await this.isSMSAvailable();
      
      if (!isAvailable) {
        return { success: false, message: 'SMS functionality is not available on this device.', type: 'error' };
      }

      // Clean phone number (remove any non-numeric characters except +)
      const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
      
      // Use formatted message with description
      const message = this.formatTaskMessage(taskTitle, taskDescription, assignedByName);

      const { result } = await SMS.sendSMSAsync(
        [cleanNumber],
        message
      );

      if (result === 'sent') {
        return { success: true, message: 'SMS sent successfully!', type: 'success' };
      } else if (result === 'cancelled') {
        return { success: false, message: 'SMS was cancelled', type: 'info' };
      } else {
        return { success: false, message: 'SMS was not sent', type: 'error' };
      }
      
    } catch (error) {
      console.error('Error sending SMS:', error);
      return { success: false, message: 'Could not send SMS. Please try again or use WhatsApp instead.', type: 'error' };
    }
  }

  // Send WhatsApp message - UPDATED with taskDescription parameter
  static async sendWhatsApp(phoneNumber, taskTitle, taskDescription, assignedByName) {
    try {
      // Format number for WhatsApp
      const internationalNumber = this.formatPhoneNumberForWhatsApp(phoneNumber);
      
      // Use formatted message with description
      const message = this.formatTaskMessage(taskTitle, taskDescription, assignedByName);
      
      // METHOD 1: Using whatsapp://send (BEST - pre-fills contact AND message)
      const whatsappUrl = `whatsapp://send?phone=${internationalNumber}&text=${encodeURIComponent(message)}`;
      
      // Check if WhatsApp app is installed
      const appSupported = await Linking.canOpenURL(whatsappUrl);
      
      if (appSupported) {
        // Open WhatsApp app with contact pre-filled
        await Linking.openURL(whatsappUrl);
        return true;
      } else {
        // METHOD 2: Fallback to web URL (opens in browser or WhatsApp Web)
        const webUrl = `https://wa.me/${internationalNumber}?text=${encodeURIComponent(message)}`;
        const webSupported = await Linking.canOpenURL(webUrl);
        
        if (webSupported) {
          await Linking.openURL(webUrl);
          return true;
        }
        
        // If neither works, show error
        return { success: false, message: 'Please install WhatsApp to use this feature.', type: 'warning' };
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      return { success: false, message: 'Could not open WhatsApp', type: 'error' };
    }
  }

  // Send follow-up via SMS - UPDATED with taskDescription parameter
  static async sendFollowUpSMS(phoneNumber, taskTitle, taskDescription, assignedByName) {
    try {
      const SMS = await this.getSMSModule();
      if (!SMS) {
        return { success: false, message: 'SMS is not available on this device', type: 'error' };
      }

      const isAvailable = await this.isSMSAvailable();
      if (!isAvailable) {
        return { success: false, message: 'SMS is not available on this device.', type: 'error' };
      }

      const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
      
      // Use formatted follow-up message with description
      const message = this.formatFollowUpMessage(taskTitle, taskDescription, assignedByName);

      const { result } = await SMS.sendSMSAsync([cleanNumber], message);

      if (result === 'sent') {
        return { success: true, message: 'Follow-up SMS sent!', type: 'success' };
      } else if (result === 'cancelled') {
        return { success: false, message: 'Follow-up SMS was cancelled', type: 'info' };
      } else {
        return { success: false, message: 'Follow-up SMS was not sent', type: 'error' };
      }
    } catch (error) {
      console.error('Error sending follow-up SMS:', error);
      return { success: false, message: 'Could not send follow-up SMS', type: 'error' };
    }
  }

  // Send follow-up via WhatsApp - UPDATED with taskDescription parameter
  static async sendFollowUpWhatsApp(phoneNumber, taskTitle, taskDescription, assignedByName) {
    try {
      // Format number for WhatsApp
      const internationalNumber = this.formatPhoneNumberForWhatsApp(phoneNumber);
      
      // Use formatted follow-up message with description
      const message = this.formatFollowUpMessage(taskTitle, taskDescription, assignedByName);
      
      const whatsappUrl = `whatsapp://send?phone=${internationalNumber}&text=${encodeURIComponent(message)}`;
      const appSupported = await Linking.canOpenURL(whatsappUrl);
      
      if (appSupported) {
        await Linking.openURL(whatsappUrl);
        return true;
      } else {
        const webUrl = `https://wa.me/${internationalNumber}?text=${encodeURIComponent(message)}`;
        const webSupported = await Linking.canOpenURL(webUrl);
        if (webSupported) {
          await Linking.openURL(webUrl);
          return true;
        }
        // If neither works, show error
        return { success: false, message: 'Please install WhatsApp to use this feature.', type: 'warning' };
      }
    } catch (error) {
      console.error('Error sending follow-up WhatsApp:', error);
      return { success: false, message: 'Could not send follow-up WhatsApp', type: 'error' };
    }
  }

  // Main notification function
  static async notifyAssignee(taskData, assignedByName) {
    if (!taskData.assignedToPhone) {
      Alert.alert(
        'No Phone Number',
        'This contact has no phone number saved.'
      );
      return false;
    }

    // Check SMS availability first
    const smsAvailable = await this.isSMSAvailable();

    return new Promise((resolve) => {
      const buttons = [];

      // Add SMS button if available
      if (smsAvailable) {
        buttons.push({
          text: '📨 SMS',
          onPress: async () => {
            const sent = await this.sendSMS(
              taskData.assignedToPhone,
              taskData.title,
              taskData.description, // Added description
              assignedByName
            );
            resolve(sent);
          }
        });
      }

      // Always add WhatsApp button
      buttons.push({
        text: '📱 WhatsApp',
        onPress: async () => {
          const sent = await this.sendWhatsApp(
            taskData.assignedToPhone,
            taskData.title,
            taskData.description, // Added description
            assignedByName
          );
          resolve(sent);
        }
      });

      // Add Cancel button
      buttons.push({
        text: 'Cancel',
        style: 'cancel',
        onPress: () => resolve(false)
      });

      Alert.alert(
        'Notify Assignee',
        `How would you like to notify ${taskData.assignedToName}?${!smsAvailable ? '\n\n⚠️ SMS not available on this device' : ''}`,
        buttons,
        { cancelable: true }
      );
    });
  }

  // Helper function to format phone numbers for WhatsApp
  static formatPhoneNumberForWhatsApp(phoneNumber) {
    // Remove all non-numeric characters first
    let formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
    
    // Handle Nigerian numbers
    if (formattedNumber.startsWith('0')) {
      // Nigerian number starting with 0 (e.g., 07069991171)
      // Remove the leading 0 and add 234
      formattedNumber = '234' + formattedNumber.substring(1);
    } else if (formattedNumber.startsWith('234')) {
      // Already has country code without +
      formattedNumber = formattedNumber;
    } else {
      // Assume it's a Nigerian number without any prefix
      formattedNumber = '234' + formattedNumber;
    }
    
    // Add the + prefix
    return '+' + formattedNumber;
  }

  // Check both SMS and WhatsApp availability
  static async checkNotificationAvailability(phoneNumber) {
    const smsAvailable = await this.isSMSAvailable();
    
    let whatsAppAvailable = false;
    try {
      const internationalNumber = this.formatPhoneNumberForWhatsApp(phoneNumber);
      
      // Check both app and web availability
      const appUrl = `whatsapp://send?phone=${internationalNumber}`;
      const webUrl = `https://wa.me/${internationalNumber}`;
      
      const appSupported = await Linking.canOpenURL(appUrl);
      const webSupported = await Linking.canOpenURL(webUrl);
      
      whatsAppAvailable = appSupported || webSupported;
    } catch (error) {
      // Silently fail for WhatsApp check
    }

    return {
      sms: smsAvailable,
      whatsapp: whatsAppAvailable
    };
  }

  // Send deadline reminder notification
  static async sendDeadlineReminder(taskTitle, dueDate) {
    const formattedDate = new Date(dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    Alert.alert(
      '⏰ Deadline Approaching',
      `Task "${taskTitle}" is due on ${formattedDate}`,
      [{ text: 'OK' }]
    );
    
    return true;
  }

  // Send congratulations message on task completion
  static async sendCongratulations(taskTitle, assigneeName) {
    const messages = [
      `🎉 Great job completing "${taskTitle}"!`,
      `✨ Excellent work on "${taskTitle}"!`,
      `🚀 You crushed it! "${taskTitle}" is done!`,
      `⭐ Brilliant! "${taskTitle}" completed successfully!`,
      `🏆 Winner! "${taskTitle}" is finished!`
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    Alert.alert(
      '🎉 Congratulations!',
      randomMessage,
      [{ text: 'Thanks!' }]
    );
    
    return true;
  }
}

export default NotificationService;