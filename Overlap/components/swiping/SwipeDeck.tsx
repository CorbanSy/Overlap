//components/swiping/SwipingDeck.tsx - Fixed version
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder } from 'react-native';
import ActivityCard, { Card } from './ActivityCard';
import { recordSwipe } from '../../_utils/storage/meetupSwipes';
import { getAuth } from 'firebase/auth';

const PHOTO_SWIPE_THRESHOLD = 50;

export type SwipeDeckHandle = {
  swipeLeft: () => void;
  swipeRight: () => void;
  openInfo: () => void;
};

type Props = {
  cards: Card[];
  meetupId: string;
  turboMode?: boolean;
  onSwipeLeft?: (card: Card) => void;
  onSwipeRight?: (card: Card) => void;
  onCardTap?: (card: Card) => void;
  onIndexChange?: (index: number) => void;
  onAnimatingChange?: (animating: boolean) => void;
};

const SwipeDeck = forwardRef<SwipeDeckHandle, Props>(function SwipeDeck(
  { cards, meetupId, turboMode, onSwipeLeft, onSwipeRight, onCardTap, onIndexChange, onAnimatingChange },
  ref
) {
  const position = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const nextCardScale = useRef(new Animated.Value(0.95)).current;
  const nextCardOpacity = useRef(new Animated.Value(0.8)).current;
  const photoTransition = useRef(new Animated.Value(1)).current;

  const [index, setIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    onAnimatingChange?.(isAnimating);
  }, [isAnimating, onAnimatingChange]);

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  // Reset both index and photoIndex when cards change
  useEffect(() => {
    setIndex(0);
    setPhotoIndex(0);
  }, [cards]);

  // Reset photo index when card index changes (NEW)
  useEffect(() => {
    setPhotoIndex(0);
  }, [index]);

  const animateNextCard = useCallback(() => {
    Animated.parallel([
      Animated.timing(nextCardScale, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(nextCardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [nextCardOpacity, nextCardScale]);

  const resetAnimations = useCallback(() => {
    position.setValue({ x: 0, y: 0 });
    scale.setValue(1);
    nextCardScale.setValue(0.95);
    nextCardOpacity.setValue(0.8);
  }, [nextCardOpacity, nextCardScale, position, scale]);

  const animatePhotoTransition = useCallback(() => {
    Animated.sequence([
      Animated.timing(photoTransition, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(photoTransition, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [photoTransition]);

  const animateScale = useCallback((toValue: number) => {
    Animated.timing(scale, { toValue, duration: 100, useNativeDriver: true }).start();
  }, [scale]);

  const springToCenter = useCallback(() => {
    Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: true, tension: 100, friction: 8 }).start();
  }, [position]);

  const animateSwipeOut = useCallback((direction: 'left' | 'right', onComplete: () => void) => {
    const targetX = direction === 'left' ? -1000 : 1000;
    Animated.timing(position, { toValue: { x: targetX, y: 0 }, duration: 250, useNativeDriver: true }).start(onComplete);
  }, [position]);

  const handleCardSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      const card = cards[index];
      if (!card || isAnimating) return;
      setIsAnimating(true);

      if (direction === 'left') onSwipeLeft?.(card);
      else onSwipeRight?.(card);

      try {
        const user = getAuth().currentUser;
        if (user && !turboMode) {
          await recordSwipe(meetupId, user.uid, card.id, direction, card.name);
        }

        animateNextCard();
        setTimeout(() => {
          resetAnimations();
          setIndex((p) => p + 1);
          // Removed setPhotoIndex(0) from here - it's handled by useEffect now
          setIsAnimating(false);
        }, 200);
      } catch (e) {
        resetAnimations();
        setIsAnimating(false);
      }
    },
    [animateNextCard, cards, index, isAnimating, meetupId, onSwipeLeft, onSwipeRight, resetAnimations, turboMode]
  );

  const cyclePhoto = useCallback(
    (dir: 'next' | 'prev') => {
      const current = cards[index];
      if (!current || !current.photoUrls || current.photoUrls.length <= 1) return;
      const total = current.photoUrls.length;

      setPhotoIndex((prev) => {
        const next = dir === 'next' ? (prev + 1) % total : prev === 0 ? total - 1 : prev - 1;
        return next;
      });
      animatePhotoTransition();
    },
    [animatePhotoTransition, cards, index]
  );

  const handleOpenInfo = useCallback(() => {
    const card = cards[index];
    if (!card) return;
    onCardTap?.(card);
  }, [cards, index, onCardTap]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isAnimating,
        onMoveShouldSetPanResponder: (_, g) => !isAnimating && Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 10,
        onPanResponderGrant: () => { animateScale(0.98); },
        onPanResponderMove: (_, g) => { if (!isAnimating) position.setValue({ x: g.dx * 0.3, y: 0 }); },
        onPanResponderRelease: (_, g) => {
          if (isAnimating) return;
          animateScale(1);
          if (Math.abs(g.dx) > PHOTO_SWIPE_THRESHOLD) {
            if (g.dx > 0) cyclePhoto('prev');
            else cyclePhoto('next');
          }
          springToCenter();
        },
      }),
    [animateScale, cyclePhoto, isAnimating, position, springToCenter]
  );

  useImperativeHandle(ref, () => ({
    swipeLeft: () => { if (!isAnimating) animateSwipeOut('left', () => handleCardSwipe('left')); },
    swipeRight: () => { if (!isAnimating) animateSwipeOut('right', () => handleCardSwipe('right')); },
    openInfo: handleOpenInfo,
  }), [animateSwipeOut, handleCardSwipe, handleOpenInfo, isAnimating]);

  const currentCard = cards[index];
  const nextCard = cards[index + 1];

  // Animated styles for active/next
  const activeStyle = {
    zIndex: 2,
    transform: [
      ...position.getTranslateTransform(),
      { scale: Animated.multiply(scale, photoTransition.interpolate({ inputRange: [0.8, 1], outputRange: [0.98, 1] })) },
    ],
  };
  const nextStyle = { transform: [{ scale: nextCardScale }], opacity: nextCardOpacity, zIndex: 1 } as any;

  return (
    <>
      {nextCard && (
        <ActivityCard
          card={nextCard}
          isActive={false}
          wrapperStyle={nextStyle}
          currentPhotoIndex={0} // Always start next card at photo 0
          photoTransition={photoTransition}
          onMoreInfo={() => {}}
        />
      )}
      {currentCard && (
        <ActivityCard
          card={currentCard}
          isActive
          wrapperStyle={activeStyle}
          panHandlers={panResponder.panHandlers}
          currentPhotoIndex={photoIndex}
          photoTransition={photoTransition}
          onMoreInfo={handleOpenInfo}
        />
      )}
    </>
  );
});

export default SwipeDeck;