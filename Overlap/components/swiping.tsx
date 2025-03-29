import React, { useRef, useState, useEffect } from 'react';
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
import { getMeetupLikes } from '../app/utils/storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const SwipingScreen = ({ meetupId }) => {
  const router = useRouter();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    async function loadCards() {
      if (!meetupId) {
        console.error("No meetupId provided in route parameters.");
        setLoading(false);
        return;
      }
      console.log("Fetching liked activities for meetupId:", meetupId);
      try {
        // Directly set liked activities without filtering
        const likedActivities = await getMeetupLikes(meetupId);
        console.log("Fetched liked activities:", likedActivities);
        setCards(likedActivities);
      } catch (error) {
        console.error("Error fetching liked activities:", error);
      } finally {
        setLoading(false);
      }
    }
    loadCards();
  }, [meetupId]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        // If movement is minimal, treat as a tap.
        if (Math.abs(gesture.dx) < 15 && Math.abs(gesture.dy) < 15) {
          const card = cards[currentCardIndex];
          if (card) {
            // Navigate to moreInfo.tsx for more details about the activity.
            router.push(`/moreInfo?placeId=${card.id}`);
          }
          return;
        }
        if (gesture.dx > 120) {
          Animated.timing(position, {
            toValue: { x: SCREEN_WIDTH + 100, y: gesture.dy },
            duration: 250,
            useNativeDriver: false,
          }).start(() => handleSwipe('right'));
        } else if (gesture.dx < -120) {
          Animated.timing(position, {
            toValue: { x: -SCREEN_WIDTH - 100, y: gesture.dy },
            duration: 250,
            useNativeDriver: false,
          }).start(() => handleSwipe('left'));
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const handleSwipe = (direction) => {
    console.log('Swiped:', direction);
    position.setValue({ x: 0, y: 0 });
    setCurrentCardIndex((prevIndex) => {
      const newIndex = prevIndex + 1;
      console.log("Current card index updated to:", newIndex);
      return newIndex;
    });
  };

  const renderCard = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      );
    }
    if (currentCardIndex >= cards.length) {
      console.log("No more cards. currentCardIndex:", currentCardIndex, "cards.length:", cards.length);
      return (
        <View style={styles.noMoreCards}>
          <Text style={styles.noMoreCardsText}>No more liked activities</Text>
        </View>
      );
    }
    const card = cards[currentCardIndex];
    return (
      <Animated.View
        style={[styles.card, { transform: position.getTranslateTransform() }]}
        {...panResponder.panHandlers}
      >
        {card.photoReference ? (
          <Image
            source={{
              uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${card.photoReference}&key=AIzaSyDcTuitQdQGXwuLp90NqQ_ZwhnMSGrr8mY`,
            }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImagePlaceholder}>
            <Text style={styles.noImageText}>No Image Available</Text>
          </View>
        )}
        {/* Overlay for activity info */}
        <View style={styles.infoContainer}>
          <Text style={styles.activityName}>{card.name}</Text>
          {card.rating !== undefined && (
            <Text style={styles.activityRating}>{card.rating} ⭐</Text>
          )}
          <TouchableOpacity
            style={styles.moreInfoButton}
            onPress={() => router.push(`/moreInfo?placeId=${card.id}`)}
          >
            <Text style={styles.moreInfoButtonText}>More Info</Text>
          </TouchableOpacity>
        </View>
        {/* Overlay icons on the bottom corners */}
        <View style={styles.iconContainer}>
          <View style={styles.leftIcon}>
            <Text style={[styles.iconText, { color: '#DC3545' }]}>❌</Text>
            <Text style={styles.arrowText}>←</Text>
          </View>
          <View style={styles.rightIcon}>
            <Text style={[styles.iconText, { color: '#28A745' }]}>✅</Text>
            <Text style={styles.arrowText}>→</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>‹ Leave Meetup</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Liked Activities</Text>
      </View>
      <View style={styles.cardContainer}>{renderCard()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1117',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#232533',
  },
  backButton: {
    paddingRight: 16,
  },
  backButtonText: {
    color: '#F5A623',
    fontSize: 20,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginRight: 32,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
    backgroundColor: '#1B1F24',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  noImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  noImageText: {
    color: '#fff',
    fontSize: 18,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 10,
  },
  activityName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  activityRating: {
    color: '#fff',
    fontSize: 18,
    marginTop: 4,
  },
  moreInfoButton: {
    marginTop: 10,
    backgroundColor: '#F5A623',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  moreInfoButtonText: {
    color: '#0D1117',
    fontSize: 16,
    fontWeight: 'bold',
  },
  iconContainer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftIcon: {
    alignItems: 'center',
  },
  rightIcon: {
    alignItems: 'center',
  },
  iconText: {
    fontSize: 60,
  },
  arrowText: {
    fontSize: 24,
    color: '#fff',
    marginTop: 4,
  },
  noMoreCards: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMoreCardsText: {
    fontSize: 20,
    color: '#fff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 300,
  },
});

export default SwipingScreen;
