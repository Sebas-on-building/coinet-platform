import { Router } from 'express';
import { signup, login, refresh, logout } from '../controllers/authController';
import { requestPasswordReset, resetPassword } from '../controllers/passwordResetController';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

export default router; 