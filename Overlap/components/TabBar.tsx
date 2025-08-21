// components/TabBar.tsx
import React, { useRef, useEffect } from 'react';
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

  // Get container width and calculate tab width
  const [containerWidth, setContainerWidth] = useState(0);
  const tabWidth = containerWidth > 0 ? (containerWidth - 8) / tabs.length : 0; // Account for container padding

  // Animate sliding indicator when active tab changes
  useEffect(() => {
    if (tabWidth > 0) {
      const activeIndex = tabs.findIndex(tab => tab.key === activeTab);
      console.log('Animating to:', activeIndex, 'tabWidth:', tabWidth); // Debug log
      
      Animated.spring(slideAnim, {
        toValue: activeIndex * tabWidth + 4, // Add 4px offset for padding
        tension: 100,
        friction: 8,
        useNativeDriver: false, // Changed to false for layout properties
      }).start();
    }
  }, [activeTab, tabWidth]);

  const handleTabPress = (tab: string) => {
    // Add subtle scale animation for feedback
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
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

  return (
    <Animated.View 
      style={[
        styles.tabContainer,
        { transform: [{ scale: scaleAnim }] }
      ]}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
      }}
    >
      {/* Sliding Background Indicator */}
      {tabWidth > 0 && (
        <Animated.View
          style={[
            styles.slidingIndicator,
            {
              width: tabWidth - 8, // Slightly smaller than tab for padding
              left: slideAnim, // Use animated value directly
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
    height: '100%',
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