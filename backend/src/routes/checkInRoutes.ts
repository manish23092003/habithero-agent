import { Router } from 'express';
import { CheckInController } from '../controllers/checkInController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { createCheckInSchema } from '../schemas/index.js';

const router = Router();

router.use(authenticateToken);

router.post('/', validateRequest(createCheckInSchema), CheckInController.create);
router.get('/', CheckInController.getAll);
router.get('/today', CheckInController.getToday);

export default router;

