import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SearchBar = ({ searchQuery, setSearchQuery }) => (
  <View style={styles.searchContainer}>
    <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
    <TextInput
      style={styles.searchInput}
      placeholder="Search..."
      placeholderTextColor="#666"
      value={searchQuery}
      onChangeText={setSearchQuery}
    />
  </View>
);

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22272E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#FFFFFF' },
});

export default SearchBar;
