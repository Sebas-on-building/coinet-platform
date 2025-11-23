import { Router } from 'express';
import passport from 'passport';
import { UserService } from '../../services/userService';
import { SessionService } from '../../services/sessionService';
import { TokenService } from '../../services/tokenService';
import { AuditService } from '../../services/auditService';
import { pluginAuthHooks } from '../plugins';

const router = Router();

router.post('/login', UserService.login);
router.post('/register', UserService.register);
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', UserService.googleCallback);
router.get('/auth/apple', passport.authenticate('apple'));
router.get('/auth/apple/callback', UserService.appleCallback);
router.post('/token', TokenService.refreshToken);
router.get('/me', UserService.me);
router.post('/logout', SessionService.logout);

// Plugin auth hooks (for extensibility)
pluginAuthHooks(router);

export default router; 