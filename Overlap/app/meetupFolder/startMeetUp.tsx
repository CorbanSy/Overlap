// app/meetupFolder/startMeetUp.tsx - Fixed layout to prevent button overlap
import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  PanResponder,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import SwipingScreen, { SwipingHandle } from '../../components/swiping';
import MeetupExploreCard from '../../components/MeetUpExploreCard';
import Leader from '../../components/leader';
import TurboModeScreen from '../../components/turbo/TurboModeScreen';
import { initializeTurboSession } from '../../_utils/storage/turboMeetup';
import { getMeetupData, updateMeetup } from '../../_utils/storage/meetups';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BUTTON_SIZE = 60;
const CONTROL_BAR_HEIGHT = 100; // Fixed height for control bar
const COLORS = {
  bg: '#0D1117',
  surface: '#1B1F24',
  accent: '#F5A623',
  danger: '#DC3545',
  success: '#28A745',
};

export default function StartMeetupScreen() {
  const { meetupId } = useLocalSearchParams<{ meetupId?: string }>();
  const router = useRouter();
  
  // State management
  const [showDirectionModal, setShowDirectionModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showTurboMode, setShowTurboMode] = useState(false);
  const [turboSessionId, setTurboSessionId] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string>('Dining');
  const [meetupData, setMeetupData] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const deckRef = useRef<SwipingHandle>(null);
  
  // Animation for slide-in from right
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const panX = useRef(new Animated.Value(0)).current;

  // Load meetup data on mount
  useEffect(() => {
    const loadMeetupData = async () => {
      if (!meetupId) return;
      
      try {
        const data = await getMeetupData(meetupId);
        setMeetupData(data);
        setCurrentCategory(data.category || 'Dining');
      } catch (error) {
        console.error('Error loading meetup data:', error);
      }
    };

    loadMeetupData();
  }, [meetupId]);

  // Handle category change
  const handleCategoryChange = async (newCategory: string) => {
    if (!meetupId) return;

    try {
      console.log(`[handleCategoryChange] Changing category from ${currentCategory} to ${newCategory}`);
      
      setCurrentCategory(newCategory);
      setMeetupData(prev => ({ ...prev, category: newCategory }));
      setRefreshKey(prev => prev + 1);
      
      await updateMeetup({
        id: meetupId,
        category: newCategory,
      });

      console.log(`[handleCategoryChange] Category updated successfully. Local: ${newCategory}, RefreshKey: ${refreshKey + 1}`);
      
    } catch (error) {
      console.error('Error updating meetup category:', error);
      
      const originalData = await getMeetupData(meetupId);
      setCurrentCategory(originalData.category || 'Dining');
      setMeetupData(originalData);
      
      throw error;
    }
  };

  // Turbo Mode Handler
  const handleStartTurboMode = async () => {
    if (!meetupId) {
      Alert.alert('Error', 'No meetup ID found');
      return;
    }

    try {
      const data = meetupData || await getMeetupData(meetupId);
      const groupSize = data.participants?.length || 1;
      
      if (groupSize < 3) {
        Alert.alert(
          'Not Enough Participants', 
          'Turbo Mode requires at least 3 participants. Invite more friends first!'
        );
        return;
      }

      await initializeTurboSession(meetupId, groupSize);
      setShowTurboMode(true);
    } catch (error) {
      console.error('Error starting turbo mode:', error);
      Alert.alert('Error', 'Failed to start Turbo Mode. Please try again.');
    }
  };

  const openLeaderboard = () => {
    console.log('Opening leaderboard...');
    setShowLeaderboardModal(true);
    slideAnim.setValue(SCREEN_WIDTH);
    panX.setValue(0);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const closeLeaderboard = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowLeaderboardModal(false);
      panX.setValue(0);
    });
  };

  // Pan responder for swipe to dismiss
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        },
        onPanResponderGrant: () => {
          panX.setValue(0);
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx > 0) {
            panX.setValue(gestureState.dx);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          const threshold = SCREEN_WIDTH * 0.3;
          
          if (gestureState.dx > threshold || gestureState.vx > 0.5) {
            Animated.timing(panX, {
              toValue: SCREEN_WIDTH,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              setShowLeaderboardModal(false);
              panX.setValue(0);
            });
          } else {
            Animated.spring(panX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }).start();
          }
        },
      }),
    []
  );

  if (!meetupId) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#fff' }}>Missing meetupId</Text>
      </SafeAreaView>
    );
  }

  if (showTurboMode) {
    return (
      <TurboModeScreen
        meetupId={String(meetupId)}
        onExit={() => {
          setShowTurboMode(false);
          setTurboSessionId(null);
        }}
      />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerAction}>
            <Ionicons name="chevron-back" size={20} color={COLORS.accent} />
            <Text style={styles.headerButton}>Leave Meetup</Text>
          </TouchableOpacity>

          <View style={styles.categoryDisplay}>
            <Text style={styles.categoryText}>{currentCategory}</Text>
          </View>

          <TouchableOpacity onPress={openLeaderboard} style={styles.headerAction}>
            <Ionicons name="trophy-outline" size={18} color={COLORS.accent} />
            <Text style={styles.headerButton}>Leaderboard</Text>
          </TouchableOpacity>
        </View>

        {/* TURBO MODE BUTTON */}
        <View style={styles.turboContainer}>
          <TouchableOpacity 
            style={styles.turboButton} 
            onPress={handleStartTurboMode}
            activeOpacity={0.8}
          >
            <View style={styles.turboButtonContent}>
              <Ionicons name="flash" size={20} color={COLORS.accent} />
              <Text style={styles.turboButtonText}>Turbo Mode</Text>
              <Text style={styles.turboButtonSubtitle}>2min decision</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* SWIPE DECK - Now contained within available space */}
        <View style={styles.swipeDeckContainer}>
          <SwipingScreen 
            key={`${meetupId}-${currentCategory}-${refreshKey}`}
            ref={deckRef} 
            meetupId={String(meetupId)} 
            category={currentCategory}
            showInternalButtons={false} 
            forceRefresh={refreshKey}
          />
        </View>

        {/* CONTROLS - Fixed at bottom with proper spacing */}
        <View style={styles.controlBar}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: COLORS.danger }]}
            onPress={() => deckRef.current?.swipeLeft()}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.centerButton]}
            onPress={() => setShowDirectionModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="options" size={24} color="#0D1117" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: COLORS.success }]}
            onPress={() => deckRef.current?.swipeRight()}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* CHANGE-CATEGORY MODAL */}
        <Modal
          animationType="slide"
          transparent
          visible={showDirectionModal}
          onRequestClose={() => setShowDirectionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <MeetupExploreCard
              currentCategory={currentCategory}
              meetupId={String(meetupId)}
              onCategoryChange={handleCategoryChange}
              onClose={() => setShowDirectionModal(false)}
            />
          </View>
        </Modal>

        {/* LEADERBOARD MODAL */}
        <Modal
          animationType="none"
          transparent
          visible={showLeaderboardModal}
          onRequestClose={closeLeaderboard}
        >
          <View style={styles.slideModalOverlay}>
            <Animated.View 
              style={[
                styles.slideModalContent,
                {
                  transform: [
                    { 
                      translateX: Animated.add(slideAnim, panX)
                    }
                  ]
                }
              ]}
              {...panResponder.panHandlers}
            >
              <View style={styles.slideModalHeader}>
                <View style={styles.swipeIndicator} />
                <View style={styles.headerContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="trophy" size={24} color={COLORS.accent} style={{ marginRight: 8 }} />
                    <Text style={styles.slideModalTitle}>
                      Activity Leaderboard
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={closeLeaderboard} 
                    style={styles.modalCloseButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.slideModalBody}>
                <Leader meetupId={String(meetupId)} />
              </View>
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#232533',
  },
  headerAction: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
    zIndex: 1,
  },
  headerButton: { 
    color: COLORS.accent, 
    fontSize: 16, 
    fontWeight: '600' 
  },

  categoryDisplay: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  categoryText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },

  turboContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#232533',
  },
  turboButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  turboButtonContent: {
    alignItems: 'center',
    gap: 2,
    width: 100,
  },
  turboButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  turboButtonSubtitle: {
    fontSize: 10,
    color: COLORS.accent,
    fontWeight: '600',
  },

  // NEW: Container for swipe deck that respects control bar space
  swipeDeckContainer: {
    flex: 1,
    marginBottom: CONTROL_BAR_HEIGHT, // Reserve space for control bar
  },

  // UPDATED: Control bar with fixed positioning and proper spacing
  controlBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CONTROL_BAR_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 20, // Safe area padding
    backgroundColor: COLORS.bg, // Ensure background doesn't show through
  },
  controlButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  centerButton: { 
    backgroundColor: COLORS.accent 
  },

  // Modal styles (unchanged)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  slideModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  slideModalContent: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.9,
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  slideModalHeader: {
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  slideModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 4,
  },
  slideModalBody: {
    flex: 1,
    paddingTop: 10,
  },
});