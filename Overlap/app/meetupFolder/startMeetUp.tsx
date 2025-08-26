//app/meetupFolder/startMeetUp.tsx
import React, { useState, useRef, useMemo } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import SwipingScreen, { SwipingHandle } from '../../components/swiping';
import ExploreMoreCard from '../../components/ExploreMoreCard';
import Leader from '../../components/leader';
import { PLACE_CATEGORIES } from '../../_utils/placeCategories';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BUTTON_SIZE = 60;
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
  const [showDirectionModal, setShowDirectionModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);

  const deckRef = useRef<SwipingHandle>(null);
  
  // Animation for slide-in from right
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const panX = useRef(new Animated.Value(0)).current;

  const openLeaderboard = () => {
    console.log('Opening leaderboard...');
    setShowLeaderboardModal(true);
    // Reset animations
    slideAnim.setValue(SCREEN_WIDTH);
    panX.setValue(0);
    // Animate slide in from right
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
          // Only allow swiping to the right (positive dx)
          if (gestureState.dx > 0) {
            panX.setValue(gestureState.dx);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          const threshold = SCREEN_WIDTH * 0.3; // 30% of screen width
          
          if (gestureState.dx > threshold || gestureState.vx > 0.5) {
            // Close the modal
            Animated.timing(panX, {
              toValue: SCREEN_WIDTH,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              setShowLeaderboardModal(false);
              panX.setValue(0);
            });
          } else {
            // Snap back to original position
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

  const currentCatKey = PLACE_CATEGORIES[0]?.key;
  const currentCat =
    PLACE_CATEGORIES.find((c) => c.key === currentCatKey) || { subCategories: [] };
  const otherCats = PLACE_CATEGORIES.filter((c) => c.key !== currentCat.key);

  if (!meetupId) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#fff' }}>Missing meetupId</Text>
      </SafeAreaView>
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
          <TouchableOpacity onPress={openLeaderboard} style={styles.headerAction}>
            <Ionicons name="trophy-outline" size={18} color={COLORS.accent} />
            <Text style={styles.headerButton}>Leaderboard</Text>
          </TouchableOpacity>
        </View>

        {/* SWIPE DECK */}
        <SwipingScreen ref={deckRef} meetupId={String(meetupId)} showInternalButtons={false} />

        {/* CONTROLS (single source of truth) */}
        <View style={styles.controlBar}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: COLORS.danger }]}
            onPress={() => deckRef.current?.swipeLeft()}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.centerButton]}
            onPress={() => setShowDirectionModal(true)}
          >
            <Ionicons name="refresh" size={24} color="#0D1117" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: COLORS.success }]}
            onPress={() => deckRef.current?.swipeRight()}
          >
            <Ionicons name="checkmark" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* CHANGE-DIRECTION MODAL */}
        <Modal
          animationType="slide"
          transparent
          visible={showDirectionModal}
          onRequestClose={() => setShowDirectionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ExploreMoreCard
                currentSubCategories={currentCat.subCategories}
                otherBroadCategories={otherCats}
                onSubCategoryPress={() => setShowDirectionModal(false)}
                onBroadCategoryPress={() => setShowDirectionModal(false)}
              />
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowDirectionModal(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
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
              {/* Header with close button and swipe indicator */}
              <View style={styles.slideModalHeader}>
                <View style={styles.swipeIndicator} />
                <View style={styles.headerContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="trophy" size={24} color={COLORS.accent} style={{ marginRight: 8 }} />
                    <Text style={styles.slideModalTitle}>
                      Activity Leaderboard
                    </Text>
                  </View>
                  <TouchableOpacity onPress={closeLeaderboard} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Leaderboard content */}
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
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#232533',
  },
  headerAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerButton: { color: COLORS.accent, fontSize: 16, fontWeight: '600' },

  controlBar: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
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
  centerButton: { backgroundColor: COLORS.accent },

  // Original modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  closeText: { color: COLORS.bg, fontWeight: 'bold' },

  // Slide-in modal styles
  slideModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  slideModalContent: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.9, // 90% of screen width
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  slideModalHeader: {
    paddingTop: 50, // Account for status bar
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
  slideModalBody: {
    flex: 1,
    paddingTop: 10,
  },
});