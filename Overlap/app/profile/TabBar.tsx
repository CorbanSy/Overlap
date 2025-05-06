import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export const options = {
  headerShown: false,
};

const TabBar = ({ activeTab, onTabPress }) => {
  const tabs = ['Liked Activities', 'Collections']; // ✅ Removed 'Friends'

  return (
    <View style={styles.tabContainer}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tabButton, activeTab === tab && styles.activeTab]}
          onPress={() => onTabPress(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: { flexDirection: 'row', justifyContent: 'space-evenly', backgroundColor: '#1B1F24' },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { backgroundColor: '#F5A623' },
  tabText: { fontSize: 16, color: '#DDDDDD' },
  activeTabText: { color: '#0D1117', fontWeight: 'bold' },
});

export default TabBar;
