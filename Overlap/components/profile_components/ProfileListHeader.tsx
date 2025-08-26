// components/profile_components/ProfileListHeader.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import CollectionHeader from './headers/CollectionHeader';
import TabSection from './sections/TabSection';
import SearchSection from './sections/SearchSection';
import AddCollectionSection from './sections/AddCollectionSection';
import { SharedCollection } from './profileTypes';

interface ProfileListHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedCollection: SharedCollection | null;
  onClearSelectedCollection: () => void;
  setIsModalVisible: (visible: boolean) => void;
  toggleSettingsMenu: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  resultCount: number; // Added this missing prop
}

const ProfileListHeader: React.FC<ProfileListHeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedCollection,
  onClearSelectedCollection,
  setIsModalVisible,
  toggleSettingsMenu,
  searchQuery,
  setSearchQuery,
  resultCount, // Added this prop
}) => {
  return (
    <View style={styles.headerContainer}>
      {/* Tab selector (Liked Activities / Collections) */}
      <TabSection 
        activeTab={activeTab} 
        onTabPress={setActiveTab} 
      />
      
      {/* Search bar */}
      <SearchSection 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        resultCount={resultCount}
        activeTab={activeTab} // Pass activeTab for dynamic placeholder
      />
      
      {/* Add Collection button - only show when on Collections tab and no collection selected */}
      {activeTab === 'Collections' && !selectedCollection && (
        <AddCollectionSection onPress={() => setIsModalVisible(true)} />
      )}
      
      {/* Collection header with back button - only show when a collection is selected */}
      {selectedCollection && (
        <CollectionHeader 
          selectedCollection={selectedCollection}
          onBackPress={onClearSelectedCollection}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingBottom: 16,
  },
});

export default ProfileListHeader;