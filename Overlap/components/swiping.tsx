// components/swiping.tsx
import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getMeetupLikes, recordSwipe } from '../_utils/storage';
import { getAuth } from 'firebase/auth';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const SwipingScreen = ({ meetupId }: { meetupId: string }) => {
  const router = useRouter();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;

  // load all participants' liked activities
  useEffect(() => {
    async function loadCards() {
      if (!meetupId) {
        console.error('No meetupId provided');
        setLoading(false);
        return;
      }
      try {
        const liked = await getMeetupLikes(meetupId);
        console.log('🔁 loaded likedActivities:', liked.length);
        setCards(liked);
      } catch (e) {
        console.error('Error fetching liked activities:', e);
      } finally {
        setLoading(false);
      }
    }
    loadCards();
  }, [meetupId]);

  // record swipe, then advance index
  const handleSwipe = (direction: 'left' | 'right') => {
    const card = cards[currentCardIndex];
    if (!card) return;
    const user = getAuth().currentUser;
    if (user) {
      recordSwipe(meetupId, user.uid, card.id, direction, card.name)
        .then(() => console.log('[Swipe Recorded]', card.id, direction))
        .catch(err => console.error('⚠️ recordSwipe failed:', err));
    }
    position.setValue({ x: 0, y: 0 });
    setCurrentCardIndex(i => i + 1);
  };

  // PanResponder for swiping/tap
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, g) => position.setValue({ x: g.dx, y: g.dy }),
        onPanResponderRelease: (_, g) => {
          // tap => moreInfo
          if (Math.abs(g.dx) < 15 && Math.abs(g.dy) < 15) {
            const card = cards[currentCardIndex];
            card && router.push(`/moreInfo?placeId=${card.id}`);
            return;
          }
          const animConfig = { duration: 250, useNativeDriver: false };
          if (g.dx > 120) {
            Animated.timing(position, {
              toValue: { x: SCREEN_WIDTH + 100, y: g.dy },
              ...animConfig,
            }).start(() => handleSwipe('right'));
          } else if (g.dx < -120) {
            Animated.timing(position, {
              toValue: { x: -SCREEN_WIDTH - 100, y: g.dy },
              ...animConfig,
            }).start(() => handleSwipe('left'));
          } else {
            Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
          }
        },
      }),
    [cards, currentCardIndex, position]
  );

  // render current card or status
  const renderCard = () => {
    if (loading) {
      return <ActivityIndicator style={styles.spinner} size="large" color="#fff" />;
    }
    if (currentCardIndex >= cards.length) {
      return <Text style={styles.noMore}>No more liked activities</Text>;
    }
    const card = cards[currentCardIndex];
    // use first URL we stored in meetup likes
    const imageUrl =
      Array.isArray(card.photoUrls) && card.photoUrls.length
        ? card.photoUrls[0]
        : null;

    return (
      <Animated.View
        style={[styles.card, { transform: position.getTranslateTransform() }]}
        {...panResponder.panHandlers}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImage}>
            <Text style={styles.noImageText}>No Image Available</Text>
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.name}>{card.name}</Text>
          {card.rating != null && <Text style={styles.rating}>{card.rating} ⭐</Text>}
          <TouchableOpacity
            style={styles.moreInfo}
            onPress={() => router.push(`/moreInfo?placeId=${card.id}`)}
          >
            <Text style={styles.moreInfoText}>More Info</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cardContainer}>{renderCard()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  spinner: { flex: 1, justifyContent: 'center' },
  noMore: { flex: 1, textAlign: 'center', color: '#fff', marginTop: 40, fontSize: 18 },
  cardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.75, backgroundColor: '#1B1F24', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  noImage: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#333' },
  noImageText: { color: '#fff', fontSize: 18 },
  infoContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 10,
  },
  name: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  rating: { color: '#fff', fontSize: 18, marginTop: 4 },
  moreInfo: { marginTop: 10, backgroundColor: '#F5A623', padding: 8, borderRadius: 5, alignSelf: 'flex-start' },
  moreInfoText: { color: '#0D1117', fontSize: 16, fontWeight: 'bold' },
});

export default SwipingScreen;
