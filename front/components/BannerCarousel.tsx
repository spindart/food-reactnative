import React from 'react';
import { View, Image, ScrollView, StyleSheet } from 'react-native';

const banners = [
  require('../assets/icon.png'),
  require('../assets/splash-icon.png'),
  require('../assets/adaptive-icon.png'),
];

const BannerCarousel: React.FC = () => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {banners.map((img, idx) => (
        <Image key={idx} source={img} style={styles.banner} resizeMode="cover" />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 16,
    paddingLeft: 8,
  },
  banner: {
    width: 320,
    height: 120,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#f6f6f6',
  },
});

export default BannerCarousel;
