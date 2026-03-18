// components/common/SearchBar.js
import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SearchBar = ({ value, onChangeText, placeholder = "Search team members..." }) => {
  return (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: '#12121a', 
      borderRadius: 16, 
      paddingHorizontal: 16, 
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      marginBottom: 20
    }}>
      <Ionicons name="search" size={18} color="#6B7280" />
      <TextInput
        style={{ flex: 1, color: '#FFFFFF', fontSize: 15, marginLeft: 10 }}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        value={value}
        onChangeText={onChangeText}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={18} color="#6B7280" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export default SearchBar;