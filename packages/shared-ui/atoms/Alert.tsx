import * as AlertNS from '@chakra-ui/react';
import { motion } from 'framer-motion';
import React from 'react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

const typeColor = {
  success: 'green.400',
  error: 'red.400',
  warning: 'yellow.400',
  info: 'blue.400',
};

export const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      style={{ boxShadow: 'var(--chakra-shadows-lg)', borderRadius: 'var(--chakra-radii-xl)', overflow: 'hidden', marginBottom: 16, background: 'white' }}
    >
      <AlertNS.Alert.Root status={type} variant="subtle" colorScheme={type} style={{ alignItems: 'center', borderRadius: 'var(--chakra-radii-xl)', padding: '12px 16px' }}>
        <AlertNS.Alert.Indicator />
        <div style={{ flex: 1 }}>
          <AlertNS.Alert.Title style={{ fontWeight: 'bold', fontSize: '1.125rem', textTransform: 'capitalize' }}>{type}</AlertNS.Alert.Title>
          <AlertNS.Alert.Description style={{ fontSize: '1rem' }}>{message}</AlertNS.Alert.Description>
        </div>
        {onClose && <button onClick={onClose} style={{ marginLeft: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>&times;</button>}
      </AlertNS.Alert.Root>
    </motion.div>
  );
}; 