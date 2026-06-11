import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getOverview, getByStatus, getTimeline, getResponseRate } from '../controllers/stats.controller';

const router = Router();

router.use(authenticate);

router.get('/overview', getOverview);
router.get('/by-status', getByStatus);
router.get('/timeline', getTimeline);
router.get('/response-rate', getResponseRate);

export default router;
