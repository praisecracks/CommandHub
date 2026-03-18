import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

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
};

const SafeLinearGradient = ({ children, colors, style, ...props }) => {
  const isAvailable = !!UIManager.getViewManagerConfig?.('ExpoLinearGradient');

  if (isAvailable) {
    try {
      const { LinearGradient } = require('expo-linear-gradient');
      return (
        <LinearGradient colors={colors} style={style} {...props}>
          {children}
        </LinearGradient>
      );
    } catch (e) {}
  }

  return (
    <View style={[{ backgroundColor: colors?.[0] || 'transparent' }, style]} {...props}>
      {children}
    </View>
  );
};

const PROFILE_IMAGES = [
  {
    id: 'first-man',
    uri: require('../../assets/profile-images/FirstMan.jpg'),
    label: 'First Man',
    category: 'man',
  },
  {
    id: 'third-man',
    uri: require('../../assets/profile-images/ThirdMan.jpg'),
    label: 'Third Man',
    category: 'man',
  },
  {
    id: 'first-lady',
    uri: require('../../assets/profile-images/FirstLady.jpg'),
    label: 'First Lady',
    category: 'lady',
  },
  {
    id: 'second-lady',
    uri: require('../../assets/profile-images/SecondLady.jpg'),
    label: 'Second Lady',
    category: 'lady',
  },
  {
    id: 'lady-four',
    uri: require('../../assets/profile-images/LadyFour.jpg'),
    label: 'Lady Four',
    category: 'lady',
  },
];

const CARD_GAP = 14;
const CARD_WIDTH = (width - 52 - CARD_GAP) / 2;

export default function ProfileImagePicker({
  visible,
  onClose,
  onSelect,
  currentImage,
}) {
  const [selectedId, setSelectedId] = useState(currentImage || null);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    if (visible) {
      setSelectedId(currentImage || null);
      setActiveCategory('all');
    }
  }, [visible, currentImage]);

  const filteredImages = useMemo(() => {
    if (activeCategory === 'all') return PROFILE_IMAGES;
    return PROFILE_IMAGES.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  const selectedImage = useMemo(() => {
    return PROFILE_IMAGES.find((img) => img.id === selectedId) || null;
  }, [selectedId]);

  const renderCategoryChip = (label, value, icon) => {
    const isActive = activeCategory === value;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setActiveCategory(value)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 999,
          marginRight: 10,
          backgroundColor: isActive ? COLORS.primarySoft : 'rgba(255,255,255,0.04)',
          borderWidth: 1,
          borderColor: isActive ? 'rgba(110,168,254,0.24)' : COLORS.border,
        }}
      >
        <Ionicons
          name={icon}
          size={14}
          color={isActive ? COLORS.primary : COLORS.textSoft}
          style={{ marginRight: 6 }}
        />
        <Text
          style={{
            color: isActive ? COLORS.primary : COLORS.textMuted,
            fontSize: 13,
            fontWeight: '700',
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedId === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => setSelectedId(item.id)}
        style={{
          width: CARD_WIDTH,
          marginBottom: 16,
        }}
      >
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: 22,
            borderWidth: 1,
            borderColor: isSelected ? 'rgba(110,168,254,0.26)' : COLORS.border,
            padding: 12,
          }}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: 108,
                height: 108,
                borderRadius: 54,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: isSelected
                  ? 'rgba(110,168,254,0.10)'
                  : 'rgba(255,255,255,0.03)',
              }}
            >
              <Image
                source={item.uri}
                resizeMode="cover"
                style={{
                  width: 98,
                  height: 98,
                  borderRadius: 49,
                }}
              />
            </View>

            {isSelected && (
              <View
                style={{
                  position: 'absolute',
                  right: 10,
                  bottom: 4,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: COLORS.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: COLORS.surface,
                }}
              >
                <Ionicons name="checkmark" size={15} color={COLORS.bg} />
              </View>
            )}
          </View>

          <Text
            numberOfLines={1}
            style={{
              color: COLORS.text,
              fontSize: 13,
              fontWeight: '700',
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            {item.label}
          </Text>

          <Text
            style={{
              color: COLORS.textSoft,
              fontSize: 11,
              textAlign: 'center',
              marginTop: 4,
              textTransform: 'capitalize',
            }}
          >
            {item.category}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.58)',
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            borderTopWidth: 1,
            borderColor: COLORS.border,
            paddingTop: 14,
            paddingHorizontal: 18,
            paddingBottom: 22,
            maxHeight: '88%',
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

          <SafeLinearGradient
            colors={['rgba(110,168,254,0.14)', 'rgba(18,26,35,0.95)']}
            style={{
              borderRadius: 22,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 21,
                    fontWeight: '800',
                    marginBottom: 5,
                  }}
                >
                  Choose Profile Picture
                </Text>
                <Text
                  style={{
                    color: COLORS.textMuted,
                    fontSize: 13,
                    lineHeight: 19,
                  }}
                >
                  Select a clean identity image that matches the professional look
                  of your workspace.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onClose}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Ionicons name="close" size={21} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </SafeLinearGradient>

          <Text
            style={{
              color: COLORS.textSoft,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 1,
              marginBottom: 10,
            }}
          >
            FILTER
          </Text>

          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            {renderCategoryChip('All', 'all', 'apps-outline')}
            {renderCategoryChip('Men', 'man', 'person-outline')}
            {renderCategoryChip('Ladies', 'lady', 'female-outline')}
          </View>

          <FlatList
            data={filteredImages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 14 }}
          />

          <View
            style={{
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                if (selectedImage) onSelect(selectedImage);
                onClose();
              }}
              disabled={!selectedImage}
              style={{
                backgroundColor: selectedImage
                  ? COLORS.primary
                  : 'rgba(255,255,255,0.07)',
                paddingVertical: 16,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              }}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={selectedImage ? COLORS.bg : COLORS.textSoft}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  color: selectedImage ? COLORS.bg : COLORS.textSoft,
                  fontSize: 15,
                  fontWeight: '800',
                }}
              >
                Confirm Selection
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
