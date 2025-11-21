import React, { ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';

interface AdaptiveLayoutProps {
  children: ReactNode;
}

export const AdaptiveLayout = ({ children }: AdaptiveLayoutProps) => {
  const { width } = useWindowDimensions();
  return (
    <View style={{
      flexDirection: width > 600 ? 'row' : 'column',
      padding: width > 600 ? 32 : 16,
      gap: width > 600 ? 24 : 12
    }}>
      {children}
    </View>
  );
}; 