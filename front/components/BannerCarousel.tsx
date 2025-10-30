import React, { useState } from 'react';
import { View, Image, ScrollView, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_HEIGHT = 140;

const banners = [
  require('../assets/icon.png'),
  require('../assets/splash-icon.png'),
  require('../assets/adaptive-icon.png'),
];

const BannerCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / BANNER_WIDTH);
    setCurrentIndex(index);
  };

  return (
    <View className="mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        pagingEnabled
      >
        {banners.map((img, idx) => (
          <Image
            key={idx}
            source={img}
            className="rounded-2xl mr-3 bg-gray-100"
            style={{ width: BANNER_WIDTH, height: BANNER_HEIGHT }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
      {/* Dots indicadores */}
      <View className="flex-row justify-center items-center mt-2">
        {banners.map((_, idx) => (
          <View
            key={idx}
            className={`h-2 rounded-full mx-1 ${idx === currentIndex ? 'w-6 bg-red-600' : 'w-2 bg-gray-300'}`}
          />
        ))}
      </View>
    </View>
  );
};

export default BannerCarousel;
