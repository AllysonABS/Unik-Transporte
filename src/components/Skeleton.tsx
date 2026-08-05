import React, {useEffect, useState} from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';

type Props = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export default function Skeleton({width = '100%', height = 16, borderRadius = 8, style}: Props) {
  const [bright, setBright] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setBright(v => !v), 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <View
      style={[
        s.base,
        {width: width as any, height, borderRadius, opacity: bright ? 0.7 : 0.3},
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={s.card}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={s.cardLines}>
        <Skeleton width="70%" height={14} />
        <Skeleton width="50%" height={12} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  base: {backgroundColor: '#0B1E5A'},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#081544',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#0B1E5A',
    marginBottom: 10,
  },
  cardLines: {flex: 1, gap: 8},
});
