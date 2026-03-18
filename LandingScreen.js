import React, { useEffect, useRef, useState } from 'react';
import { 
  View, Text, TouchableOpacity, StatusBar, Animated, FlatList, Dimensions, Linking, Easing 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Team Harmony',
    description: 'A dedicated space to organize your staff and simplify daily HR tasks.',
    icon: 'heart-outline'
  },
  {
    id: '2',
    title: 'Privacy First',
    description: 'Your organizational data is protected with professional-grade security.',
    icon: 'shield-checkmark-outline'
  },
  {
    id: '3',
    title: 'Smooth Workflow',
    description: 'Manage payroll and recruitment with a clear, easy-to-use interface.',
    icon: 'leaf-outline'
  }
];

export default function LandingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  
  const glowAnim = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentFade, { toValue: 1, duration: 1200, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 4000,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true
        })
      ])
    ).start();

    const interval = setInterval(() => {
      let nextIndex = (currentIndex + 1) % SLIDES.length;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  const renderSlide = ({ item }) => (
    <View style={{ width: width - 80 }} className="items-center justify-center">
      <View className="w-20 h-20 bg-white/5 rounded-[30px] items-center justify-center mb-8 border border-white/10">
        <Ionicons name={item.icon} size={40} color="#00D2FF" />
      </View>
      <Text className="text-white text-3xl font-bold mb-4 tracking-tight text-center">{item.title}</Text>
      <Text className="text-gray-400 text-center text-lg leading-7 px-4">
        {item.description}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#050508' }}>
      <StatusBar barStyle="light-content" />
      
      <Animated.View 
        style={{
          opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.2] }),
          transform: [
            { scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) },
            { translateY: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -50] }) }
          ]
        }}
        className="absolute top-[15%] left-[-10%] w-[120%] h-[50%] bg-[#00D2FF] rounded-full blur-[80px]"
      />

      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View style={{ opacity: contentFade, flex: 1 }} className="px-10 py-8 justify-between">
          
          {/* 1. TOP: LOGO */}
          <View className="mt-4 flex-row items-center justify-between">
            <View>
              <Text className="text-white text-xl font-light tracking-[3px]">
                WORK<Text className="font-bold text-[#00D2FF]">HUB</Text>
              </Text>
              <View className="h-[2px] w-6 bg-[#00D2FF] mt-1" />
            </View>
            <Ionicons name="apps-outline" size={20} color="#4B5563" />
          </View>

          {/* 2. CENTER: CAROUSEL */}
          <View className="h-80">
            <FlatList
              ref={flatListRef}
              data={SLIDES}
              renderItem={renderSlide}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / (width - 80));
                setCurrentIndex(index);
              }}
            />
            <View className="flex-row justify-center mt-12 gap-x-3">
              {SLIDES.map((_, i) => (
                <View 
                  key={i} 
                  className={`h-1 rounded-full ${currentIndex === i ? 'w-10 bg-[#00D2FF]' : 'w-2 bg-gray-800'}`} 
                />
              ))}
            </View>
          </View>

          {/* 3. BOTTOM: UPDATED ACTIONS */}
          <View className="gap-y-4">
            <TouchableOpacity 
              onPress={() => navigation.navigate('Login')} 
              activeOpacity={0.8}
              className="bg-[#00D2FF] py-5 rounded-[22px] items-center shadow-xl shadow-[#00D2FF]/30"
            >
              <Text className="text-black font-bold text-lg uppercase tracking-widest">Sign In to Hub</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('SignUp')} 
              activeOpacity={0.7}
              className="bg-white/5 border border-white/10 py-5 rounded-[22px] items-center"
            >
              <Text className="text-white font-bold text-lg uppercase tracking-widest">Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => Linking.openURL('https://your-domain.com/app.apk')}
              className="py-2 items-center"
            >
              <View className="flex-row items-center">
                <Ionicons name="cloud-download-outline" size={16} color="#6B7280" />
                <Text className="text-gray-500 font-medium text-sm ml-2">Download Offline Copy</Text>
              </View>
            </TouchableOpacity>
            
            <View className="items-center mt-2">
              <Text className="text-gray-800 text-[10px] font-bold uppercase tracking-[4px]">
                Secure HR Environment
              </Text>
            </View>
          </View>

        </Animated.View>
      </SafeAreaView>
    </View>
  );
}