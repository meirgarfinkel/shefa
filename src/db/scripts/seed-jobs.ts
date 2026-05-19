import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { DayOfWeek, JobType, WorkArrangement } from "../schema";
import { users } from "../schema/auth";
import { employerProfile, company } from "../schema/employer";
import { seekerProfile } from "../schema/seeker";
import { jobPosting } from "../schema/job";
import { application } from "../schema/application";
import { conversation, message } from "../schema/conversation";

const JOB_DAYS: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI"];

type JobTemplate = {
  title: string;
  description: string;
  jobType: JobType;
  workArrangement: WorkArrangement;
  city: string;
  state: string;
  lat: number;
  lon: number;
  minHourlyRate: number;
  workAuthRequired: boolean;
  whatWeTeach?: string;
  whatWereLookingFor?: string;
};

const COMPANY_ONE_JOBS: JobTemplate[] = [
  {
    title: "Junior Software Developer",
    description:
      "Join our engineering team to build and maintain web applications. You will work alongside senior developers, review code, and gradually take on independent features. No prior professional experience required — we will teach you everything you need to know.",
    jobType: "FULL_TIME",
    workArrangement: "HYBRID",
    city: "New York City",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 22,
    workAuthRequired: true,
    whatWeTeach:
      "Git workflows, code review, React fundamentals, REST APIs, and our internal deployment pipeline.",
    whatWereLookingFor:
      "Eagerness to learn, basic familiarity with any programming language, and a team-first attitude.",
  },
  {
    title: "Customer Support Specialist",
    description:
      "Help our users get the most out of our platform by answering tickets, live chats, and the occasional phone call. You will become a product expert and be the voice between users and our engineering team.",
    jobType: "FULL_TIME",
    workArrangement: "REMOTE",
    city: "New York City",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 18,
    workAuthRequired: true,
    whatWeTeach: "Our product inside and out, de-escalation techniques, and ticketing systems.",
    whatWereLookingFor:
      "Clear written communication, patience, and a genuine desire to help people.",
  },
  {
    title: "QA Tester",
    description:
      "Find bugs before our customers do. You will write test cases, run manual and automated test suites, and file detailed bug reports that help our developers fix issues fast.",
    jobType: "FULL_TIME",
    workArrangement: "HYBRID",
    city: "New York City",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 20,
    workAuthRequired: true,
    whatWeTeach: "Test case design, bug reporting best practices, and our testing toolchain.",
    whatWereLookingFor:
      "Attention to detail, curiosity about how things break, and clear written communication.",
  },
  {
    title: "Data Entry Clerk",
    description:
      "Accurately enter, update, and verify records in our internal systems. This is a great entry point for someone looking to build experience in a tech environment while developing familiarity with data tools.",
    jobType: "PART_TIME",
    workArrangement: "REMOTE",
    city: "New York City",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 17,
    workAuthRequired: false,
    whatWeTeach: "Spreadsheet tools, our data management platform, and data quality standards.",
    whatWereLookingFor: "Accuracy, focus, and the ability to meet daily quotas independently.",
  },
  {
    title: "Office Administrator",
    description:
      "Keep our office running smoothly. You will manage supplies, coordinate scheduling, greet visitors, and support various teams with administrative tasks as we scale.",
    jobType: "FULL_TIME",
    workArrangement: "ON_SITE",
    city: "New York City",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 19,
    workAuthRequired: true,
    whatWeTeach: "Office management systems, internal request tracking, and vendor coordination.",
    whatWereLookingFor:
      "Organization, reliability, and a proactive approach to spotting things that need doing.",
  },
  {
    title: "IT Help Desk Technician",
    description:
      "Be the first line of support for our internal team's tech issues. You will troubleshoot laptops, peripherals, software installs, and network problems, escalating complex issues to our senior IT staff.",
    jobType: "FULL_TIME",
    workArrangement: "ON_SITE",
    city: "New York City",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 21,
    workAuthRequired: true,
    whatWeTeach:
      "Our device management stack, escalation procedures, and internal networking basics.",
    whatWereLookingFor:
      "Comfort with computers, a calm troubleshooting mindset, and strong interpersonal skills.",
  },
  {
    title: "Junior Product Manager",
    description:
      "Work alongside our senior PM to research user needs, write feature specs, and coordinate between design and engineering. You will own small features from kickoff to launch.",
    jobType: "FULL_TIME",
    workArrangement: "HYBRID",
    city: "New York City",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 23,
    workAuthRequired: true,
    whatWeTeach:
      "Product thinking frameworks, sprint ceremonies, roadmap tools, and stakeholder communication.",
    whatWereLookingFor:
      "Structured thinking, empathy for users, and the ability to communicate clearly across teams.",
  },
  {
    title: "Social Media Coordinator",
    description:
      "Create, schedule, and monitor posts across LinkedIn, Twitter, and Instagram. You will report on performance, experiment with formats, and coordinate with our design team on visuals.",
    jobType: "PART_TIME",
    workArrangement: "REMOTE",
    city: "New York City",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 17,
    workAuthRequired: false,
    whatWeTeach: "Our content calendar tools, brand voice guidelines, and analytics reporting.",
    whatWereLookingFor:
      "Creative writing, knowledge of social platforms, and comfort with performance metrics.",
  },
  {
    title: "Accounts Payable Clerk",
    description:
      "Process vendor invoices, reconcile statements, and support month-end close activities. You will work closely with our finance manager and external vendors.",
    jobType: "FULL_TIME",
    workArrangement: "ON_SITE",
    city: "New York City",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 20,
    workAuthRequired: true,
    whatWeTeach:
      "Our accounting software, invoice processing workflow, and reconciliation procedures.",
    whatWereLookingFor:
      "Numeracy, accuracy, and the ability to meet deadlines during month-end crunch.",
  },
  {
    title: "Warehouse Associate",
    description:
      "Receive, sort, and pack inventory in our fulfillment center. You will use handheld scanners, maintain an organized workspace, and collaborate with the logistics team on daily shipments.",
    jobType: "EITHER",
    workArrangement: "ON_SITE",
    city: "New York City",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 18,
    workAuthRequired: false,
    whatWeTeach:
      "Inventory management software, safe lifting techniques, and our fulfillment process.",
    whatWereLookingFor:
      "Physical stamina, reliability, and the ability to work in a fast-paced environment.",
  },
  {
    title: "Delivery Driver",
    description:
      "Pick up and deliver packages and documents within the metro area using a company vehicle. You will plan efficient routes and communicate proactively about any delays.",
    jobType: "EITHER",
    workArrangement: "ON_SITE",
    city: "New York City",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 19,
    workAuthRequired: true,
    whatWeTeach:
      "Route planning apps, vehicle safety protocols, and customer communication standards.",
    whatWereLookingFor: "Valid driver's license, clean driving record, and punctuality.",
  },
  {
    title: "Receptionist",
    description:
      "Be the welcoming face of our office. You will greet visitors, answer and route calls, manage the conference room calendar, and support office administration as needed.",
    jobType: "PART_TIME",
    workArrangement: "ON_SITE",
    city: "New York City",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 17,
    workAuthRequired: true,
    whatWeTeach: "Our phone system, visitor management software, and internal team structure.",
    whatWereLookingFor: "Warmth, professional demeanor, and strong verbal communication.",
  },
  {
    title: "Marketing Assistant",
    description:
      "Support campaign execution across email, paid ads, and events. You will help with copy, coordinate assets with design, track campaign performance, and assist with market research.",
    jobType: "FULL_TIME",
    workArrangement: "HYBRID",
    city: "New York City",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 20,
    workAuthRequired: true,
    whatWeTeach: "Email marketing tools, ad platforms, CRM basics, and reporting dashboards.",
    whatWereLookingFor:
      "Strong writing, curiosity about marketing data, and ability to juggle multiple projects.",
  },
  {
    title: "Operations Coordinator",
    description:
      "Support our COO in running daily operations: tracking project statuses, managing internal workflows, coordinating cross-team communication, and identifying process improvements.",
    jobType: "FULL_TIME",
    workArrangement: "ON_SITE",
    city: "New York City",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 21,
    workAuthRequired: true,
    whatWeTeach:
      "Project management tools, our internal ops playbook, and executive communication.",
    whatWereLookingFor:
      "High organizational ability, follow-through, and comfort navigating ambiguity.",
  },
  {
    title: "Sales Development Representative",
    description:
      "Prospect outbound leads, qualify inbound inquiries, and book discovery calls for our account executives. You will be on the front lines of revenue generation with full coaching support.",
    jobType: "FULL_TIME",
    workArrangement: "HYBRID",
    city: "New York City",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 20,
    workAuthRequired: true,
    whatWeTeach: "Outbound sales techniques, our CRM, objection handling, and product knowledge.",
    whatWereLookingFor: "Resilience, a competitive spirit, and clear verbal communication.",
  },
];

