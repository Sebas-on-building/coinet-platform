import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { addAlert } from '../../packages/shared-models/portfolio/alertsSlice';

const Notifications = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    const ws = new WebSocket('wss://your-realtime-endpoint');
    ws.onmessage = (event) => {
      const alert = JSON.parse(event.data);
      dispatch(addAlert(alert));
    };
    return () => ws.close();
  }, [dispatch]);
  return null;
};

export default Notifications; 