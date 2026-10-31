import { Router } from 'express';
import { TaskController } from '../controllers/taskController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { createTaskSchema, updateTaskSchema } from '../schemas/index.js';

const router = Router();

router.use(authenticateToken);

router.post('/', validateRequest(createTaskSchema), TaskController.create);
router.get('/', TaskController.getAll);
router.get('/today', TaskController.getToday);
router.patch('/:id/complete', TaskController.complete);
router.patch('/:id', validateRequest(updateTaskSchema), TaskController.update);

export default router;

