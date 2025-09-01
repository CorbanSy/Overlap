// components/TabBar.tsx - Enhanced with Info Buttons
import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Professional color palette matching your app
const Colors = {
  primary: '#F5A623',
  background: '#0D1117',
  surface: '#1B1F24',
  surfaceLight: '#333333',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#888888',
  border: '#30363D',
};

interface TabBarProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
  likedCount?: number;
  collectionsCount?: number;
  onInfoPress?: (tab: string) => void; // New prop for info button handling
}

const TabBar: React.FC<TabBarProps> = ({ 
  activeTab, 
  onTabPress, 
  likedCount = 0, 
  collectionsCount = 0,
  onInfoPress
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  
  const tabs = [
    { 
      key: 'Liked Activities', 
      label: 'Liked',
      icon: 'heart-outline' as const,
      activeIcon: 'heart' as const,
      count: likedCount,
    },
    { 
      key: 'Collections', 
      label: 'Collections',
      icon: 'folder-outline' as const,
      activeIcon: 'folder' as const,
      count: collectionsCount,
    }
  ];

  // Calculate tab width with proper padding
  const tabWidth = containerWidth > 0 ? (containerWidth - 8) / tabs.length : 0;

  // Animate sliding indicator when active tab changes
  useEffect(() => {
    if (tabWidth > 0 && isLayoutReady) {
      const activeIndex = tabs.findIndex(tab => tab.key === activeTab);
      
      Animated.spring(slideAnim, {
        toValue: activeIndex * tabWidth + 4,
        tension: 50,
        friction: 12,
        useNativeDriver: false,
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

  const handleInfoPress = (tab: string, event: any) => {
    // Prevent tab switching when info button is pressed
    event.stopPropagation();
    onInfoPress?.(tab);
  };

  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
    
    // Small delay to ensure layout is complete
    setTimeout(() => {
      setIsLayoutReady(true);
    }, 50);
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
              width: tabWidth - 8,
              height: 44,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        />
      )}
      
      {/* Tab Buttons */}
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabButton}
            onPress={() => handleTabPress(tab.key)}
            activeOpacity={0.8}
          >
            <View style={styles.tabContent}>
              {/* Info Button */}
              {onInfoPress && (
                <TouchableOpacity
                  style={[
                    styles.infoButton,
                    isActive && styles.activeInfoButton
                  ]}
                  onPress={(event) => handleInfoPress(tab.key, event)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons 
                    name="information-circle-outline" 
                    size={12} 
                    color={isActive ? Colors.background : Colors.textMuted} 
                  />
                </TouchableOpacity>
              )}
              
              {/* Icon */}
              <Ionicons 
                name={isActive ? tab.activeIcon : tab.icon} 
                size={18} 
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
              
              {/* Count Badge */}
              {tab.count > 0 && (
                <View style={[
                  styles.countBadge,
                  isActive && styles.activeCountBadge
                ]}>
                  <Text style={[
                    styles.countText,
                    isActive && styles.activeCountText
                  ]}>
                    {tab.count > 99 ? '99+' : tab.count}
                  </Text>
                </View>
              )}
            </View>
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
    borderColor: Colors.border,
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
    gap: 4,
  },
  
  // Info button
  infoButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeInfoButton: {
    backgroundColor: 'rgba(13, 17, 23, 0.3)',
    borderColor: 'transparent',
  },
  
  // Tab icon
  tabIcon: {
    marginRight: 6,
  },
  
  // Tab text
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  activeTabText: {
    color: Colors.background,
    fontWeight: '700',
  },
  
  // Count badge
  countBadge: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
    minWidth: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeCountBadge: {
    backgroundColor: 'rgba(13, 17, 23, 0.3)',
    borderColor: 'transparent',
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  activeCountText: {
    color: Colors.background,
  },
});

export default TabBar;