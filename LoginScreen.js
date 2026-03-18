import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, 
  StatusBar, Animated, Platform, KeyboardAvoidingView, ScrollView, Dimensions 
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Ensure this is installed
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './firebaseConfig';
import CustomLoader from './components/common/CustomLoader';
import CustomInfoModal from './components/common/CustomInfoModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
  
  // Animations
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT * 0.4)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const lightningAnim = useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    // 1. Check if user wanted to be remembered
    loadCredentials();

    // 2. Entrance & Lightning Animations
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 8, useNativeDriver: true })
    ]).start();

    Animated.loop(
      Animated.timing(lightningAnim, { toValue: 300, duration: 3000, useNativeDriver: true })
    ).start();
  }, []);

  const loadCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('user_email');
      const savedPass = await AsyncStorage.getItem('user_password');
      const rememberStatus = await AsyncStorage.getItem('remember_me');

      if (rememberStatus === 'true' && savedEmail) {
        setEmail(savedEmail);
        setPassword(savedPass || '');
        setRememberMe(true);
      }
    } catch (e) {
      console.log("Error loading credentials", e);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) return showInfo("Wait", "Please enter your email and password.", "warning");
    
    setLoading(true);
    try {
      // Save or Clear credentials based on checkbox
      if (rememberMe) {
        await AsyncStorage.setItem('user_email', email);
        await AsyncStorage.setItem('user_password', password);
        await AsyncStorage.setItem('remember_me', 'true');
      } else {
        await AsyncStorage.removeItem('user_email');
        await AsyncStorage.removeItem('user_password');
        await AsyncStorage.setItem('remember_me', 'false');
      }

      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      showInfo("Login Failed", "Double-check your email or password.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email) return showInfo("Email Required", "Enter your email first.", "warning");
    sendPasswordResetEmail(auth, email)
      .then(() => showInfo("Sent", "Check your inbox for the reset link.", "success"))
      .catch((err) => showInfo("Error", err.message, "error"));
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050508' }}>
      <StatusBar barStyle="light-content" />
      
      {/* Header with Lightning HUB */}
      <View style={{ height: SCREEN_HEIGHT * 0.28, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', top: 50, left: 20, zIndex: 10 }}>
          <Ionicons name="chevron-back" size={30} color="#00D2FF" />
        </TouchableOpacity>
        
        <View style={{ position: 'relative', overflow: 'hidden' }}>
          <Text style={{ color: 'white', fontSize: 72, fontWeight: '900', fontStyle: 'italic', letterSpacing: -3 }}>HUB</Text>
          <Animated.View 
            style={{
              position: 'absolute', top: 0, left: 0, width: 45, height: '100%',
              backgroundColor: 'rgba(0, 210, 255, 0.3)',
              transform: [{ translateX: lightningAnim }, { skewX: '-20deg' }],
            }}
          />
        </View>
        <Text style={{ color: '#00D2FF', fontSize: 10, fontWeight: 'bold', letterSpacing: 5, marginTop: -5 }}>SIGN IN</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Animated.View 
          style={{ 
            opacity: opacityAnim, transform: [{ translateY: slideAnim }],
            flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
            borderTopLeftRadius: 45, borderTopRightRadius: 45,
            borderWidth: 0, borderColor: 'rgba(255,255,255,0.1)',
            marginHorizontal: 8, paddingTop: 10, marginTop: 40
          }}
        >
          <View style={{ width: 35, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, alignSelf: 'center', marginTop: 10, marginBottom: 20 }} />

          <ScrollView contentContainerStyle={{ paddingHorizontal: 30, paddingBottom: 50, marginTop: 20 }} showsVerticalScrollIndicator={false}>
            <Text style={{ color: 'white', fontSize: 28, fontWeight: '800', marginBottom: 25 }}>Welcome Back</Text>

            <View style={{ gap: 16 }}>
              {/* Email */}
              <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 }}>
                <Ionicons name="mail" size={20} color="#00D2FF" />
                <TextInput 
                  placeholder="Email Address" placeholderTextColor="#4B5563"
                  style={{ flex: 1, padding: 22, color: 'white', fontSize: 18 }}
                  value={email} onChangeText={setEmail} autoCapitalize="none"
                />
              </View>

              {/* Password */}
              <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 }}>
                <Ionicons name="lock-closed" size={20} color="#00D2FF" />
                <TextInput 
                  placeholder="Password" placeholderTextColor="#4B5563"
                  secureTextEntry={!showPassword}
                  style={{ flex: 1, padding: 22, color: 'white', fontSize: 18 }}
                  value={password} onChangeText={setPassword} 
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#4B5563" />
                </TouchableOpacity>
              </View>

              {/* Options Row: Remember Me & Forgot Password */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, paddingHorizontal: 5 }}>
                <TouchableOpacity 
                  onPress={() => setRememberMe(!rememberMe)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <View style={{ 
                    width: 20, height: 20, borderRadius: 6, borderWidth: 2, 
                    borderColor: rememberMe ? '#00D2FF' : '#4B5563', 
                    backgroundColor: rememberMe ? '#00D2FF' : 'transparent',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    {rememberMe && <Ionicons name="checkmark" size={14} color="black" />}
                  </View>
                  <Text style={{ color: '#9CA3AF', marginLeft: 10, fontSize: 14 }}>Remember Me</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={{ color: '#00D2FF', fontSize: 14, fontWeight: '600' }}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity 
                onPress={handleLogin} disabled={loading}
                style={{
                  backgroundColor: '#00D2FF', paddingVertical: 22, borderRadius: 25,
                  alignItems: 'center', marginTop: 20, shadowColor: '#00D2FF',
                  shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15
                }}
              >
                {loading ? <CustomLoader type="button" color="black" /> : <Text style={{ color: 'black', fontSize: 18, fontWeight: '900' }}>SIGN IN</Text>}
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ borderSize: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 18, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 }}
                onPress={() => showInfo("Notice", "Social Login coming soon.", "info")}
              >
                <FontAwesome name="google" size={18} color="white" />
                <Text style={{ color: 'white', fontWeight: 'bold', ml: 10 }}> Continue with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={{ alignItems: 'center', marginTop: 15 }}>
                <Text style={{ color: '#6B7280', fontSize: 15 }}>New here? <Text style={{ color: '#00D2FF', fontWeight: 'bold' }}>Create Account</Text></Text>
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