import { env } from './config/env';
import app from './app';
import { startFollowUpJob } from './jobs/followup.job';

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port} [${env.nodeEnv}]`);
  startFollowUpJob();
});
