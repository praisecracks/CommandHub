// components/common/CustomAlert.js
import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CustomAlert = ({ visible, type, title, message, onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancel' }) => {
  const getIcon = () => {
    switch(type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'alert-circle';
      case 'warning': return 'warning';
      case 'confirm': return 'help-circle';
      default: return 'information-circle';
    }
  };

  const getColor = () => {
    switch(type) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'confirm': return '#00D2FF';
      default: return '#6B7280';
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#1f1f2a', borderRadius: 24, padding: 24, width: '80%', maxWidth: 320, alignItems: 'center' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: getColor(), justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name={getIcon()} size={36} color="#000" />
          </View>
          
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
            {title}
          </Text>
          
          <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 24, textAlign: 'center' }}>
            {message}
          </Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {type === 'confirm' ? (
              <>
                <TouchableOpacity
                  onPress={onCancel}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{cancelText}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onConfirm}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: getColor() }}
                >
                  <Text style={{ color: '#000', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{confirmText}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={onConfirm}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: getColor() }}
              >
                <Text style={{ color: '#000', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{confirmText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CustomAlert;