const COMPANY_TWO_JOBS: JobTemplate[] = [
  {
    title: "Retail Sales Associate",
    description:
      "Help shoppers find what they need, keep the floor organized, and contribute to a welcoming store environment. You will receive product training and build strong customer relationships.",
    jobType: "FULL_TIME",
    workArrangement: "ON_SITE",
    city: "Brooklyn",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 17,
    workAuthRequired: false,
    whatWeTeach: "Product knowledge, point-of-sale systems, and customer service standards.",
    whatWereLookingFor: "Friendly attitude, reliability, and comfort working on your feet all day.",
  },
  {
    title: "Cashier",
    description:
      "Process customer transactions accurately and efficiently while delivering excellent checkout experiences. You will handle cash, card payments, and returns.",
    jobType: "PART_TIME",
    workArrangement: "ON_SITE",
    city: "Brooklyn",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 16,
    workAuthRequired: false,
    whatWeTeach: "Our POS system, cash handling procedures, and return policies.",
    whatWereLookingFor:
      "Numerical accuracy, a friendly presence, and the ability to stay calm during busy periods.",
  },
  {
    title: "Stock Associate",
    description:
      "Receive shipments, organize backstock, replenish shelves, and maintain an orderly receiving area. This role is the backbone of a well-run store.",
    jobType: "EITHER",
    workArrangement: "ON_SITE",
    city: "Brooklyn",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 17,
    workAuthRequired: false,
    whatWeTeach: "Inventory scanning systems, stocking best practices, and safety procedures.",
    whatWereLookingFor: "Physical stamina, organization, and a team-first mindset.",
  },
  {
    title: "Store Manager Trainee",
    description:
      "A paid management development program where you will rotate through all store functions — operations, merchandising, HR, and customer service — before stepping into a supervisory role.",
    jobType: "FULL_TIME",
    workArrangement: "ON_SITE",
    city: "Brooklyn",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 22,
    workAuthRequired: true,
    whatWeTeach: "Every aspect of store operations, people management, and P&L basics.",
    whatWereLookingFor:
      "Leadership potential, ownership mindset, and the desire to grow into management.",
  },
  {
    title: "Visual Merchandiser",
    description:
      "Create compelling in-store displays that drive sales and reflect our brand standards. You will set up seasonal features, arrange product, and document visual sets with photos.",
    jobType: "PART_TIME",
    workArrangement: "ON_SITE",
    city: "Brooklyn",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 18,
    workAuthRequired: false,
    whatWeTeach: "Our brand guidelines, planogram execution, and display building techniques.",
    whatWereLookingFor: "An eye for aesthetics, creativity, and comfort with physical setup work.",
  },
  {
    title: "Customer Service Representative",
    description:
      "Handle customer complaints, exchanges, and inquiries at our service desk and over the phone. Your goal is to turn every difficult interaction into a positive impression.",
    jobType: "FULL_TIME",
    workArrangement: "ON_SITE",
    city: "Brooklyn",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 17,
    workAuthRequired: false,
    whatWeTeach: "De-escalation techniques, our return policy, and issue resolution workflows.",
    whatWereLookingFor: "Patience, empathy, and clear communication under pressure.",
  },
  {
    title: "Inventory Specialist",
    description:
      "Conduct cycle counts, investigate shrinkage, and maintain accurate inventory records. You will work closely with the buying team to flag discrepancies and improve accuracy.",
    jobType: "FULL_TIME",
    workArrangement: "ON_SITE",
    city: "Brooklyn",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 19,
    workAuthRequired: false,
    whatWeTeach:
      "Inventory management software, cycle count procedures, and loss prevention basics.",
    whatWereLookingFor: "Extreme attention to detail, comfort with numbers, and reliability.",
  },
  {
    title: "Shift Supervisor",
    description:
      "Lead a team of associates during your shift: open and close the store, resolve escalated customer issues, coach team members, and ensure the floor is always well-staffed.",
    jobType: "FULL_TIME",
    workArrangement: "ON_SITE",
    city: "Brooklyn",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 21,
    workAuthRequired: true,
    whatWeTeach: "Shift management, coaching techniques, and our store operations handbook.",
    whatWereLookingFor: "Prior retail experience, calm under pressure, and natural leadership.",
  },
  {
    title: "Loss Prevention Associate",
    description:
      "Protect store assets by monitoring for theft, reviewing security footage, and working with management on prevention strategies. All investigations must follow company protocols.",
    jobType: "FULL_TIME",
    workArrangement: "ON_SITE",
    city: "Brooklyn",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 20,
    workAuthRequired: true,
    whatWeTeach:
      "Security system operation, incident documentation, and legal compliance in apprehensions.",
    whatWereLookingFor:
      "Observational skills, discretion, and comfort remaining calm in confrontational situations.",
  },
  {
    title: "Delivery and Logistics Associate",
    description:
      "Handle incoming and outgoing deliveries, coordinate with suppliers on timing, and ensure the loading dock is organized and safe. Light driving may be required.",
    jobType: "EITHER",
    workArrangement: "ON_SITE",
    city: "Brooklyn",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 18,
    workAuthRequired: false,
    whatWeTeach: "Receiving workflows, supplier coordination, and safe material handling.",
    whatWereLookingFor: "Physical endurance, organizational skills, and reliability.",
  },
  {
    title: "Cleaning and Maintenance Staff",
    description:
      "Keep our store clean, safe, and welcoming for customers and staff. Duties include floor care, restroom upkeep, and light facility maintenance tasks.",
    jobType: "PART_TIME",
    workArrangement: "ON_SITE",
    city: "Brooklyn",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 16,
    workAuthRequired: false,
    whatWeTeach: "Cleaning product safety, equipment operation, and our sanitation schedule.",
    whatWereLookingFor: "Thoroughness, reliability, and the ability to work independently.",
  },
  {
    title: "Assistant Floor Manager",
    description:
      "Support the floor manager in day-to-day operations: delegate tasks, monitor sales floor coverage, resolve customer issues, and help train new associates.",
    jobType: "FULL_TIME",
    workArrangement: "ON_SITE",
    city: "Brooklyn",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 22,
    workAuthRequired: true,
    whatWeTeach: "Retail management fundamentals, scheduling, and performance coaching.",
    whatWereLookingFor: "Leadership potential, retail experience, and a drive to develop others.",
  },
  {
    title: "Online Order Fulfillment Associate",
    description:
      "Pick, pack, and process online orders for same-day and next-day delivery. You will use handheld devices to locate inventory and meet tight shipping windows.",
    jobType: "FULL_TIME",
    workArrangement: "ON_SITE",
    city: "Brooklyn",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 18,
    workAuthRequired: false,
    whatWeTeach: "Order management systems, packing standards, and shipping carrier procedures.",
    whatWereLookingFor:
      "Speed and accuracy, comfort with technology, and the ability to hit daily fulfillment targets.",
  },
  {
    title: "Beauty Consultant",
    description:
      "Advise customers on skincare, cosmetics, and fragrance. You will provide personalized recommendations, demonstrate products, and build a loyal client base.",
    jobType: "FULL_TIME",
    workArrangement: "ON_SITE",
    city: "Brooklyn",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 18,
    workAuthRequired: false,
    whatWeTeach: "Our full beauty product line, skin type assessment, and consultative selling.",
    whatWereLookingFor:
      "Passion for beauty, strong interpersonal skills, and comfort recommending products.",
  },
  {
    title: "Electronics Sales Associate",
    description:
      "Help customers choose the right electronics for their needs, from TVs to tablets to accessories. You will explain features, process sales, and assist with in-store device setup.",
    jobType: "FULL_TIME",
    workArrangement: "ON_SITE",
    city: "Brooklyn",
    state: "NY",
    lat: 40.6782,
    lon: -73.9442,
    minHourlyRate: 19,
    workAuthRequired: false,
    whatWeTeach:
      "Product specs across our electronics range, sales techniques, and warranty programs.",
    whatWereLookingFor:
      "Tech curiosity, the ability to explain complex features simply, and sales motivation.",
  },
];

