// components/delegate/MobileContactPicker.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import CustomLoader from '../common/CustomLoader';

export default function MobileContactPicker({ visible, onClose, onSelect, title = 'Select Contact' }) {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadContacts();
    }
  }, [visible]);

  const loadContacts = async () => {
    setIsLoading(true);
    const user = auth?.currentUser;
    if (!user) return;

    try {
      const contactsRef = collection(db, 'users', user.uid, 'contacts');
      const snapshot = await getDocs(contactsRef);
      const contactsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          phone: data.phone || '',
          system: data.system || '',
          role: data.role || '',
          color: data.color || '#A855F7',
        };
      });
      setContacts(contactsData);
      setFilteredContacts(contactsData);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = contacts.filter(c => 
        c.name?.toLowerCase().includes(query) ||
        c.phone?.includes(query)
      );
      setFilteredContacts(filtered);
    }
  }, [searchQuery, contacts]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <TouchableOpacity 
          style={{ flex: 1 }} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <View style={{ 
          backgroundColor: '#111B21',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: 20,
          maxHeight: '80%',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' }}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: '#1B1C24', 
            borderRadius: 12, 
            paddingHorizontal: 12, 
            paddingVertical: 10, 
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          }}>
            <Ionicons name="search" size={18} color="#6B7280" />
            <TextInput
              style={{ flex: 1, color: '#FFFFFF', marginLeft: 10, fontSize: 14 }}
              placeholder="Search contacts..."
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Contacts List */}
          {isLoading ? (
            <CustomLoader type="inline" size="medium" message="Scanning contacts..." />
          ) : (
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <Ionicons name="people-outline" size={40} color="#4B5563" />
                  <Text style={{ color: '#9CA3AF', marginTop: 12 }}>
                    {searchQuery ? 'No matching contacts' : 'No contacts yet'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    padding: 12, 
                    borderRadius: 12,
                    marginBottom: 8,
                    backgroundColor: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <View style={{ 
                    width: 44, 
                    height: 44, 
                    borderRadius: 12, 
                    backgroundColor: item.color || '#A855F7',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginRight: 12,
                  }}>
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>
                      {getInitials(item.name)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
                      {item.name}
                    </Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                      {item.system || 'Contact'} • {item.phone || 'No phone'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}