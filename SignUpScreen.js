import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, 
  StatusBar, Animated, Platform, KeyboardAvoidingView, ScrollView, Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'; 
import { auth, db } from './firebaseConfig'; 
import CustomLoader from './components/common/CustomLoader';
import CustomInfoModal from './components/common/CustomInfoModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

  const showInfo = (title, message, type = 'info') => {
    setInfoModal({
      visible: true,
      title,
      message,
      type,
    });
  };

  // --- ANIMATIONS ---
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT * 0.4)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const hubScale = useRef(new Animated.Value(0)).current;
  const lightningAnim = useRef(new Animated.Value(-150)).current; // For the reflection flash

  useEffect(() => {
    // 1. Entrance Animations
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 25, friction: 8, useNativeDriver: true }),
      Animated.spring(hubScale, { toValue: 1, tension: 40, friction: 6, useNativeDriver: true })
    ]).start();

    // 2. Perpetual Lightning Flash Effect
    Animated.loop(
      Animated.timing(lightningAnim, {
        toValue: 300,
        duration: 2500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const handleSignUp = async () => {
    if (!accepted) return showInfo("Wait", "Please agree to the Terms.", "warning");
    if (!firstName || !lastName || !email || !password) return showInfo("Missing Info", "All fields are required.", "warning");
    
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await setDoc(doc(db, "users", user.uid), {
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim().toLowerCase(),
        joinedAt: serverTimestamp(),
        tier: 'Standard',
        status: 'Active'
      });
    } catch (error) {
      showInfo("Signup Error", error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050508' }}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER WITH LIGHTNING REFLECTION HUB */}
      <SafeAreaView edges={['top']} style={{ height: SCREEN_HEIGHT * 0.22, justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{ position: 'absolute', top: 20, left: 25, zIndex: 10 }}
        >
          <Ionicons name="arrow-back" size={28} color="#00D2FF" />
        </TouchableOpacity>
        
        <Animated.View style={{ transform: [{ scale: hubScale }], alignItems: 'center' }}>
          <View style={{ overflow: 'hidden' }}>
            <Text style={{ fontSize: 75, fontWeight: '900', color: 'white', fontStyle: 'italic', letterSpacing: -3 }}>
              HUB
            </Text>
            {/* The Lightning Flash Element */}
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
          <Text style={{ color: '#00D2FF', fontSize: 10, fontWeight: 'bold', letterSpacing: 5, marginTop: -5, opacity: 0.8 }}>
            CREATE ACCOUNT
          </Text>
        </Animated.View>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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
            marginTop: 76
          }}
        >
          {/* Compact Handle */}
          <View style={{ width: 35, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, alignSelf: 'center', marginTop: 10, marginBottom: 20 }} />

          <ScrollView 
            contentContainerStyle={{ paddingHorizontal: 25, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="mb-6">
               <Text style={{ color: 'white', fontSize: 30, fontWeight: '800' }}>Get Started</Text>
               <Text style={{ color: '#6B7280', fontSize: 15, marginTop: 4 }}>Join the network hub today.</Text>
            </View>

            <View style={{ gap: 16 }}>
              {/* Name Group */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput 
                  placeholder="First" 
                  placeholderTextColor="#4B5563" 
                  style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 22, padding: 22, color: 'white', fontSize: 18 }}
                  value={firstName} 
                  onChangeText={setFirstName} 
                />
                <TextInput 
                  placeholder="Last" 
                  placeholderTextColor="#4B5563" 
                  style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 22, padding: 22, color: 'white', fontSize: 18 }}
                  value={lastName} 
                  onChangeText={setLastName} 
                />
              </View>

              {/* Email */}
              <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
                <Ionicons name="mail" size={20} color="#00D2FF" style={{ opacity: 0.8 }} />
                <TextInput 
                  placeholder="Email Address" 
                  placeholderTextColor="#4B5563" 
                  style={{ flex: 1, padding: 22, color: 'white', fontSize: 18 }}
                  value={email} 
                  onChangeText={setEmail}
                  autoCapitalize="none"
                />
              </View>

              {/* Password */}
              <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
                <Ionicons name="lock-closed" size={20} color="#00D2FF" style={{ opacity: 0.8 }} />
                <TextInput 
                  placeholder="Password" 
                  placeholderTextColor="#4B5563" 
                  secureTextEntry={!showPassword}
                  style={{ flex: 1, padding: 22, color: 'white', fontSize: 18 }}
                  value={password} 
                  onChangeText={setPassword} 
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#4B5563" />
                </TouchableOpacity>
              </View>

              {/* Terms Checkbox */}
              <TouchableOpacity 
                onPress={() => setAccepted(!accepted)} 
                style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 5, marginTop: 5 }}
                activeOpacity={0.8}
              >
                <View style={{ 
                  width: 22, height: 22, borderRadius: 7, borderWidth: 2, 
                  borderColor: accepted ? '#00D2FF' : '#374151', 
                  backgroundColor: accepted ? '#00D2FF' : 'transparent', 
                  alignItems: 'center', justifyContent: 'center' 
                }}>
                  {accepted && <Ionicons name="checkmark" size={16} color="black" />}
                </View>
                <Text style={{ color: '#9CA3AF', marginLeft: 12, fontSize: 15 }}>I agree to the <Text style={{ color: '#00D2FF', fontWeight: 'bold' }}>Terms</Text></Text>
              </TouchableOpacity>

              {/* Main Button */}
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
                  elevation: 6
                }}
              >
                {loading ? <CustomLoader type="button" color="black" /> : <Text style={{ color: 'black', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 }}>CREATE ACCOUNT</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ alignItems: 'center', marginTop: 15 }}>
                <Text style={{ color: '#6B7280', fontSize: 14 }}>Already have an account? <Text style={{ color: '#00D2FF', fontWeight: 'bold' }}>Sign In</Text></Text>
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
        onClose={() => setInfoModal(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}