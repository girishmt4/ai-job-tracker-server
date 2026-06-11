import cron from 'node-cron';
import { prisma } from '../lib/prisma';

export function startFollowUpJob(): void {
  cron.schedule('0 9 * * *', async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const count = await prisma.application.count({
      where: {
        status: 'APPLIED',
        dateApplied: { lte: sevenDaysAgo },
        followUpSent: false,
      },
    });

    if (count > 0) {
      console.log(`[follow-up job] ${count} application(s) need follow-up`);
    }
  });
}
