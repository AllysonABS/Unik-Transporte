import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from './Icon';
import {Colors} from '../theme/colors';

type Props = {
  icon?: string;
  title: string;
  subtitle?: string;
};

export default function EmptyState({icon = 'inbox', title, subtitle}: Props) {
  return (
    <View style={s.container} accessibilityRole="text" accessibilityLabel={title}>
      <View style={s.iconWrap}>
        <Icon name={icon} size={40} color={Colors.gray} />
      </View>
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: {alignItems: 'center', paddingVertical: 60},
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#102255',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E3A6B',
  },
  title: {fontSize: 16, fontWeight: '600', color: Colors.clareza, textAlign: 'center'},
  subtitle: {fontSize: 13, color: Colors.gray, marginTop: 6, textAlign: 'center', maxWidth: 260},
});
