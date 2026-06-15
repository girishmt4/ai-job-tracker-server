import { PrismaClient, ApplicationStatus, WorkModel } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const applications: Array<{
  companyName: string;
  jobTitle: string;
  location: string;
  workModel: WorkModel;
  status: ApplicationStatus;
  daysAgo: number;
  jobUrl?: string;
  salaryExpected?: string;
  notes?: string;
  followUpSent: boolean;
}> = [
  // Week 1 (recent)
  { companyName: 'Stripe', jobTitle: 'Frontend Engineer', location: 'San Francisco, CA', workModel: 'REMOTE', status: 'INTERVIEW_SCHEDULED', daysAgo: 3, salaryExpected: '$160,000', followUpSent: true, jobUrl: 'https://stripe.com/jobs' },
  { companyName: 'Vercel', jobTitle: 'Software Engineer', location: 'Remote', workModel: 'REMOTE', status: 'APPLIED', daysAgo: 2, salaryExpected: '$150,000', followUpSent: false },
  { companyName: 'Linear', jobTitle: 'Full Stack Engineer', location: 'Remote', workModel: 'REMOTE', status: 'APPLIED', daysAgo: 1, followUpSent: false },
  { companyName: 'Figma', jobTitle: 'React Engineer', location: 'New York, NY', workModel: 'HYBRID', status: 'INTERVIEW_SCHEDULED', daysAgo: 4, salaryExpected: '$155,000', followUpSent: true },
  { companyName: 'Notion', jobTitle: 'Frontend Developer', location: 'Remote', workModel: 'REMOTE', status: 'APPLIED', daysAgo: 2, followUpSent: false },

  // Week 2
  { companyName: 'GitHub', jobTitle: 'Software Engineer II', location: 'Remote', workModel: 'REMOTE', status: 'INTERVIEW_DONE', daysAgo: 8, salaryExpected: '$165,000', followUpSent: true, notes: 'Great interview, waiting for feedback' },
  { companyName: 'Shopify', jobTitle: 'Senior Frontend Engineer', location: 'Toronto, Canada', workModel: 'REMOTE', status: 'REJECTED', daysAgo: 10, followUpSent: true, notes: 'Rejected after technical screen' },
  { companyName: 'Atlassian', jobTitle: 'Full Stack Developer', location: 'Sydney, Australia', workModel: 'HYBRID', status: 'APPLIED', daysAgo: 7, salaryExpected: '$140,000', followUpSent: false },
  { companyName: 'Twilio', jobTitle: 'Frontend Engineer', location: 'Remote', workModel: 'REMOTE', status: 'GHOSTED', daysAgo: 9, followUpSent: true, notes: 'No response after applying' },
  { companyName: 'Datadog', jobTitle: 'Software Engineer', location: 'New York, NY', workModel: 'HYBRID', status: 'INTERVIEW_SCHEDULED', daysAgo: 6, salaryExpected: '$170,000', followUpSent: true },

  // Week 3
  { companyName: 'Cloudflare', jobTitle: 'TypeScript Engineer', location: 'Remote', workModel: 'REMOTE', status: 'OFFER_RECEIVED', daysAgo: 14, salaryExpected: '$175,000', followUpSent: true, notes: 'Offer received! Reviewing details.' },
  { companyName: 'HashiCorp', jobTitle: 'Frontend Engineer', location: 'Remote', workModel: 'REMOTE', status: 'REJECTED', daysAgo: 15, followUpSent: true },
  { companyName: 'MongoDB', jobTitle: 'Senior Developer', location: 'New York, NY', workModel: 'HYBRID', status: 'INTERVIEW_DONE', daysAgo: 12, salaryExpected: '$160,000', followUpSent: true, notes: 'Final round completed' },
  { companyName: 'Supabase', jobTitle: 'React Engineer', location: 'Remote', workModel: 'REMOTE', status: 'APPLIED', daysAgo: 11, followUpSent: false },
  { companyName: 'PlanetScale', jobTitle: 'Full Stack Engineer', location: 'Remote', workModel: 'REMOTE', status: 'GHOSTED', daysAgo: 13, followUpSent: true },

  // Week 4
  { companyName: 'Airbnb', jobTitle: 'Frontend Engineer', location: 'San Francisco, CA', workModel: 'HYBRID', status: 'REJECTED', daysAgo: 20, salaryExpected: '$180,000', followUpSent: true },
  { companyName: 'Spotify', jobTitle: 'Web Engineer', location: 'New York, NY', workModel: 'HYBRID', status: 'INTERVIEW_DONE', daysAgo: 18, salaryExpected: '$155,000', followUpSent: true, notes: 'Two rounds done, waiting' },
  { companyName: 'Canva', jobTitle: 'Frontend Developer', location: 'Remote', workModel: 'REMOTE', status: 'APPLIED', daysAgo: 16, followUpSent: false },
  { companyName: 'Loom', jobTitle: 'Software Engineer', location: 'Remote', workModel: 'REMOTE', status: 'GHOSTED', daysAgo: 19, followUpSent: true },
  { companyName: 'Retool', jobTitle: 'Frontend Engineer', location: 'San Francisco, CA', workModel: 'ON_SITE', status: 'REJECTED', daysAgo: 17, salaryExpected: '$160,000', followUpSent: true },

  // Older (day 21-30)
  { companyName: 'Tailwind Labs', jobTitle: 'JavaScript Engineer', location: 'Remote', workModel: 'REMOTE', status: 'APPLIED', daysAgo: 22, followUpSent: false },
  { companyName: 'Prisma', jobTitle: 'Full Stack Engineer', location: 'Remote', workModel: 'REMOTE', status: 'GHOSTED', daysAgo: 25, followUpSent: true },
  { companyName: 'Railway', jobTitle: 'Frontend Engineer', location: 'Remote', workModel: 'REMOTE', status: 'REJECTED', daysAgo: 23, followUpSent: true },
  { companyName: 'Render', jobTitle: 'Software Engineer', location: 'Remote', workModel: 'REMOTE', status: 'INTERVIEW_SCHEDULED', daysAgo: 21, salaryExpected: '$145,000', followUpSent: true },
  { companyName: 'Fly.io', jobTitle: 'TypeScript Developer', location: 'Remote', workModel: 'REMOTE', status: 'APPLIED', daysAgo: 28, followUpSent: false },
  { companyName: 'Planetscale', jobTitle: 'Developer Advocate', location: 'Remote', workModel: 'REMOTE', status: 'REJECTED', daysAgo: 27, followUpSent: true },
  { companyName: 'Deno', jobTitle: 'Frontend Engineer', location: 'Remote', workModel: 'REMOTE', status: 'GHOSTED', daysAgo: 26, followUpSent: true },
  { companyName: 'Bun', jobTitle: 'JavaScript Engineer', location: 'Remote', workModel: 'REMOTE', status: 'APPLIED', daysAgo: 29, followUpSent: false },
  { companyName: 'Val Town', jobTitle: 'Full Stack Engineer', location: 'Remote', workModel: 'REMOTE', status: 'INTERVIEW_DONE', daysAgo: 24, salaryExpected: '$140,000', followUpSent: true },
  { companyName: 'Neon', jobTitle: 'Frontend Developer', location: 'Remote', workModel: 'REMOTE', status: 'OFFER_RECEIVED', daysAgo: 30, salaryExpected: '$150,000', followUpSent: true, notes: 'Second offer received, comparing' },
];

async function main() {
  console.log('Seeding database...');

  const password = await bcrypt.hash('Password123!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@jobmind.dev' },
    update: {},
    create: {
      email: 'demo@jobmind.dev',
      name: 'Demo User',
      password,
    },
  });

  console.log(`Upserted user: ${user.email}`);

  await prisma.application.deleteMany({ where: { userId: user.id } });

  for (const app of applications) {
    await prisma.application.create({
      data: {
        userId: user.id,
        companyName: app.companyName,
        jobTitle: app.jobTitle,
        location: app.location,
        workModel: app.workModel,
        status: app.status,
        dateApplied: daysAgo(app.daysAgo),
        jobUrl: app.jobUrl,
        salaryExpected: app.salaryExpected,
        notes: app.notes,
        followUpSent: app.followUpSent,
        followUpDate: app.followUpSent ? daysAgo(app.daysAgo - 3) : null,
      },
    });
  }

  console.log(`Seeded ${applications.length} applications`);
  console.log('\nDemo credentials:');
  console.log('  Email:    demo@jobmind.dev');
  console.log('  Password: Password123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
