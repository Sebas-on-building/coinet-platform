import { Router } from 'express';
import * as Controller from '../controllers/BranchProtectionRuleTemplateController';

const router = Router();

router.get('/', Controller.listTemplates);
router.post('/enable', Controller.enableTemplate);
router.post('/disable', Controller.disableTemplate);
router.post('/configure', Controller.configureTemplate);

export default router; 