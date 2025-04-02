import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import CreateMeetupScreen from '../meetupFolder/create';
import MyMeetupsScreen from '../meetupFolder/MyMeetupsScreen';
import JoinMeetupsScreen from '../meetupFolder/join';
import { getPendingMeetupInvites } from '../utils/storage';

const Meetup = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [showMyMeetups, setShowMyMeetups] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);

  useEffect(() => {
    const fetchInvites = async () => {
      try {
        const invites = await getPendingMeetupInvites();
        setPendingInvites(invites);
      } catch (error) {
        console.error('Error fetching meetup invites:', error);
      }
    };

    fetchInvites();
  }, []);

  if (showCreate) {
    return <CreateMeetupScreen onBack={() => setShowCreate(false)} />;
  }

  if (showMyMeetups) {
    return <MyMeetupsScreen onBack={() => setShowMyMeetups(false)} />;
  }

  if (showJoin) {
    return <JoinMeetupsScreen onBack={() => setShowJoin(false)} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meet Up</Text>

      <View style={styles.buttonContainer}>
        {/* Create Button */}
        <View style={styles.buttonWrapper}>
          <View style={styles.iconWrapper}>
            <Image
              source={require('../../assets/icons/single_meetup.png')}
              style={styles.icon}
            />
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowCreate(true)}
          >
            <Text style={styles.buttonText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Join Button (Updated to use setShowJoin instead of router) */}
        <View style={styles.buttonWrapper}>
          <View style={styles.iconWrapper}>
            <Image
              source={require('../../assets/icons/multiple_meetup.png')}
              style={styles.icon}
            />
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowJoin(true)} // ✅ FIXED: previously used router.push
          >
            <Text style={styles.buttonText}>Join</Text>
            {pendingInvites.length > 0 && (
              <View style={styles.redCircle}>
                <Text style={styles.redCircleText}>{pendingInvites.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* My Meetups Button */}
      <TouchableOpacity
        style={styles.largeButton}
        onPress={() => setShowMyMeetups(true)}
      >
        <Image
          source={require('../../assets/icons/my_meetups.png')}
          style={styles.meetupsIcon}
        />
        <Text style={styles.buttonText}>My Meetups</Text>
      </TouchableOpacity>

      <Text style={styles.infoText}>
        If you have an invite code, press "Join"
      </Text>
    </View>
  );
};

export default Meetup;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D1117',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 50,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  buttonWrapper: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1B1F24',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  button: {
    width: 140,
    height: 60,
    backgroundColor: '#1B1F24',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
    flexDirection: 'row',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  redCircle: {
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  redCircleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  largeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 250,
    height: 80,
    backgroundColor: '#1B1F24',
    borderRadius: 40,
    marginBottom: 30,
  },
  meetupsIcon: {
    width: 30,
    height: 30,
    marginRight: 10,
    resizeMode: 'contain',
  },
  infoText: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
  },
});
