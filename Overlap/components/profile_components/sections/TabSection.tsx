// components/profile_components/sections/TabSection.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import TabBar from '../../TabBar';

interface TabSectionProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
}

const TabSection: React.FC<TabSectionProps> = ({
  activeTab,
  onTabPress,
}) => {
  return (
    <View style={styles.tabSection}>
      <TabBar 
        activeTab={activeTab} 
        onTabPress={onTabPress} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabSection: {
    marginBottom: 16,
  },
});

export default TabSection;