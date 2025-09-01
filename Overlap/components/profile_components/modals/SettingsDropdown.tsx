// components/profile_components/modals/SettingsDropdown.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Colors = {
  primary: '#F5A623',
  background: '#0D1117',
  surface: '#1B1F24',
  surfaceLight: '#333333',
  border: '#333333',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#888888',
  error: '#F44336',
};

interface MenuItem {
  key: string;
  icon: string;
  label: string;
  color: string;
  badge?: number;
}

interface SettingsDropdownProps {
  visible: boolean;
  onSelectOption: (option: string) => void;
  pendingInvitationsCount?: number;
}

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  visible,
  onSelectOption,
  pendingInvitationsCount = 0,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(-10);
    }
  }, [visible]);

  if (!visible) return null;

  const menuItems: MenuItem[] = [
    { key: 'Account', icon: 'person-outline', label: 'Account', color: Colors.text },
    { key: 'Edit Profile', icon: 'create-outline', label: 'Edit Profile', color: Colors.text },
    { 
      key: 'Collection Invitations', 
      icon: 'mail-outline', 
      label: 'Collection Invitations', 
      color: Colors.text,
      badge: pendingInvitationsCount > 0 ? pendingInvitationsCount : undefined
    },
    { key: 'Notifications', icon: 'notifications-outline', label: 'Notifications', color: Colors.text },
    { key: 'Privacy', icon: 'lock-closed-outline', label: 'Privacy', color: Colors.text },
    { key: 'Friends', icon: 'people-outline', label: 'Friends', color: Colors.text },
    { key: 'Help', icon: 'help-circle-outline', label: 'Help', color: Colors.text },
    { key: 'Logout', icon: 'log-out-outline', label: 'Logout', color: Colors.error },
  ];

  return (
    <Animated.View
      style={[
        styles.settingsDropdown,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {menuItems.map((item, index) => (
        <TouchableOpacity
          key={item.key}
          style={[
            styles.settingsItem,
            index === menuItems.length - 1 && styles.lastSettingsItem,
          ]}
          onPress={() => onSelectOption(item.key)}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={item.icon as any} size={20} color={item.color} />
            {item.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.settingsText, { color: item.color }]}>
            {item.label}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  settingsDropdown: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 8,
    width: 200, // Slightly wider to accommodate badges
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lastSettingsItem: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    position: 'relative',
    marginRight: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default SettingsDropdown;