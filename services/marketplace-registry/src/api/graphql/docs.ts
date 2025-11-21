import express from 'express';
import { express as playground } from 'graphql-playground-middleware';

const router = express.Router();

// Custom GraphQL Playground with world-class branding
router.get('/graphql', playground({
  endpoint: '/api/graphql',
  settings: {
    'editor.theme': 'light',
    'editor.fontFamily': "'SF Pro Display', 'Canva Sans', 'Inter', 'Segoe UI', sans-serif",
    'editor.fontSize': 16,
    'general.betaUpdates': false,
    'editor.reuseHeaders': true,
  },
  title: 'Coinet Marketplace GraphQL Playground',
}));

export default router; 