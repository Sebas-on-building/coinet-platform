import { Router } from 'express';
import { googleLogin, githubLogin, facebookLogin } from '../../controllers/oauthController';
// import { appleLogin } from '../../controllers/oauthController';

const router = Router();

router.post('/google', googleLogin);
router.post('/github', githubLogin);
router.post('/facebook', facebookLogin);
// router.post('/apple', appleLogin);

export default router; 