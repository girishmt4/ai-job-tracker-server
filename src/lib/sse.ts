import { Response } from 'express';

export function initSSE(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}

export function sendChunk(res: Response, content: string): void {
  res.write(`data: ${JSON.stringify({ content })}\n\n`);
}

export function sendDone(res: Response): void {
  res.write('data: [DONE]\n\n');
  res.end();
}

export function sendError(res: Response, message: string): void {
  res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
  res.end();
}
