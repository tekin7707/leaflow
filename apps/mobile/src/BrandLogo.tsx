import { Image } from 'react-native';

declare const require: any;

const wordmark = require('../assets/brand/leaflow-wordmark.png');
const lockup = require('../assets/brand/leaflow-lockup.png');

export function BrandLogo({ variant = 'wordmark', style }: { variant?: 'wordmark' | 'lockup'; style?: any }) {
  return (
    <Image
      source={variant === 'lockup' ? lockup : wordmark}
      resizeMode="contain"
      accessibilityLabel="Leaflow"
      style={style}
    />
  );
}
