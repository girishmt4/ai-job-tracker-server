import { Request, Response } from 'express';
import pdfParse from 'pdf-parse';
import { openai } from '../config/openai';
import { env } from '../config/env';
import { initSSE, sendChunk, sendDone, sendError } from '../lib/sse';
import { asyncHandler } from '../utils/asyncHandler';

export const streamResumeTailor = async (req: Request, res: Response): Promise<void> => {
  const { jobDescription, currentSummary } = req.body as {
    jobDescription: string;
    currentSummary: string;
  };

  initSSE(res);

  try {
    const stream = await openai.chat.completions.create({
      model: env.openaiModel,
      messages: [
        {
          role: 'system',
          content: `You are an expert resume writer with deep knowledge of ATS systems and what hiring managers in European tech companies look for. Write a tailored resume summary that naturally incorporates the most important keywords from the job description while accurately representing the candidate's experience. Write in first person. Keep it to 3-4 sentences. Be specific and concrete. Never exaggerate or claim skills the candidate does not have.`,
        },
        {
          role: 'user',
          content: `Job Description:\n${jobDescription}\n\nCurrent Summary:\n${currentSummary}\n\nWrite a tailored resume summary for this specific role.`,
        },
      ],
      stream: true,
      max_tokens: 300,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) sendChunk(res, content);
    }
    sendDone(res);
  } catch {
    sendError(res, 'Failed to generate resume summary');
  }
};

export const streamCoverLetter = async (req: Request, res: Response): Promise<void> => {
  const { jobDescription, applicantName } = req.body as {
    jobDescription: string;
    applicantName?: string;
  };

  initSSE(res);

  try {
    const stream = await openai.chat.completions.create({
      model: env.openaiModel,
      messages: [
        {
          role: 'system',
          content: `You are an expert career coach specializing in European job applications, particularly for the German and Dutch tech markets. Write a concise, professional cover note of 4-5 sentences. Lead with a specific reason why this company or role is interesting. Be direct and factual in the German professional style. Avoid American-style hyperbole. End with a clear call to action.`,
        },
        {
          role: 'user',
          content: `Job Description:\n${jobDescription}\n\n${applicantName ? `Applicant Name: ${applicantName}\n\n` : ''}Write a professional cover letter for this role.`,
        },
      ],
      stream: true,
      max_tokens: 500,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) sendChunk(res, content);
    }
    sendDone(res);
  } catch {
    sendError(res, 'Failed to generate cover letter');
  }
};

export const getInterviewQuestions = asyncHandler(async (req: Request, res: Response) => {
  const { jobDescription } = req.body as { jobDescription: string };

  const completion = await openai.chat.completions.create({
    model: env.openaiModel,
    messages: [
      {
        role: 'system',
        content: `You are a senior technical interviewer at a European software company. Generate realistic interview questions based on the job description. Questions should be specific to the role, not generic. For each question, provide 3-5 key points the candidate should cover. Return ONLY valid JSON, no markdown.`,
      },
      {
        role: 'user',
        content: `Job Description:\n${jobDescription}\n\nReturn questions in this exact JSON format:\n{\n  "questions": {\n    "javascript": [{ "id": "string", "question": "string", "keyPoints": ["string"] }],\n    "react": [...],\n    "systemDesign": [...],\n    "behavioral": [...]\n  }\n}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  });

  const parsed = JSON.parse(completion.choices[0].message.content!);
  res.json(parsed);
});

export const streamInterviewAnswer = async (req: Request, res: Response): Promise<void> => {
  const { question, category, context } = req.body as {
    question: string;
    category: string;
    context?: string;
  };

  initSSE(res);

  try {
    const stream = await openai.chat.completions.create({
      model: env.openaiModel,
      messages: [
        {
          role: 'system',
          content: `You are a senior software engineer helping a candidate prepare for technical interviews. Provide a clear, structured model answer using the STAR method where appropriate. Be specific, include code examples if relevant, and highlight key concepts.`,
        },
        {
          role: 'user',
          content: `${context ? `Job Context:\n${context}\n\n` : ''}Category: ${category}\n\nQuestion: ${question}\n\nProvide a model answer.`,
        },
      ],
      stream: true,
      max_tokens: 800,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) sendChunk(res, content);
    }
    sendDone(res);
  } catch {
    sendError(res, 'Failed to generate answer');
  }
};

export const analyzeATS = asyncHandler(async (req: Request, res: Response) => {
  const { jobDescription } = req.body as { jobDescription: string };
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: 'PDF resume is required' });
    return;
  }

  const pdfData = await pdfParse(file.buffer);
  const resumeText = pdfData.text;

  const completion = await openai.chat.completions.create({
    model: env.openaiModel,
    messages: [
      {
        role: 'system',
        content: `You are an expert ATS (Applicant Tracking System) analyzer and career coach. Analyze the match between a resume and job description with precision. Be honest and specific. Score based on: keyword match (40%), relevant experience (30%), skills alignment (20%), overall presentation (10%). Return ONLY valid JSON, no markdown.`,
      },
      {
        role: 'user',
        content: `Job Description:\n${jobDescription}\n\nResume:\n${resumeText}\n\nReturn analysis in this exact JSON format:\n{\n  "score": number,\n  "grade": "A|B|C|D|F",\n  "summary": "string",\n  "strengths": ["string"],\n  "gaps": ["string"],\n  "suggestions": [{"section": "string", "current": "string", "suggested": "string", "priority": "HIGH|MEDIUM|LOW"}],\n  "keywords": {"found": ["string"], "missing": ["string"]}\n}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  });

  const parsed = JSON.parse(completion.choices[0].message.content!);
  res.json(parsed);
});
