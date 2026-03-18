import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';

const PROFILE_IMAGE_MAP = {
  'first-man': require('../../assets/profile-images/FirstMan.jpg'),
  'third-man': require('../../assets/profile-images/ThirdMan.jpg'),
  'first-lady': require('../../assets/profile-images/FirstLady.jpg'),
  'second-lady': require('../../assets/profile-images/SecondLady.jpg'),
  'lady-four': require('../../assets/profile-images/LadyFour.jpg'),
};

const COLORS = {
  surface: '#121A23',
  border: 'rgba(255,255,255,0.07)',
  text: '#F3F6FA',
  textMuted: '#A7B4C2',
  primary: '#6EA8FE',
  danger: '#EF4444',
};

const buildFallbackEventKey = (item) => {
  return [
    item.type || 'notification',
    item.title || '',
    item.body || '',
    item.data?.taskId || '',
    item.data?.decisionId || '',
    item.data?.commentId || '',
    item.data?.followUpId || '',
    item.recipientUid || '',
  ].join('__');
};

const dedupeNotifications = (items) => {
  const map = new Map();

  for (const item of items) {
    // very important: ignore deleted notifications
    if (item.deleted) continue;

    const dedupeKey = item.eventKey || buildFallbackEventKey(item);
    const existing = map.get(dedupeKey);

    if (!existing) {
      map.set(dedupeKey, item);
      continue;
    }

    const existingTime = existing.createdAt?.getTime?.() || 0;
    const currentTime = item.createdAt?.getTime?.() || 0;

    if (currentTime > existingTime) {
      map.set(dedupeKey, item);
    }
  }

  return Array.from(map.values());
};

const HubNavbar = ({ onPressProfile, onPressNotifications }) => {
  const [userName, setUserName] = useState('User');
  const [profileImage, setProfileImage] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);

    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        if (data.displayName) {
          setUserName(data.displayName.split(' ')[0]);
        } else if (user.displayName) {
          setUserName(user.displayName.split(' ')[0]);
        } else if (user.email) {
          setUserName(user.email.split('@')[0]);
        } else {
          setUserName('User');
        }

        if (data.profileImageId && PROFILE_IMAGE_MAP[data.profileImageId]) {
          setProfileImage(PROFILE_IMAGE_MAP[data.profileImageId]);
        } else if (user.photoURL) {
          setProfileImage({ uri: user.photoURL });
        } else {
          const name = data.displayName || user.displayName || user.email || 'User';
          setProfileImage({
            uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
              name
            )}&background=6EA8FE&color=fff&length=1&rounded=true`,
          });
        }
      } else {
        if (user.displayName) {
          setUserName(user.displayName.split(' ')[0]);
        } else if (user.email) {
          setUserName(user.email.split('@')[0]);
        } else {
          setUserName('User');
        }

        if (user.photoURL) {
          setProfileImage({ uri: user.photoURL });
        } else {
          const name = user.displayName || user.email || 'User';
          setProfileImage({
            uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
              name
            )}&background=6EA8FE&color=fff&length=1&rounded=true`,
          });
        }
      }
    });

    const notificationsRef = collection(db, 'users', user.uid, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      orderBy('createdAt', 'desc'),
      limit(300)
    );

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const rawNotifications = snapshot.docs.map((itemDoc) => {
        const data = itemDoc.data();

        return {
          id: itemDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(0),
        };
      });

      const cleanedNotifications = dedupeNotifications(rawNotifications);

      // badge should show unread notifications only
      const unreadVisibleCount = cleanedNotifications.filter(
        (item) => item.read !== true
      ).length;

      setUnreadCount(unreadVisibleCount);
    });

    return () => {
      unsubscribeUser();
      unsubscribeNotifications();
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      }}
    >
      <View>
        <Text
          style={{
            color: COLORS.textMuted,
            fontSize: 13,
            fontWeight: '600',
          }}
        >
          {getGreeting()}
        </Text>

        <Text
          style={{
            color: COLORS.text,
            fontSize: 26,
            fontWeight: '800',
          }}
        >
          {userName}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={onPressNotifications}
          style={{
            width: 44,
            height: 44,
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color={COLORS.text}
          />

          {unreadCount > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                minWidth: 18,
                height: 18,
                backgroundColor: COLORS.danger,
                borderRadius: 9,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
              }}
            >
              <Text
                style={{
                  color: '#FFF',
                  fontSize: 10,
                  fontWeight: '700',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onPressProfile}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: COLORS.border,
            backgroundColor: COLORS.surface,
          }}
        >
          {profileImage && (
            <Image
              source={profileImage}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HubNavbar;