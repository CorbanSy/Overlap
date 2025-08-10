// friendProfile.tsx (view-only)
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export const options = { headerShown: false };

type FriendPublic = {
  displayName?: string;
  usernamePublic?: string;
  emailLower?: string;
  bioPublic?: string;
  avatarUrl?: string;
  topCategoriesPublic?: string[];
};

const FriendProfile = () => {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<FriendPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const firestore = getFirestore();

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const snap = await getDoc(doc(firestore, 'userDirectory', String(uid)));
        if (mounted) setProfile(snap.exists() ? (snap.data() as FriendPublic) : null);
      } catch (e) {
        console.error('Error fetching friend directory:', e);
        if (mounted) setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (uid) run();
    return () => { mounted = false; };
  }, [uid]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#F5A623" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Profile not found.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backPill}>
            <Text style={styles.backPillText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const name =
    profile.displayName ||
    profile.usernamePublic ||
    profile.emailLower ||
    'Friend';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Profile</Text>
          <View style={{ width: 44 }} />{/* spacer to balance back button */}
        </View>

        {/* Header card (similar vibe to your FullProfileInfo) */}
        <View style={styles.headerCard}>
          <Image
            source={
              profile.avatarUrl
                ? { uri: profile.avatarUrl }
                : require('../../assets/images/profile.png')
            }
            style={styles.avatar}
          />
          <Text style={styles.name}>{name}</Text>
          {!!profile.usernamePublic && (
            <Text style={styles.username}>@{profile.usernamePublic}</Text>
          )}
          {!!profile.emailLower && (
            <Text style={styles.email}>{profile.emailLower}</Text>
          )}
          {!!profile.bioPublic && (
            <Text numberOfLines={4} style={styles.bio}>
              {profile.bioPublic}
            </Text>
          )}
        </View>

        {/* Interests (chips) */}
        {(profile.topCategoriesPublic?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.chips}>
              {profile.topCategoriesPublic!.map((tag, i) => (
                <View key={`${tag}-${i}`} style={styles.chip}>
                  <Text style={styles.chipText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Read-only note */}
        <View style={[styles.section, { marginTop: 8 }]}>
          <View style={styles.infoBanner}>
            <Ionicons name="lock-closed-outline" size={18} color="#F5A623" />
            <Text style={styles.infoBannerText}>
              This is a view-only profile. Likes and collections are private unless your
              friend makes them public.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FriendProfile;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  content: { padding: 16, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { color: '#FFF', fontSize: 18, fontWeight: '600' },

  headerCard: {
    backgroundColor: '#1B1F24',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: { width: 110, height: 110, borderRadius: 55, marginBottom: 12 },
  name: { color: '#FFF', fontSize: 22, fontWeight: '700' },
  username: { color: '#AAA', fontSize: 16, marginTop: 2 },
  email: { color: '#8A8F98', fontSize: 13, marginTop: 4 },
  bio: {
    color: '#CFCFCF',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },

  section: { marginTop: 12 },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    backgroundColor: '#232933',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { color: '#DADDE1', fontSize: 13 },

  infoBanner: {
    backgroundColor: 'rgba(245,166,35,0.08)',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
  },
  infoBannerText: { color: '#E9E4D6', flex: 1, lineHeight: 18 },

  backPill: {
    marginTop: 12,
    backgroundColor: '#1B1F24',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  backPillText: { color: '#FFF', fontWeight: '600' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#F44336', fontSize: 16 },
});
