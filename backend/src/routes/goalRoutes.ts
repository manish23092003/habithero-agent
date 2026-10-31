import { Router } from 'express';
import { GoalController } from '../controllers/goalController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { createGoalSchema, updateGoalSchema } from '../schemas/index.js';

const router = Router();

router.use(authenticateToken);

router.post('/', validateRequest(createGoalSchema), GoalController.create);
router.get('/', GoalController.getAll);
router.get('/:id', GoalController.getById);
router.patch('/:id', validateRequest(updateGoalSchema), GoalController.update);
router.delete('/:id', GoalController.delete);

export default router;