const APPLICATION_MESSAGES = [
  "I am very excited about this opportunity and believe I would be a strong fit. I am a fast learner and dedicated to doing excellent work.",
  "This role looks like a great match for my interests and goals. I am available to start immediately and am fully committed to the position.",
  "I have been looking for exactly this kind of opportunity. I bring a positive attitude and genuine enthusiasm for the work.",
  "I would love the chance to learn from your team. I am reliable, punctual, and ready to give everything I have to this role.",
  "Your company's mission really resonates with me. I am confident I can contribute meaningfully once given the chance to get started.",
  "I am eager to prove myself. I may not have formal experience yet but I am a hard worker and a quick study.",
  "This looks like a wonderful place to begin my career. I am very motivated and would not take this opportunity for granted.",
  "I have read everything I can find about your company and I am genuinely excited. Please give me the chance to show what I can do.",
];

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  try {
    console.log("Creating employer user (e1@gmail.com)...");
    const [employer] = await db
      .insert(users)
      .values({ email: "e1@gmail.com", role: "EMPLOYER", isAdult: true, name: "Employer One" })
      .onConflictDoUpdate({
        target: users.email,
        set: { role: "EMPLOYER", isAdult: true, name: "Employer One" },
      })
      .returning({ id: users.id });

    await db
      .insert(employerProfile)
      .values({
        userId: employer.id,
        firstName: "Employer",
        lastName: "One",
        roleAtCompany: "Hiring Manager",
      })
      .onConflictDoNothing();

    console.log("Creating seeker user (s1@gmail.com)...");
    const [seeker] = await db
      .insert(users)
      .values({ email: "s1@gmail.com", role: "SEEKER", isAdult: true, name: "Seeker One" })
      .onConflictDoUpdate({
        target: users.email,
        set: { role: "SEEKER", isAdult: true, name: "Seeker One" },
      })
      .returning({ id: users.id });

    await db
      .insert(seekerProfile)
      .values({
        userId: seeker.id,
        firstName: "Seeker",
        lastName: "One",
        city: "New York City",
        state: "NY",
        workAuthorization: true,
        availableDays: JOB_DAYS,
        jobSeekText:
          "I am an eager, fast learner looking for an opportunity to start my career. I have no formal work experience but I show up on time, follow instructions, and never stop improving.",
        educationLevel: "HIGH_SCHOOL",
        about:
          "Brooklyn native, looking for my first real break. I bring a strong work ethic and a positive attitude to everything I do.",
      })
      .onConflictDoNothing();

    console.log("Creating companies...");
    const [company1] = await db
      .insert(company)
      .values({
        ownerId: employer.id,
        name: "Company One",
        city: "New York City",
        state: "NY",
        industry: "TECHNOLOGY",
        companySize: "SIZE_51_200",
        aboutCompany:
          "Company One builds software tools that help small nonprofits manage their operations. We are a mission-driven team that values learning, inclusion, and getting things done.",
        missionText:
          "Technology should work for every organization, not just the well-funded ones.",
      })
      .onConflictDoUpdate({
        target: [company.ownerId, company.name],
        set: { name: sql`excluded.name` },
      })
      .returning({ id: company.id });

    const [company2] = await db
      .insert(company)
      .values({
        ownerId: employer.id,
        name: "Company Two",
        city: "Brooklyn",
        state: "NY",
        industry: "RETAIL",
        companySize: "SIZE_11_50",
        aboutCompany:
          "Company Two is a neighborhood retail store serving Brooklyn for over 20 years. We carry a wide range of products and pride ourselves on knowing every customer by name.",
        missionText: "Great retail is about relationships, not just transactions.",
      })
      .onConflictDoUpdate({
        target: [company.ownerId, company.name],
        set: { name: sql`excluded.name` },
      })
      .returning({ id: company.id });

    console.log("Cleaning up existing test jobs and conversations...");
    const existingJobs = await db
      .select({ id: jobPosting.id })
      .from(jobPosting)
      .where(inArray(jobPosting.companyId, [company1.id, company2.id]));
    const existingJobIds = existingJobs.map((j) => j.id);

    if (existingJobIds.length > 0) {
      await db.delete(conversation).where(inArray(conversation.jobId, existingJobIds));
      await db.delete(application).where(inArray(application.jobId, existingJobIds));
      await db.delete(jobPosting).where(inArray(jobPosting.id, existingJobIds));
    }

    const freeConvIds = await db
      .select({ id: conversation.id })
      .from(conversation)
      .where(
        and(
          eq(conversation.seekerId, seeker.id),
          eq(conversation.employerId, employer.id),
          isNull(conversation.jobId),
        ),
      );
    if (freeConvIds.length > 0) {
      await db.delete(conversation).where(
        inArray(
          conversation.id,
          freeConvIds.map((c) => c.id),
        ),
      );
    }

    console.log("Creating 15 jobs for Company One...");
    const jobs1 = await db
      .insert(jobPosting)
      .values(
        COMPANY_ONE_JOBS.map((t) => ({
          employerId: employer.id,
          companyId: company1.id,
          title: t.title,
          description: t.description,
          jobType: t.jobType,
          workArrangement: t.workArrangement,
          city: t.city,
          state: t.state,
          lat: t.lat,
          lon: t.lon,
          minHourlyRate: String(t.minHourlyRate),
          workAuthRequired: t.workAuthRequired,
          workDays: JOB_DAYS,
          whatWeTeach: t.whatWeTeach,
          whatWereLookingFor: t.whatWereLookingFor,
          status: "ACTIVE" as const,
        })),
      )
      .returning({ id: jobPosting.id, title: jobPosting.title });

    console.log("Creating 15 jobs for Company Two...");
    const jobs2 = await db
      .insert(jobPosting)
      .values(
        COMPANY_TWO_JOBS.map((t) => ({
          employerId: employer.id,
          companyId: company2.id,
          title: t.title,
          description: t.description,
          jobType: t.jobType,
          workArrangement: t.workArrangement,
          city: t.city,
          state: t.state,
          lat: t.lat,
          lon: t.lon,
          minHourlyRate: String(t.minHourlyRate),
          workAuthRequired: t.workAuthRequired,
          workDays: JOB_DAYS,
          whatWeTeach: t.whatWeTeach,
          whatWereLookingFor: t.whatWereLookingFor,
          status: "ACTIVE" as const,
        })),
      )
      .returning({ id: jobPosting.id, title: jobPosting.title });

    console.log("Creating 8 applications (4 per company)...");
    const appliedJobs = [...jobs1.slice(0, 4), ...jobs2.slice(0, 4)];

    const conversations = await Promise.all(
      appliedJobs.map(async (job, i) => {
        const [app] = await db
          .insert(application)
          .values({
            seekerId: seeker.id,
            jobId: job.id,
            message: APPLICATION_MESSAGES[i],
            status: "SUBMITTED",
          })
          .returning({ id: application.id });

        const now = new Date();
        const preview = `Thanks for applying to ${job.title}! We will be in touch shortly.`;

        const [conv] = await db
          .insert(conversation)
          .values({
            seekerId: seeker.id,
            employerId: employer.id,
            jobId: job.id,
            lastMessageAt: now,
            lastMessagePreview: preview.slice(0, 80),
          })
          .returning({ id: conversation.id });

        await db.insert(message).values({
          conversationId: conv.id,
          senderId: employer.id,
          body: `Hi Seeker, thanks for applying to the ${job.title} role! We have reviewed your application and would love to learn more about you. Are you available for a quick call this week?`,
          createdAt: new Date(now.getTime() - 60 * 60 * 1000),
        });

        await db.insert(message).values({
          conversationId: conv.id,
          senderId: seeker.id,
          body: "Hi! Yes, absolutely — I am very excited about this opportunity. I am available any weekday afternoon this week. Just let me know what time works best for you.",
          createdAt: new Date(now.getTime() - 30 * 60 * 1000),
        });

        await db.insert(message).values({
          conversationId: conv.id,
          senderId: employer.id,
          body: "Great! Let's say Thursday at 2pm. I will send a calendar invite. Looking forward to chatting!",
          createdAt: now,
        });

        await db.update(application).set({ status: "VIEWED" }).where(eq(application.id, app.id));

        return conv;
      }),
    );

    console.log("Creating 1 conversation without a job...");
    const freeConversationTime = new Date();
    const [freeConversation] = await db
      .insert(conversation)
      .values({
        seekerId: seeker.id,
        employerId: employer.id,
        jobId: null,
        lastMessageAt: freeConversationTime,
        lastMessagePreview: "Hey, I just wanted to reach out directly.",
      })
      .returning({ id: conversation.id });

    await db.insert(message).values({
      conversationId: freeConversation.id,
      senderId: seeker.id,
      body: "Hi, I came across your company profile and I am really impressed by your mission. I know I have already applied to a few of your roles, but I just wanted to reach out directly to express how much I would love to work with your team.",
      createdAt: new Date(freeConversationTime.getTime() - 20 * 60 * 1000),
    });

    await db.insert(message).values({
      conversationId: freeConversation.id,
      senderId: employer.id,
      body: "Thanks so much for reaching out! We really appreciate the enthusiasm. Keep an eye on your applications — we will be reviewing them soon.",
      createdAt: freeConversationTime,
    });

    console.log("\n✓ Dev seed complete:");
    console.log(`  Employer: e1@gmail.com (id: ${employer.id})`);
    console.log(`  Seeker:   s1@gmail.com (id: ${seeker.id})`);
    console.log(`  Company One: ${company1.id} — 15 jobs`);
    console.log(`  Company Two: ${company2.id} — 15 jobs`);
    console.log(`  Applications: 8 (4 per company)`);
    console.log(`  Conversations with job: ${conversations.length}`);
    console.log(`  Conversations without job: 1`);
    console.log(`  Messages per job conversation: 3`);
    console.log(`  Messages in free conversation: 2`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
