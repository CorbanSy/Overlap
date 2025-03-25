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
import { getMeetupLikes, getProfileData } from '../app/utils/storage';

const SCREEN_WIDTH = Dimensions.get('window').width;

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
      try {
        // Use getMeetupLikes to aggregate likes for all users in this meetup.
        const likedActivities = await getMeetupLikes(meetupId);
        const profileData = await getProfileData();
  
        // (Optional) Additional client-side filtering:
        // const filteredByMeetup = likedActivities.filter(activity => activity.meetupId === meetupId);
  
        if (
          profileData &&
          profileData.topCategories &&
          profileData.topCategories.length > 0
        ) {
          const filteredActivities = likedActivities.filter((activity) => {
            if (!activity.types || !Array.isArray(activity.types)) return false;
            return activity.types.some((type) =>
              profileData.topCategories.includes(type)
            );
          });
          setCards(filteredActivities);
        } else {
          setCards(likedActivities);
        }
      } catch (error) {
        console.error("Error fetching liked activities or profile data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadCards();
  }, [meetupId]);

  // Interpolated opacities for swipe indicators
  const yesOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const noOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // When a card is tapped, navigate to ExploreMoreCard screen.
  const handleCardPress = () => {
    const card = cards[currentCardIndex];
    if (!card) return;
    router.push(`/exploreMoreCard?activityId=${card.id}`);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        // If movement is minimal, treat as a tap.
        if (Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10) {
          handleCardPress();
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
    setCurrentCardIndex((prevIndex) => prevIndex + 1);
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
      return (
        <View style={styles.noMoreCards}>
          <Text style={styles.noMoreCardsText}>No more liked activities</Text>
        </View>
      );
    }
    const card = cards[currentCardIndex];
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      outputRange: ['-30deg', '0deg', '30deg'],
      extrapolate: 'clamp',
    });
    const animatedStyle = {
      transform: [...position.getTranslateTransform(), { rotate }],
    };

    return (
      <Animated.View style={[styles.card, animatedStyle]} {...panResponder.panHandlers}>
        <Animated.Text style={[styles.noIndicator, { opacity: noOpacity }]}>
          NO
        </Animated.Text>
        <Animated.Text style={[styles.yesIndicator, { opacity: yesOpacity }]}>
          YES
        </Animated.Text>
        {card.photoReference && (
          <Image
            source={{
              uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${card.photoReference}&key=YOUR_API_KEY`,
            }}
            style={styles.image}
          />
        )}
        <Text style={styles.cardTitle}>{card.name}</Text>
        {card.rating !== undefined && (
          <Text style={styles.cardSubtitle}>{card.rating} ⭐</Text>
        )}
        <Text style={styles.cardDescription}>
          {card.description || card.formatted_address || 'No description available.'}
        </Text>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>‹ Back</Text>
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
    width: SCREEN_WIDTH - 40,
    padding: 20,
    borderRadius: 8,
    backgroundColor: '#1B1F24',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 18,
    color: '#F5A623',
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 16,
    color: '#ccc',
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
  yesIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#28A745',
    zIndex: 1000,
  },
  noIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#DC3545',
    zIndex: 1000,
  },
});

export default SwipingScreen;
