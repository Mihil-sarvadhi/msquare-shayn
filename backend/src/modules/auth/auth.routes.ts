import { Router } from 'express';
import { loginHandler, logoutHandler, meHandler } from './auth.controller';
import { authenticate } from '@middleware/auth';

const router = Router();

router.post('/login',  loginHandler);
router.post('/logout', logoutHandler);
router.get('/me',      authenticate, meHandler);

export default router;
