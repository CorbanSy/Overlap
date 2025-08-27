//components/home_components/HomeSearchHeader.tsx
import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HomeSearchHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  editable?: boolean;
}

export default function HomeSearchHeader({ 
  searchQuery, 
  onSearchChange,
  onClearSearch,
  placeholder = "Search places...",
  autoFocus = false,
  editable = true
}: HomeSearchHeaderProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = useCallback(() => {
    onSearchChange('');
    onClearSearch?.();
    Keyboard.dismiss();
  }, [onSearchChange, onClearSearch]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <View style={styles.header}>
      <View style={[
        styles.searchContainer,
        isFocused && styles.searchContainerFocused,
        !editable && styles.searchContainerDisabled
      ]}>
        <Ionicons 
          name="search" 
          size={20} 
          color={isFocused ? "#0D1117" : "#666"} 
          style={styles.searchIcon} 
        />
        
        <TextInput
          style={[
            styles.searchInput,
            isFocused && styles.searchInputFocused,
            !editable && styles.searchInputDisabled
          ]}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={onSearchChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          editable={editable}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never" // We'll handle this manually
        />
        
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={handleClear}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name="close-circle" 
              size={18} 
              color="#666" 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0D1117',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 2,
    minHeight: 44,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchContainerFocused: {
    borderColor: '#F5A623',
    shadowColor: '#F5A623',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  searchContainerDisabled: {
    backgroundColor: '#F5F5F5',
    opacity: 0.7,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#0D1117',
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  searchInputFocused: {
    // Additional focused styles if needed
  },
  searchInputDisabled: {
    color: '#999',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
});