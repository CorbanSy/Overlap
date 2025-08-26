// components/profile_components/sections/SearchSection.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import SearchBar from '../../SearchBar';

interface SearchSectionProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  resultCount?: number;
  activeTab?: string;
}

const SearchSection: React.FC<SearchSectionProps> = ({
  searchQuery,
  setSearchQuery,
  resultCount = 0,
  activeTab = 'activities',
}) => {
  // Dynamic placeholder based on active tab
  const getPlaceholder = () => {
    if (activeTab === 'Collections') {
      return 'Search collections...';
    }
    return 'Search activities...';
  };

  return (
    <View style={styles.searchSection}>
      <SearchBar 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery}
        placeholder={getPlaceholder()}
        showResultCount={true}
        resultCount={resultCount}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  searchSection: {
    marginBottom: 8, // Reduced since SearchBar already has margin
  },
});

export default SearchSection;