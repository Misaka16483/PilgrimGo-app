import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import { Colors } from '@/constants/theme';

interface RemoteImageProps {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
}

export function RemoteImage({ uri, style }: RemoteImageProps) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return <View style={[styles.placeholder, style]} />;
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: Colors.surface,
  },
});
