import { Router } from 'express';
import { googleLogin, githubLogin } from '../controllers/oauthController';

const router = Router();

router.post('/google', googleLogin);
router.post('/github', githubLogin);
// Add Apple, Facebook, etc.

export default router; 