import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { uploadPDF } from '../middleware/upload.middleware';
import {
  streamResumeTailor,
  streamCoverLetter,
  getInterviewQuestions,
  streamInterviewAnswer,
  analyzeATS,
} from '../controllers/ai.controller';

const router = Router();

router.use(authenticate);

router.post('/resume-tailor', streamResumeTailor);
router.post('/cover-letter', streamCoverLetter);
router.post('/interview-prep', getInterviewQuestions);
router.post('/interview-prep/answer', streamInterviewAnswer);
router.post('/ats-analyzer', uploadPDF, analyzeATS);

export default router;
