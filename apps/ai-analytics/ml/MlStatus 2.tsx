import React from 'react';
import { Card, Badge } from 'shared-ui';
import { motion } from 'framer-motion';

export const MlStatus = ({ status, metrics }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <Card>
      <Badge color={status === 'trained' ? 'blue' : 'gray'}>
        {status.toUpperCase()}
      </Badge>
      <span>ML Model Status</span>
      {metrics && (
        <div>
          <strong>Accuracy:</strong> {metrics.accuracy}
          <br />
          <strong>Loss:</strong> {metrics.loss}
        </div>
      )}
    </Card>
  </motion.div>
);
