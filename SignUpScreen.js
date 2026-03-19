import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Animated,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import CustomLoader from './components/common/CustomLoader';
import CustomInfoModal from './components/common/CustomInfoModal';
import * as Notifications from 'expo-notifications';
import { Platform as RNPlatform } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const PasswordRule = ({ passed, text }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Ionicons
      name={passed ? 'checkmark-circle' : 'ellipse-outline'}
      size={16}
      color={passed ? '#10B981' : '#6B7280'}
    />
    <Text
      style={{
        color: passed ? '#10B981' : '#9CA3AF',
        fontSize: 12,
        marginLeft: 8,
      }}
    >
      {text}
    </Text>
  </View>
);

export default function SignUpScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT * 0.4)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const hubScale = useRef(new Animated.Value(0)).current;
  const lightningAnim = useRef(new Animated.Value(-150)).current;

  const showInfo = (title, message, type = 'info') => {
    setInfoModal({
      visible: true,
      title,
      message,
      type,
    });
  };

  // ✅ NEW: Function to send welcome notification
  const sendWelcomeNotification = async (userId, userName) => {
    console.log('🔔 Attempting to send welcome notification for:', userName);
    console.log('📱 User ID:', userId);
    
    try {
      const notificationsRef = collection(db, 'users', userId, 'notifications');
      console.log('📁 Notifications reference created');
      
      const docRef = await addDoc(notificationsRef, {
        type: 'welcome',
        title: '🎉 Welcome to CustomHub!',
        body: `Hey ${userName}! We're excited to have you on board. Start by creating your first decision or exploring your dashboard.`,
        read: false,
        createdAt: serverTimestamp(),
        data: {
          userId: userId,
          action: 'welcome',
        },
      });
      
      console.log('✅ Welcome notification created with ID:', docRef.id);
      
      // Schedule a local notification if on native platform
      if (RNPlatform.OS !== 'web') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🎉 Welcome to CustomHub!',
            body: `Hey ${userName}! We're excited to have you on board.`,
            data: { type: 'welcome' },
            sound: true,
          },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,  
          seconds: 2,
        }
        });
        console.log('🔔 Local welcome notification scheduled');
      }
    } catch (error) {
      console.error('❌ Error creating welcome notification:', error);
    }
  };

  // ✅ NEW: Function to create a sample tutorial decision (optional)
  const createTutorialDecision = async (userId, userName) => {
    try {
      const decisionsRef = collection(db, 'users', userId, 'decisions');
      
      // Create a sample decision to help new users understand the app
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await addDoc(decisionsRef, {
        task: 'Welcome to CustomHub!',
        description: `Hi ${userName}! This is your first decision. You can create, edit, and track decisions here. Try creating your own decision by tapping the + button below.`,
        done: false,
        priority: 'medium',
        due: tomorrow.toISOString(),
        createdAt: serverTimestamp(),
        timeSpent: 0,
        recurrence: 'none',
        reminder: null,
      });
      
      console.log('✅ Tutorial decision created for:', userName);
    } catch (error) {
      console.error('Error creating tutorial decision:', error);
    }
  };

  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const passedChecks = Object.values(passwordChecks).filter(Boolean).length;

  const isPasswordValid = () => {
    return Object.values(passwordChecks).every(Boolean);
  };

  const getPasswordStrength = () => {
    if (passedChecks <= 2) {
      return { text: 'Weak', color: '#EF4444', width: '33%' };
    }
    if (passedChecks <= 4) {
      return { text: 'Medium', color: '#F59E0B', width: '66%' };
    }
    return { text: 'Strong', color: '#10B981', width: '100%' };
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 25,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(hubScale, {
        toValue: 1,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.timing(lightningAnim, {
        toValue: 300,
        duration: 2500,
        useNativeDriver: true,
      })
    ).start();
  }, [hubScale, lightningAnim, opacityAnim, slideAnim]);

  const handleSignUp = async () => {
    if (!accepted) {
      return showInfo('Wait', 'Please agree to the Terms.', 'warning');
    }

    if (!firstName || !lastName || !email || !password) {
      return showInfo('Missing Info', 'All fields are required.', 'warning');
    }

    if (!isPasswordValid()) {
      let missingRequirements = [];
      if (!passwordChecks.length) missingRequirements.push('• At least 8 characters');
      if (!passwordChecks.upper) missingRequirements.push('• At least one uppercase letter');
      if (!passwordChecks.lower) missingRequirements.push('• At least one lowercase letter');
      if (!passwordChecks.number) missingRequirements.push('• At least one number');
      if (!passwordChecks.special) missingRequirements.push('• At least one special character');

      return showInfo(
        'Weak Password',
        `Please make sure your password includes:\n${missingRequirements.join('\n')}`,
        'warning'
      );
    }

    setLoading(true);

    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        fullName: fullName,
        email: email.trim().toLowerCase(),
        joinedAt: serverTimestamp(),
        tier: 'Standard',
        status: 'Active',
      });
      
      // ✅ SEND WELCOME NOTIFICATION
      await sendWelcomeNotification(user.uid, firstName.trim());
      
      // ✅ CREATE TUTORIAL DECISION (optional - comment out if you don't want this)
      // await createTutorialDecision(user.uid, firstName.trim());
      
      showInfo('Success', `Welcome ${firstName}! Your account has been created.`, 'success');
      
      // The navigation will be handled by AppNavigator when auth state changes
      
    } catch (error) {
      console.error('Signup error:', error);
      let errorMessage = 'Failed to create account';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already in use';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      }
      showInfo('Signup Error', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050508' }}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView
        edges={['top']}
        style={{
          height: SCREEN_HEIGHT * 0.22,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ position: 'absolute', top: 50, left: 25, zIndex: 10 }}
        >
          <Ionicons name="arrow-back" size={28} color="#00D2FF" />
        </TouchableOpacity>

        <Animated.View
          style={{ transform: [{ scale: hubScale }], alignItems: 'center' }}
        >
          <View style={{ overflow: 'hidden' }}>
            <Text
              style={{
                fontSize: 75,
                fontWeight: '900',
                color: 'white',
                fontStyle: 'italic',
                letterSpacing: -3,
              }}
            >
              HUB
            </Text>
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 50,
                height: '100%',
                backgroundColor: 'rgba(0, 210, 255, 0.4)',
                transform: [{ translateX: lightningAnim }, { skewX: '-25deg' }],
              }}
            />
          </View>
          <Text
            style={{
              color: '#00D2FF',
              fontSize: 10,
              fontWeight: 'bold',
              letterSpacing: 5,
              marginTop: -5,
              opacity: 0.8,
            }}
          >
            CREATE ACCOUNT
          </Text>
        </Animated.View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Animated.View
          style={{
            opacity: opacityAnim,
            transform: [{ translateY: slideAnim }],
            backgroundColor: 'rgba(255, 255, 255, 0.07)',
            borderTopLeftRadius: 45,
            borderTopRightRadius: 45,
            borderWidth: 0,
            borderColor: 'rgba(255,255,255,0.12)',
            marginHorizontal: 10,
            flex: 1,
            paddingTop: 40,
            marginTop: 76,
          }}
        >
          <View
            style={{
              width: 35,
              height: 4,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 10,
              alignSelf: 'center',
              marginTop: 10,
              marginBottom: 20,
            }}
          />

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 25, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  color: 'white',
                  fontSize: 30,
                  fontWeight: '800',
                }}
              >
                Get Started
              </Text>
              <Text
                style={{
                  color: '#6B7280',
                  fontSize: 15,
                  marginTop: 4,
                }}
              >
                Join the network hub today.
              </Text>
            </View>

            <View style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput
                  placeholder="First"
                  placeholderTextColor="#4B5563"
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: 22,
                    padding: 22,
                    color: 'white',
                    fontSize: 18,
                  }}
                  value={firstName}
                  onChangeText={setFirstName}
                />
                <TextInput
                  placeholder="Last"
                  placeholderTextColor="#4B5563"
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: 22,
                    padding: 22,
                    color: 'white',
                    fontSize: 18,
                  }}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>

              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 22,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                }}
              >
                <Ionicons
                  name="mail"
                  size={20}
                  color="#00D2FF"
                  style={{ opacity: 0.8 }}
                />
                <TextInput
                  placeholder="Email Address"
                  placeholderTextColor="#4B5563"
                  style={{
                    flex: 1,
                    padding: 22,
                    color: 'white',
                    fontSize: 18,
                  }}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View>
                <View
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: 22,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    borderWidth: 1,
                    borderColor:
                      password.length > 0
                        ? isPasswordValid()
                          ? 'rgba(16,185,129,0.35)'
                          : 'rgba(245,158,11,0.25)'
                        : 'transparent',
                  }}
                >
                  <Ionicons
                    name="lock-closed"
                    size={20}
                    color="#00D2FF"
                    style={{ opacity: 0.8 }}
                  />
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor="#4B5563"
                    secureTextEntry={!showPassword}
                    style={{
                      flex: 1,
                      padding: 22,
                      color: 'white',
                      fontSize: 18,
                    }}
                    value={password}
                    onChangeText={handlePasswordChange}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#4B5563"
                    />
                  </TouchableOpacity>
                </View>

                {password.length > 0 && (
                  <View
                    style={{
                      marginTop: 12,
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderRadius: 16,
                      padding: 14,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: '#9CA3AF',
                          fontSize: 12,
                          fontWeight: '600',
                        }}
                      >
                        Password strength
                      </Text>
                      <Text
                        style={{
                          color: getPasswordStrength().color,
                          fontSize: 12,
                          fontWeight: '800',
                        }}
                      >
                        {getPasswordStrength().text}
                      </Text>
                    </View>

                    <View
                      style={{
                        height: 6,
                        backgroundColor: '#1F2937',
                        borderRadius: 999,
                        overflow: 'hidden',
                        marginBottom: 14,
                      }}
                    >
                      <View
                        style={{
                          width: getPasswordStrength().width,
                          height: '100%',
                          backgroundColor: getPasswordStrength().color,
                          borderRadius: 999,
                        }}
                      />
                    </View>

                    <View style={{ gap: 8 }}>
                      <PasswordRule
                        passed={passwordChecks.length}
                        text="At least 8 characters"
                      />
                      <PasswordRule
                        passed={passwordChecks.upper}
                        text="One uppercase letter"
                      />
                      <PasswordRule
                        passed={passwordChecks.lower}
                        text="One lowercase letter"
                      />
                      <PasswordRule
                        passed={passwordChecks.number}
                        text="One number"
                      />
                      <PasswordRule
                        passed={passwordChecks.special}
                        text="One special character"
                      />
                    </View>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => setAccepted(!accepted)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingLeft: 5,
                  marginTop: 5,
                }}
                activeOpacity={0.8}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 7,
                    borderWidth: 2,
                    borderColor: accepted ? '#00D2FF' : '#374151',
                    backgroundColor: accepted ? '#00D2FF' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {accepted && <Ionicons name="checkmark" size={16} color="black" />}
                </View>
                <Text style={{ color: '#9CA3AF', marginLeft: 12, fontSize: 15 }}>
                  I agree to the{' '}
                  <Text style={{ color: '#00D2FF', fontWeight: 'bold' }}>Terms</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSignUp}
                disabled={loading || !accepted}
                activeOpacity={0.9}
                style={{
                  backgroundColor: '#00D2FF',
                  paddingVertical: 22,
                  borderRadius: 25,
                  alignItems: 'center',
                  marginTop: 15,
                  opacity: accepted ? 1 : 0.5,
                  shadowColor: '#00D2FF',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.4,
                  shadowRadius: 15,
                  elevation: 6,
                }}
              >
                {loading ? (
                  <CustomLoader type="button" color="black" />
                ) : (
                  <Text
                    style={{
                      color: 'black',
                      fontSize: 18,
                      fontWeight: '900',
                      letterSpacing: 1.5,
                    }}
                  >
                    CREATE ACCOUNT
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={{ alignItems: 'center', marginTop: 15 }}
              >
                <Text style={{ color: '#6B7280', fontSize: 14 }}>
                  Already have an account?{' '}
                  <Text style={{ color: '#00D2FF', fontWeight: 'bold' }}>
                    Sign In
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      <CustomInfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}
