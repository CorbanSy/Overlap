// app/meetupFolder/startMeetUp.tsx
import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
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
import SwipingScreen, { SwipingHandle } from '../../components/swiping/SwipingScreen';
import MeetupExploreCard from '../../components/meetup_components/MeetUpExploreCard';
import Leader from '../../components/meetup_components/leader';
import { getMeetupData, updateMeetup } from '../../_utils/storage/meetups';
import { Ionicons } from '@expo/vector-icons';

// ⬇️ use the SafeAreaView from react-native-safe-area-context
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BUTTON_SIZE = 60;
const CONTROL_BAR_BASE_HEIGHT = 100; // base height before adding bottom inset
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
  const insets = useSafeAreaInsets(); // ⬅️ get safe-area insets

  // State
  const [showDirectionModal, setShowDirectionModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string>('Dining');
  const [meetupData, setMeetupData] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const deckRef = useRef<SwipingHandle | null>(null);

  // Animations
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const panX = useRef(new Animated.Value(0)).current;

  // Load meetup data
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

  const handleCategoryChange = async (newCategory: string) => {
    if (!meetupId) return;
    try {
      setCurrentCategory(newCategory);
      setMeetupData((prev: any) => ({ ...prev, category: newCategory }));
      setRefreshKey((prev) => prev + 1);
      await updateMeetup({ id: meetupId, category: newCategory });
    } catch (error) {
      console.error('Error updating meetup category:', error);
      const originalData = await getMeetupData(meetupId);
      setCurrentCategory(originalData.category || 'Dining');
      setMeetupData(originalData);
      throw error;
    }
  };

  const openLeaderboard = () => {
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
    Animated.timing(slideAnim, { toValue: SCREEN_WIDTH, duration: 300, useNativeDriver: true })
      .start(() => {
        setShowLeaderboardModal(false);
        panX.setValue(0);
      });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_: any, g: any) =>
          Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: () => panX.setValue(0),
        onPanResponderMove: (_: any, g: any) => {
          if (g.dx > 0) panX.setValue(g.dx);
        },
        onPanResponderRelease: (_: any, g: any) => {
          const threshold = SCREEN_WIDTH * 0.3;
          if (g.dx > threshold || g.vx > 0.5) {
            Animated.timing(panX, { toValue: SCREEN_WIDTH, duration: 200, useNativeDriver: true })
              .start(() => {
                setShowLeaderboardModal(false);
                panX.setValue(0);
              });
          } else {
            Animated.spring(panX, { toValue: 0, useNativeDriver: true, tension: 100, friction: 8 }).start();
          }
        },
      }),
    []
  );

  if (!meetupId) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]} edges={['top', 'left', 'right']}>
        <Text style={{ color: '#fff' }}>Missing meetupId</Text>
      </SafeAreaView>
    );
  }

  // Derived layout numbers that respect safe areas
  const controlBarHeight = CONTROL_BAR_BASE_HEIGHT + insets.bottom;
  const controlBarPaddingBottom = Math.max(16, insets.bottom);
  const deckBottomMargin = controlBarHeight; // keep deck above the control bar

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* ⬇️ SafeAreaView from safe-area-context handles the status bar notch on Android */}
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerAction} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={COLORS.accent} />
            <Text style={styles.headerButton}>Leave Meetup</Text>
          </TouchableOpacity>

          <View style={styles.categoryDisplay}>
            <Text style={styles.categoryText}>{currentCategory}</Text>
          </View>

          <TouchableOpacity onPress={openLeaderboard} style={styles.headerAction} activeOpacity={0.7}>
            <Ionicons name="trophy-outline" size={18} color={COLORS.accent} />
            <Text style={styles.headerButton}>Leaderboard</Text>
          </TouchableOpacity>
        </View>

        {/* SWIPE DECK */}
        <View style={[styles.swipeDeckContainer, { marginBottom: deckBottomMargin }]}>
          <SwipingScreen
            key={`${meetupId}-${currentCategory}-${refreshKey}`}
            ref={deckRef}
            meetupId={String(meetupId)}
            category={currentCategory}
            showInternalButtons={false}
            forceRefresh={refreshKey}
          />
        </View>

        {/* CONTROLS */}
        <View
          style={[
            styles.controlBar,
            {
              height: controlBarHeight,
              paddingBottom: controlBarPaddingBottom,
            },
          ]}
        >
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
        <Modal animationType="slide" transparent visible={showDirectionModal} onRequestClose={() => setShowDirectionModal(false)}>
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
        <Modal animationType="none" transparent visible={showLeaderboardModal} onRequestClose={closeLeaderboard}>
          <View style={styles.slideModalOverlay}>
            <Animated.View
              style={[
                styles.slideModalContent,
                { transform: [{ translateX: Animated.add(slideAnim, panX) }] },
              ]}
              {...panResponder.panHandlers}
            >
              {/* ⬇️ respect top inset inside the modal */}
              <View style={[styles.slideModalHeader, { paddingTop: insets.top + 12 }]}>
                <View style={styles.swipeIndicator} />
                <View style={styles.headerContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="trophy" size={24} color={COLORS.accent} style={{ marginRight: 8 }} />
                    <Text style={styles.slideModalTitle}>Activity Leaderboard</Text>
                  </View>
                  <TouchableOpacity onPress={closeLeaderboard} style={styles.modalCloseButton} activeOpacity={0.7}>
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
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#232533',
  },
  headerAction: { flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 1 },
  headerButton: { color: COLORS.accent, fontSize: 16, fontWeight: '600' },

  categoryDisplay: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  categoryText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },

  swipeDeckContainer: {
    flex: 1,
  },

  controlBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: COLORS.bg,
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

  // Modals
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
  slideModalTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  modalCloseButton: { padding: 4 },
  slideModalBody: { flex: 1, paddingTop: 10 },
});
