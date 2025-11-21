import { Router } from 'express';
import * as BranchController from '../controllers/BranchController';

const router = Router();

router.get('/', BranchController.getBranches);
router.post('/', BranchController.createBranch);
router.patch('/:id', BranchController.updateBranch);
router.delete('/:id', BranchController.deleteBranch);
router.post('/:id/merge', BranchController.mergeBranch);
router.post('/:id/protect', BranchController.protectBranch);
router.get('/:id/history', BranchController.getBranchHistory);
router.get('/:id/analytics', BranchController.getBranchAnalytics);
router.post('/:id/ai-suggest', BranchController.aiSuggestBranch);

export default router; 