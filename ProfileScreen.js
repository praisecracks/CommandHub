import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Modal,
  TextInput,
  TouchableOpacity,
  Text,
  Dimensions,
  Share,
  StatusBar,
  Image,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { auth, db } from './firebaseConfig';
import { updateProfile, sendEmailVerification } from 'firebase/auth';
import {
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import ProfileHeader from './components/profile/ProfileHeader';
import ProfileImagePicker from './components/profile/ProfileImagePicker';
import CustomLoader from './components/common/CustomLoader';
import CustomConfirmModal from './components/common/CustomConfirmModal';
import CustomInfoModal from './components/common/CustomInfoModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PROFILE_IMAGE_MAP = {
  'first-man': require('./assets/profile-images/FirstMan.jpg'),
  'third-man': require('./assets/profile-images/ThirdMan.jpg'),
  'first-lady': require('./assets/profile-images/FirstLady.jpg'),
  'second-lady': require('./assets/profile-images/SecondLady.jpg'),
  'lady-four': require('./assets/profile-images/LadyFour.jpg'),
};

const COLORS = {
  bg: '#0B1118',
  surface: '#121A23',
  surfaceSoft: '#16202B',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.12)',
  text: '#F3F6FA',
  textMuted: '#A7B4C2',
  textSoft: '#7F8C99',
  primary: '#6EA8FE',
  primarySoft: 'rgba(110,168,254,0.12)',
  success: '#30C48D',
  warning: '#F4B860',
  shadow: '#000000',
};

const getClipboard = () => {
  try {
    return require('expo-clipboard');
  } catch (e) {
    console.warn('ExpoClipboard not found');
    return null;
  }
};

