// components/TabBar.tsx - FIXED VERSION
import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Professional color palette matching home.tsx
const Colors = {
  primary: '#F5A623',        // Orange from home.tsx
  background: '#0D1117',     // Dark background from home.tsx
  surface: '#1B1F24',        // Card background from home.tsx
  surfaceLight: '#333333',   // Lighter surface
  text: '#FFFFFF',          // White text from home.tsx
  textSecondary: '#AAAAAA', // Gray text from home.tsx
  textMuted: '#888888',     // Muted text
};

interface TabBarProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabPress }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  
  const tabs = [
    { 
      key: 'Liked Activities', 
      label: 'Liked Activities',
      icon: 'heart-outline',
      activeIcon: 'heart'
    },
    { 
      key: 'Collections', 
      label: 'Collections',
      icon: 'folder-outline',
      activeIcon: 'folder'
    }
  ];

  // Calculate tab width with proper padding
  const tabWidth = containerWidth > 0 ? (containerWidth - 8) / tabs.length : 0; // Account for container padding

  // Animate sliding indicator when active tab changes
  useEffect(() => {
    if (tabWidth > 0 && isLayoutReady) {
      const activeIndex = tabs.findIndex(tab => tab.key === activeTab);
      
      Animated.spring(slideAnim, {
        toValue: activeIndex * tabWidth + 4, // Add 4px offset for padding
        tension: 120,
        friction: 7,
        useNativeDriver: false, // Layout properties require false
      }).start();
    }
  }, [activeTab, tabWidth, isLayoutReady]);

  // Initialize animation position when layout is ready
  useEffect(() => {
    if (isLayoutReady && tabWidth > 0) {
      const activeIndex = tabs.findIndex(tab => tab.key === activeTab);
      slideAnim.setValue(activeIndex * tabWidth + 4);
    }
  }, [isLayoutReady, tabWidth]);

  const handleTabPress = (tab: string) => {
    // Add subtle scale animation for feedback
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    onTabPress(tab);
  };

  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
    
    // Small delay to ensure layout is complete
    setTimeout(() => {
      setIsLayoutReady(true);
    }, 50);
  };

  // Calculate the indicator height dynamically
  const getIndicatorHeight = () => {
    // Since container has 4px padding top/bottom, indicator height should be content height
    return 44; // Approximate height of tab content (12px padding * 2 + text/icon height)
  };

  return (
    <Animated.View 
      style={[
        styles.tabContainer,
        { transform: [{ scale: scaleAnim }] }
      ]}
      onLayout={handleLayout}
    >
      {/* Sliding Background Indicator */}
      {tabWidth > 0 && isLayoutReady && (
        <Animated.View
          style={[
            styles.slidingIndicator,
            {
              width: tabWidth - 8, // Slightly smaller than tab for padding
              height: getIndicatorHeight(), // Use calculated height instead of calc()
              transform: [{ translateX: slideAnim }],
            },
          ]}
        />
      )}
      
      {/* Tab Buttons */}
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.key;
        
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabButton}
            onPress={() => handleTabPress(tab.key)}
            activeOpacity={0.8}
          >
            <View style={styles.tabContent}>
              {/* Icon */}
              <Ionicons 
                name={isActive ? tab.activeIcon : tab.icon} 
                size={20} 
                color={isActive ? Colors.background : Colors.textSecondary}
                style={styles.tabIcon}
              />
              
              {/* Label */}
              <Text style={[
                styles.tabText, 
                isActive && styles.activeTabText
              ]}>
                {tab.label}
              </Text>
            </View>
            
            {/* Optional: Small dot indicator for active state */}
            {isActive && (
              <View style={styles.activeDot} />
            )}
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  
  // Sliding background indicator
  slidingIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    zIndex: 1,
  },
  
  // Tab button
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    position: 'relative',
  },
  
  // Tab content container
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Tab icon
  tabIcon: {
    marginRight: 6,
  },
  
  // Tab text
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  activeTabText: {
    color: Colors.background, // Dark text on orange background
    fontWeight: '600',
  },
  
  // Active dot indicator (optional extra visual cue)
  activeDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.background,
    opacity: 0.7,
  },
});

export default TabBar;