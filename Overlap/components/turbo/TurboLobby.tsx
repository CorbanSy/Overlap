// components/turbo/TurboLobby.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Image,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';

const COLORS = {
  background: '#0D1117',
  surface: '#1B1F24',
  text: '#FFFFFF',
  textSecondary: '#8B949E',
  textTertiary: '#6E7681',
  accent: '#F5A623',
  success: '#28A745',
  border: '#30363D',
  primary: '#238636',
} as const;

interface Member {
  uid: string;
  joinedAt?: any;
  swipes: number;
  active: boolean;
  displayName?: string;
  avatarUrl?: string | null;  // Changed this line
  email?: string | null;      // Also make email explicitly nullable for consistency
}

interface TurboLobbyProps {
  turboData: any;
  onJoin: () => void;
  onStart: () => void;
  onExit: () => void;
}

const TurboLobby: React.FC<TurboLobbyProps> = ({ 
  turboData, 
  onJoin, 
  onStart, 
  onExit 
}) => {
  const [membersWithProfiles, setMembersWithProfiles] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const auth = getAuth();
  
  useEffect(() => {
    setCurrentUser(auth.currentUser);
  }, [auth.currentUser]);

  useEffect(() => {
    const loadMemberProfiles = async () => {
      if (!turboData.members) {
        setMembersWithProfiles([]);
        setLoadingMembers(false);
        return;
      }

      setLoadingMembers(true);
      const memberIds = Object.keys(turboData.members);
      
      const profilePromises = memberIds.map(async (uid) => {
        const memberData = turboData.members[uid];
        
        try {
          // Try userDirectory first for public profiles
          const userDirRef = doc(db, 'userDirectory', uid);
          const userDirSnap = await getDoc(userDirRef);
          
          if (userDirSnap.exists()) {
            const userData = userDirSnap.data();
            return {
              ...memberData,
              uid,
              displayName: userData.displayName || userData.usernamePublic || 'Unknown User',
              avatarUrl: userData.avatarUrl || null,
              email: userData.emailLower || null,
            };
          }
          
          // Fallback to users collection
          const userRef = doc(db, 'users', uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            return {
              ...memberData,
              uid,
              displayName: userData.displayName || userData.name || 'Unknown User',
              avatarUrl: userData.photoURL || userData.profilePicture || null,
              email: userData.email || null,
            };
          }
          
          return {
            ...memberData,
            uid,
            displayName: 'Unknown User',
            avatarUrl: null,
            email: null,
          };
        } catch (error) {
          console.error('Error fetching profile for', uid, error);
          return {
            ...memberData,
            uid,
            displayName: 'Unknown User',
            avatarUrl: null,
            email: null,
          };
        }
      });

      try {
        const profiles = await Promise.all(profilePromises);
        setMembersWithProfiles(profiles);
      } catch (error) {
        console.error('Error loading member profiles:', error);
        setMembersWithProfiles([]);
      } finally {
        setLoadingMembers(false);
      }
    };

    loadMemberProfiles();
  }, [turboData.members]);

  const memberCount = membersWithProfiles.length;
  const canStart = memberCount >= 3;
  const isUserJoined = currentUser && turboData.members?.[currentUser.uid];
  const isCreator = currentUser && turboData.createdBy === currentUser.uid;

  const renderMember = ({ item }: { item: Member }) => (
    <View style={styles.memberItem}>
      <View style={styles.memberAvatarContainer}>
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            style={styles.memberAvatar}
            onError={() => {
              // Handle image load error by removing the avatarUrl
              setMembersWithProfiles(prev =>
                prev.map(member =>
                  member.uid === item.uid
                    ? { ...member, avatarUrl: null }
                    : member
                )
              );
            }}
          />
        ) : (
          <View style={styles.memberAvatarPlaceholder}>
            <Text style={styles.memberInitial}>
              {(item.displayName || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {isCreator && item.uid === turboData.createdBy && (
          <View style={styles.creatorBadge}>
            <Ionicons name="star" size={12} color={COLORS.background} />
          </View>
        )}
      </View>
      <Text style={styles.memberName} numberOfLines={2}>
        {item.displayName || 'Unknown User'}
      </Text>
      {item.uid === currentUser?.uid && (
        <Text style={styles.youLabel}>You</Text>
      )}
    </View>
  );

  const renderEmptyMembers = () => (
    <View style={styles.emptyMembers}>
      <Ionicons name="people-outline" size={48} color={COLORS.textTertiary} />
      <Text style={styles.emptyText}>No participants yet</Text>
      <Text style={styles.emptySubtext}>Be the first to join!</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.exitButton} onPress={onExit}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Turbo Mode</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="flash" size={28} color={COLORS.accent} />
          <Text style={styles.infoTitle}>2-Minute Decision</Text>
        </View>
        <Text style={styles.infoDescription}>
          Lightning-fast group decisions in 2 minutes or less! Everyone swipes simultaneously, then we vote on the top 2 options.
        </Text>
        <View style={styles.infoStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{turboData.minSwipesPerPerson}</Text>
            <Text style={styles.statLabel}>Min Swipes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>120s</Text>
            <Text style={styles.statLabel}>Max Sprint</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{turboData.deathmatchDuration}s</Text>
            <Text style={styles.statLabel}>Final Vote</Text>
          </View>
        </View>
      </View>

      {/* Members Section */}
      <View style={styles.membersSection}>
        <View style={styles.membersHeader}>
          <Text style={styles.membersTitle}>
            Participants ({memberCount})
          </Text>
          <View style={styles.statusContainer}>
            {canStart ? (
              <View style={styles.readyStatus}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.readyText}>Ready to start</Text>
              </View>
            ) : (
              <View style={styles.waitingStatus}>
                <Text style={styles.waitingText}>
                  Need {3 - memberCount} more
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.membersContainer}>
          {loadingMembers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.accent} />
              <Text style={styles.loadingText}>Loading participants...</Text>
            </View>
          ) : memberCount > 0 ? (
            <FlatList
              data={membersWithProfiles}
              renderItem={renderMember}
              keyExtractor={(item) => item.uid}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.membersList}
            />
          ) : (
            renderEmptyMembers()
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {!isUserJoined ? (
          <TouchableOpacity 
            style={styles.joinButton} 
            onPress={onJoin}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={20} color={COLORS.background} />
            <Text style={styles.joinButtonText}>I'm In</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.joinedIndicator}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.joinedText}>You're in!</Text>
          </View>
        )}

        {isCreator && (
          <TouchableOpacity 
            style={[styles.startButton, !canStart && styles.disabledButton]} 
            onPress={onStart}
            disabled={!canStart}
            activeOpacity={canStart ? 0.8 : 1}
          >
            <Ionicons 
              name="play" 
              size={20} 
              color={canStart ? COLORS.background : COLORS.textSecondary} 
            />
            <Text style={[
              styles.startButtonText, 
              !canStart && styles.disabledButtonText
            ]}>
              Start Session
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>How it works:</Text>
        <Text style={styles.instructionStep}>1. Everyone joins and swipes on activities</Text>
        <Text style={styles.instructionStep}>2. Top 2 activities advance to final vote</Text>
        <Text style={styles.instructionStep}>3. First option to get majority wins!</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 24,
  },
  exitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  placeholder: {
    width: 40,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  infoDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  infoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  membersSection: {
    flex: 1,
    marginBottom: 24,
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  membersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(40, 167, 69, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  readyText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  waitingStatus: {
    backgroundColor: 'rgba(245, 166, 35, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  waitingText: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
  },
  membersContainer: {
    minHeight: 120,
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  membersList: {
    gap: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  memberItem: {
    alignItems: 'center',
    gap: 8,
    width: 80,
  },
  memberAvatarContainer: {
    position: 'relative',
  },
  memberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  memberAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  memberInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.background,
  },
  creatorBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  memberName: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
    maxWidth: 76,
  },
  youLabel: {
    fontSize: 10,
    color: COLORS.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyMembers: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textTertiary,
  },
  actions: {
    gap: 12,
    paddingBottom: 20,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.background,
  },
  joinedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(40, 167, 69, 0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  joinedText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.success,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.background,
  },
  disabledButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledButtonText: {
    color: COLORS.textSecondary,
  },
  instructions: {
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.3)',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 8,
  },
  instructionStep: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
});

export default TurboLobby;