export default function ProfileScreen() {
  const navigation = useNavigation();

  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [editingProfile, setEditingProfile] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    email: '',
    bio: '',
  });

  const [showImagePicker, setShowImagePicker] = useState(false);

  const [stats, setStats] = useState({
    decisionsMade: 0,
    completedDecisions: 0,
    totalTimeTracked: '0m',
    tasksDelegated: 0,
    tasksCompleted: 0,
    joinDate: null,
    streak: 0,
  });

  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'default',
    icon: 'help-circle-outline',
    onConfirm: null,
  });

  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  useFocusEffect(
    useCallback(() => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        navigation.replace('Landing');
        return;
      }

      setUser(currentUser);
      loadUserData(currentUser);
    }, [])
  );

  const formatTime = (seconds) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const formatJoinDate = (date) => {
    if (!date) return 'Just joined';
    try {
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 30) return `${diffDays} days ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    } catch (e) {
      return 'Just joined';
    }
  };

  const calculateUserStats = async (uid, data) => {
    try {
      const decisionsRef = collection(db, 'users', uid, 'decisions');
      const decisionsSnapshot = await getDocs(decisionsRef);
      const decisions = decisionsSnapshot.docs.map((d) => d.data());

      const decisionsMade = decisions.length;
      const completedDecisions = decisions.filter((d) => d.done).length;
      const totalTimeTracked = decisions.reduce(
        (acc, d) => acc + (d.timeSpent || 0),
        0
      );

      const delegationsRef = collection(db, 'users', uid, 'delegations');
      const delegationsSnapshot = await getDocs(delegationsRef);
      const delegations = delegationsSnapshot.docs.map((d) => d.data());

      const tasksDelegated = delegations.filter(
        (d) => d.quadrant === 'delegate'
      ).length;
      const tasksCompleted = delegations.filter(
        (d) => d.status === 'completed'
      ).length;

      const lastActive = data.lastActive?.toDate?.() || new Date();
      const today = new Date();

      const lastActiveDate = new Date(lastActive);
      lastActiveDate.setHours(0, 0, 0, 0);

      const todayDate = new Date(today);
      todayDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (todayDate - lastActiveDate) / (1000 * 60 * 60 * 24)
      );

      let streak = 1;
      if (diffDays <= 1) {
        streak = (data.streak || 0) + (diffDays === 0 ? 0 : 1);
      } else {
        streak = 1;
      }

      setStats({
        decisionsMade,
        completedDecisions,
        totalTimeTracked: formatTime(totalTimeTracked),
        tasksDelegated,
        tasksCompleted,
        joinDate: data.createdAt?.toDate?.() || new Date(),
        streak,
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const loadUserData = async (currentUser) => {
    if (!currentUser) return;

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();

        const today = new Date();
        const lastActiveDate = data.lastActive?.toDate?.() || new Date(0);

        if (today.toDateString() !== lastActiveDate.toDateString()) {
          await updateDoc(userDocRef, {
            lastActive: serverTimestamp(),
          });

          const updatedDoc = await getDoc(userDocRef);
          const updatedData = updatedDoc.data();

          setUserData(updatedData);
          setEditData({
            displayName:
              updatedData.displayName ||
              currentUser.displayName ||
              currentUser.email?.split('@')[0] ||
              '',
            email: currentUser.email || '',
            bio: updatedData.bio || '',
          });

          await calculateUserStats(currentUser.uid, updatedData);
        } else {
          setUserData(data);
          setEditData({
            displayName:
              data.displayName ||
              currentUser.displayName ||
              currentUser.email?.split('@')[0] ||
              '',
            email: currentUser.email || '',
            bio: data.bio || '',
          });

          await calculateUserStats(currentUser.uid, data);
        }
      } else {
        const defaultImageId = 'first-man';

        const newUserData = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName:
            currentUser.displayName ||
            currentUser.email?.split('@')[0] ||
            'User',
          photoURL: currentUser.photoURL || null,
          bio: '',
          profileImageId: defaultImageId,
          createdAt: serverTimestamp(),
          lastActive: serverTimestamp(),
          decisions: [],
          delegations: [],
          streak: 1,
        };

        await setDoc(userDocRef, newUserData);
        setUserData(newUserData);

        setEditData({
          displayName: newUserData.displayName,
          email: currentUser.email || '',
          bio: '',
        });

        setStats({
          decisionsMade: 0,
          completedDecisions: 0,
          totalTimeTracked: '0m',
          tasksDelegated: 0,
          tasksCompleted: 0,
          joinDate: new Date(),
          streak: 1,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const showInfo = (title, message, type = 'info') => {
    setInfoModal({
      visible: true,
      title,
      message,
      type,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadUserData(user);
    setRefreshing(false);
  };

  const handleUpdateProfile = async () => {
    const previousUserData = userData;

    try {
      const updatedUserData = {
        ...userData,
        displayName: editData.displayName.trim(),
        bio: editData.bio.trim(),
      };

      setUserData(updatedUserData);
      setEditingProfile(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (editData.displayName.trim() !== user?.displayName) {
        await updateProfile(user, {
          displayName: editData.displayName.trim(),
        });
      }

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: editData.displayName.trim(),
        bio: editData.bio.trim(),
        updatedAt: serverTimestamp(),
      });

      showInfo('Success', 'Profile updated successfully.', 'success');
    } catch (error) {
      setUserData(previousUserData);
      showInfo('Error', 'Failed to update profile. Please try again.', 'error');
    }
  };

  const handleImageSelect = async (image) => {
    try {
      setLoading(true);

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        profileImageId: image.id,
        updatedAt: serverTimestamp(),
      });

      setUserData((prev) => ({
        ...prev,
        profileImageId: image.id,
      }));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showInfo('Success', 'Profile picture updated.', 'success');
    } catch (error) {
      console.error('Error saving profile image:', error);
      showInfo('Error', 'Failed to save profile image.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPhoto = () => {
    setShowImagePicker(true);
  };

  const handleCopyEmail = async () => {
    try {
      const Clipboard = getClipboard();
      if (!Clipboard) {
        showInfo(
          'Notice',
          'Clipboard functionality is not available on this build.',
          'info'
        );
        return;
      }

      await Clipboard.setStringAsync(user?.email || '');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showInfo('Copied', 'Email copied to clipboard.', 'success');
    } catch (error) {
      console.error('Error copying email:', error);
    }
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out my profile on Command Hub.\n\nUser: ${
          userData?.displayName || user?.email
        }`,
        title: 'Share Profile',
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  if (loading) {
    return (
      <CustomLoader
        type="fullscreen"
        message="Accessing profile..."
        subtext="Loading your workspace identity"
        timeout={15000}
        cancelable={true}
        onCancel={() => setLoading(false)}
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {userData?.profileImageId && PROFILE_IMAGE_MAP[userData.profileImageId] && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.06,
          }}
        >
          <Image
            source={PROFILE_IMAGE_MAP[userData.profileImageId]}
            style={{
              width: SCREEN_WIDTH * 1.5,
              height: SCREEN_WIDTH * 1.5,
              borderRadius: SCREEN_WIDTH,
              transform: [{ scale: 1.15 }],
            }}
            blurRadius={18}
            resizeMode="cover"
          />
        </View>
      )}

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 260,
          backgroundColor: 'rgba(110,168,254,0.03)',
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          <ProfileHeader
            user={user}
            userData={userData}
            stats={stats}
            onBack={() => navigation.goBack()}
            onShareProfile={handleShareProfile}
            onUploadPhoto={handleUploadPhoto}
            onCopyEmail={handleCopyEmail}
            onSendVerification={() => sendEmailVerification(user)}
            formatJoinDate={formatJoinDate}
            PROFILE_IMAGE_MAP={PROFILE_IMAGE_MAP}
          />

          <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
            <Text
              style={{
                color: COLORS.textSoft,
                fontSize: 12,
                fontWeight: '700',
                letterSpacing: 1.1,
                marginBottom: 12,
              }}
            >
              PROFILE DETAILS
            </Text>

            <View
              style={{
                backgroundColor: 'rgba(18,26,35,0.92)',
                borderRadius: 22,
                borderWidth: 1,
                borderColor: COLORS.border,
                overflow: 'hidden',
                shadowColor: COLORS.shadow,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 18,
                elevation: 6,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setEditingProfile(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 18,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.border,
                }}
              >
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: COLORS.primarySoft,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 14,
                  }}
                >
                  <Ionicons name="create-outline" size={22} color={COLORS.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: COLORS.textSoft,
                      fontSize: 12,
                      marginBottom: 3,
                    }}
                  >
                    Personal info
                  </Text>
                  <Text
                    style={{
                      color: COLORS.text,
                      fontSize: 15,
                      fontWeight: '600',
                    }}
                  >
                    Edit display name and bio
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.textSoft}
                />
              </TouchableOpacity>

              <View style={{ padding: 18 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    marginBottom: 16,
                  }}
                >
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={COLORS.textMuted}
                    style={{ marginTop: 1, marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: COLORS.textSoft,
                        fontSize: 12,
                        marginBottom: 4,
                      }}
                    >
                      Email
                    </Text>
                    <Text
                      style={{
                        color: COLORS.text,
                        fontSize: 14,
                        lineHeight: 20,
                      }}
                    >
                      {user?.email || 'No email'}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                  }}
                >
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={COLORS.textMuted}
                    style={{ marginTop: 1, marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: COLORS.textSoft,
                        fontSize: 12,
                        marginBottom: 4,
                      }}
                    >
                      Bio
                    </Text>
                    <Text
                      style={{
                        color: userData?.bio ? COLORS.text : COLORS.textSoft,
                        fontSize: 14,
                        lineHeight: 21,
                      }}
                    >
                      {userData?.bio?.trim()
                        ? userData.bio
                        : 'No bio added yet.'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <Text
              style={{
                color: COLORS.textSoft,
                fontSize: 12,
                fontWeight: '700',
                letterSpacing: 1.1,
                marginTop: 24,
                marginBottom: 12,
              }}
            >
              PERFORMANCE OVERVIEW
            </Text>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
              }}
            >
              {[
                {
                  label: 'Decisions',
                  value: stats.decisionsMade,
                  icon: 'document-text-outline',
                  tint: COLORS.primary,
                  bg: 'rgba(110,168,254,0.10)',
                },
                {
                  label: 'Time tracked',
                  value: stats.totalTimeTracked,
                  icon: 'time-outline',
                  tint: '#8C7CF7',
                  bg: 'rgba(140,124,247,0.12)',
                },
                {
                  label: 'Delegated',
                  value: stats.tasksDelegated,
                  icon: 'git-compare-outline',
                  tint: '#F4B860',
                  bg: 'rgba(244,184,96,0.12)',
                },
                {
                  label: 'Completed',
                  value: stats.tasksCompleted,
                  icon: 'checkmark-done-outline',
                  tint: COLORS.success,
                  bg: 'rgba(48,196,141,0.12)',
                },
              ].map((item, index) => (
                <View
                  key={index}
                  style={{
                    width: '48%',
                    backgroundColor: 'rgba(18,26,35,0.92)',
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    padding: 16,
                    marginBottom: 14,
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 13,
                      backgroundColor: item.bg,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 14,
                    }}
                  >
                    <Ionicons name={item.icon} size={20} color={item.tint} />
                  </View>

                  <Text
                    style={{
                      color: COLORS.text,
                      fontSize: 20,
                      fontWeight: '800',
                      marginBottom: 4,
                    }}
                  >
                    {item.value}
                  </Text>

                  <Text
                    style={{
                      color: COLORS.textMuted,
                      fontSize: 12,
                    }}
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={{
                backgroundColor: 'rgba(18,26,35,0.72)',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: COLORS.border,
                paddingVertical: 14,
                paddingHorizontal: 16,
                marginTop: 4,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={COLORS.textMuted}
                style={{ marginRight: 10 }}
              />
              <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
                Workspace profile version 1.0.0
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('Settings')}
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: 22,
          backgroundColor: COLORS.surfaceSoft,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: COLORS.borderStrong,
          paddingVertical: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: COLORS.shadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.24,
          shadowRadius: 16,
          elevation: 7,
        }}
      >
        <Ionicons name="settings-outline" size={19} color={COLORS.text} />
        <Text
          style={{
            color: COLORS.text,
            fontSize: 15,
            fontWeight: '700',
            marginLeft: 10,
            letterSpacing: 0.3,
          }}
        >
          Open Settings
        </Text>
      </TouchableOpacity>

      <ProfileImagePicker
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onSelect={handleImageSelect}
        currentImage={userData?.profileImageId}
      />

      <Modal
        visible={editingProfile}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingProfile(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.58)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 20,
              paddingTop: 14,
              paddingBottom: 26,
              borderTopWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <View
              style={{
                width: 42,
                height: 4,
                borderRadius: 999,
                alignSelf: 'center',
                backgroundColor: 'rgba(255,255,255,0.16)',
                marginBottom: 18,
              }}
            />

            <Text
              style={{
                color: COLORS.text,
                fontSize: 22,
                fontWeight: '800',
                marginBottom: 20,
              }}
            >
              Edit Profile
            </Text>

            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 12,
                fontWeight: '700',
                marginBottom: 8,
                letterSpacing: 0.6,
              }}
            >
              DISPLAY NAME
            </Text>

            <TextInput
              value={editData.displayName}
              onChangeText={(text) =>
                setEditData((prev) => ({ ...prev, displayName: text }))
              }
              placeholder="Your name"
              placeholderTextColor={COLORS.textSoft}
              style={{
                backgroundColor: '#0F151C',
                color: COLORS.text,
                paddingHorizontal: 16,
                paddingVertical: 15,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: COLORS.borderStrong,
                fontSize: 15,
                marginBottom: 18,
              }}
            />

            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 12,
                fontWeight: '700',
                marginBottom: 8,
                letterSpacing: 0.6,
              }}
            >
              BIO
            </Text>

            <TextInput
              value={editData.bio}
              onChangeText={(text) =>
                setEditData((prev) => ({ ...prev, bio: text }))
              }
              placeholder="Tell people a little about yourself"
              placeholderTextColor={COLORS.textSoft}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                backgroundColor: '#0F151C',
                color: COLORS.text,
                paddingHorizontal: 16,
                paddingVertical: 15,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: COLORS.borderStrong,
                fontSize: 15,
                minHeight: 110,
                marginBottom: 22,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setEditingProfile(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#0F151C',
                  borderRadius: 16,
                  paddingVertical: 15,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ color: COLORS.text, fontWeight: '700' }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleUpdateProfile}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.primary,
                  borderRadius: 16,
                  paddingVertical: 15,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#081018', fontWeight: '800' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CustomConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        icon={confirmModal.icon}
        onConfirm={confirmModal.onConfirm}
        onCancel={() =>
          setConfirmModal((prev) => ({
            ...prev,
            visible: false,
          }))
        }
      />

      <CustomInfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() =>
          setInfoModal((prev) => ({
            ...prev,
            visible: false,
          }))
        }
      />
    </SafeAreaView>
  );
}