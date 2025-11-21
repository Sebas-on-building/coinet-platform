import { Router } from 'express';
import authRouter from '../auth';
import marketRouter from '../market';
import { router as portfolioRouter } from '../portfolio';
// import pluginsRouter from '../plugins';
// Add more feature routers here

const featureRouter = Router();

featureRouter.use('/auth', authRouter);
featureRouter.use('/market', marketRouter);
featureRouter.use('/portfolio', portfolioRouter);
// featureRouter.use('/plugins', pluginsRouter);
// Add more feature routers here

export default featureRouter; 