import { Router } from 'express';
import { UserService } from '../../services/userService';

const router = Router();

router.get('/profile', UserService.getProfile);
router.put('/profile', UserService.updateProfile);
router.post('/change-password', UserService.changePassword);
router.delete('/delete', UserService.deleteAccount);

export default router; 