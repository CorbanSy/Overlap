// app/profile/help.jsx (Fixed SafeArea)
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BG = '#0D1117';
const CARD = '#1B1F24';
const BORDER = 'rgba(255,255,255,0.08)';
const ACCENT = '#FFA500';

const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        style={styles.faqHeader}
        activeOpacity={0.8}
      >
        <Text style={styles.faqQ}>{q}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#fff"
        />
      </TouchableOpacity>
      {open && <Text style={styles.faqA}>{a}</Text>}
    </View>
  );
};

export default function Help() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const contactSupport = async () => {
    const email = 'support@overlap.app';
    const subject = encodeURIComponent('Overlap – Support Request');
    const body = encodeURIComponent('Describe your issue here...');
    const url = `mailto:${email}?subject=${subject}&body=${body}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) Linking.openURL(url);
      else Alert.alert('Unable to open mail app.');
    } catch {
      Alert.alert('Unable to open mail app.');
    }
  };

  const reportBug = async () => {
    const email = 'bugs@overlap.app';
    const subject = encodeURIComponent('Overlap – Bug Report');
    const body = encodeURIComponent(
      'What happened?\n\nSteps to reproduce:\n1.\n2.\n3.\n\nExpected result:\n\nActual result:\n\nDevice/OS:\nApp version:\n'
    );
    const url = `mailto:${email}?subject=${subject}&body=${body}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) Linking.openURL(url);
    else Alert.alert('Unable to open mail app.');
  };

  const openDocs = async () => {
    const url = 'https://example.com/overlap/docs'; // replace with your docs/FAQ URL
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) Linking.openURL(url);
  };

  return (
    <View style={styles.safe}>
      <StatusBar backgroundColor={BG} barStyle="light-content" />
      <View style={[styles.safeAreaTop, { height: insets.top }]} />
      
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Get Support</Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={contactSupport} activeOpacity={0.88}>
            <Text style={styles.primaryBtnText}>Contact Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={reportBug} activeOpacity={0.88}>
            <Text style={styles.secondaryBtnText}>Report a Bug</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={openDocs} activeOpacity={0.8}>
            <Text style={styles.linkText}>View Documentation / FAQs</Text>
            <Ionicons name="open-outline" size={18} color="#4dabf7" />
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>FAQs</Text>

          <FAQItem
            q="I can't log in — what should I try?"
            a="Double-check your email and password. If you still can't log in, tap 'Forgot Password' to reset, or contact Support with the email you used to sign up."
          />
          <FAQItem
            q="How do I edit my profile?"
            a="Go to your Profile, tap the settings icon, then choose 'Edit Profile.' You can change your name, username, email, and bio."
          />
          <FAQItem
            q="How do I manage privacy?"
            a="From Profile → Settings → Privacy, you can toggle profile visibility, control who can send friend requests, and manage blocked users."
          />
          <FAQItem
            q="Why can't I see my friend's profile?"
            a="They might have a private profile, or you're no longer friends. Send a friend request, or ask them to check their privacy settings."
          />
        </View>

        {/* App Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>App</Text>
            <Text style={styles.infoVal}>Overlap</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Version</Text>
            <Text style={styles.infoVal}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Build</Text>
            <Text style={styles.infoVal}>100</Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: BG 
  },
  safeAreaTop: {
    backgroundColor: BG,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', letterSpacing: 0.3 },

  scroll: { paddingHorizontal: 16, paddingBottom: 24 },

  card: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTitle: { color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 12 },

  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  primaryBtnText: { color: '#0D1117', fontWeight: '800', fontSize: 16 },

  secondaryBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'transparent',
    marginBottom: 10,
  },
  secondaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  linkText: { color: '#4dabf7', fontWeight: '700', fontSize: 15 },

  faqItem: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingVertical: 10,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQ: { color: '#fff', fontWeight: '700', fontSize: 15 },
  faqA: { color: '#b8b8b8', marginTop: 6, lineHeight: 20, fontSize: 13.5 },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingVertical: 10,
  },
  infoKey: { color: '#b8b8b8' },
  infoVal: { color: '#fff', fontWeight: '700' },
});