import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import {
  listApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
  getFollowUps,
  markFollowUpSent,
} from '../controllers/applications.controller';

const router = Router();

router.use(authenticate);

router.get('/follow-ups', getFollowUps);
router.get('/', listApplications);
router.post(
  '/',
  [
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('jobTitle').trim().notEmpty().withMessage('Job title is required'),
  ],
  createApplication
);
router.get('/:id', getApplication);
router.put('/:id', updateApplication);
router.delete('/:id', deleteApplication);
router.patch('/:id/follow-up', markFollowUpSent);

export default router;
