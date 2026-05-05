/**
 * Creates 20 fake job listings for dev/demo purposes.
 * Requires at least one employer profile in the database.
 * Run: npm run seed:jobs
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FAKE_JOBS = [
  {
    title: "Coffee Shop Barista",
    description:
      "Join our friendly neighborhood café team! You'll learn to craft espresso drinks, manage a busy counter, and deliver excellent customer experiences. No experience needed — we'll train you from day one.",
    jobType: "PART_TIME" as const,
    workArrangement: "ON_SITE" as const,
    city: "Brooklyn",
    state: "NY",
    minHourlyRate: 15.5,
    payNotes: "Tips average $4–6/hr on top of base pay",
    workDays: ["MON", "TUE", "WED", "THU", "FRI"] as const,
    scheduleNotes: "Morning shifts 6am–2pm, flexible on days",
    workAuthRequired: true,
    whatWeTeach:
      "Espresso techniques, milk steaming, latte art basics, customer service, cash handling, and inventory management.",
    whatWereLookingFor:
      "Someone who's punctual, friendly, and genuinely excited to learn the craft of coffee.",
  },
  {
    title: "Warehouse Associate",
    description:
      "Fast-paced distribution center looking for reliable team members. You'll receive, sort, and ship packages. Physical work — you'll be on your feet all day. Steady hours and growth opportunities.",
    jobType: "FULL_TIME" as const,
    workArrangement: "ON_SITE" as const,
    city: "Houston",
    state: "TX",
    minHourlyRate: 17.0,
    payNotes: "Overtime available, paid weekly",
    workDays: ["MON", "TUE", "WED", "THU", "FRI"] as const,
    workAuthRequired: true,
    whatWeTeach:
      "Warehouse safety, forklift certification (after 90 days), inventory systems, and shipping procedures.",
    whatWereLookingFor: "Reliable, physically fit, and comfortable with repetitive tasks.",
  },
  {
    title: "Customer Service Representative",
    description:
      "Remote customer support role for a growing e-commerce brand. You'll handle inquiries via chat and email, resolve issues, and delight customers. Full training provided.",
    jobType: "FULL_TIME" as const,
    workArrangement: "REMOTE" as const,
    city: "Los Angeles",
    state: "CA",
    minHourlyRate: 18.0,
    payNotes: "Equipment provided after 30-day probation",
    workDays: ["MON", "TUE", "WED", "THU", "FRI"] as const,
    workAuthRequired: true,
    whatWeTeach:
      "Our product catalog, customer service best practices, de-escalation skills, and our support ticketing system.",
    whatWereLookingFor:
      "Clear communicator who stays calm under pressure and genuinely wants to help people.",
  },
  {
    title: "Line Cook",
    description:
      "Busy neighborhood restaurant needs an enthusiastic line cook. You'll prep ingredients, work the grill and sauté stations, and maintain kitchen cleanliness. Meals included every shift.",
    jobType: "FULL_TIME" as const,
    workArrangement: "ON_SITE" as const,
    city: "Chicago",
    state: "IL",
    minHourlyRate: 16.5,
    payNotes: "Free staff meal every shift",
    workDays: ["TUE", "WED", "THU", "FRI", "SAT"] as const,
    scheduleNotes: "Dinner service 3pm–11pm",
    workAuthRequired: true,
    whatWeTeach:
      "Knife skills, station management, our recipes, kitchen safety, and food handling.",
    whatWereLookingFor: "Someone who thrives in a fast-paced environment and loves food.",
  },
  {
    title: "Office Receptionist",
    description:
      "Small law firm seeks a welcoming receptionist to be the first point of contact for clients. You'll answer phones, manage schedules, and handle basic administrative tasks.",
    jobType: "PART_TIME" as const,
    workArrangement: "ON_SITE" as const,
    city: "Miami",
    state: "FL",
    minHourlyRate: 15.0,
    workDays: ["MON", "TUE", "WED", "THU", "FRI"] as const,
    scheduleNotes: "9am–2pm daily",
    workAuthRequired: true,
    whatWeTeach:
      "Phone etiquette, scheduling software, legal office procedures, and client communication.",
    whatWereLookingFor: "Professional, organized, and friendly with a positive attitude.",
  },
  {
    title: "Delivery Driver",
    description:
      "Local meal prep company needs reliable drivers for lunch route deliveries. You'll use your own vehicle and pick up mileage reimbursement. Great flexible schedule for students or second jobs.",
    jobType: "PART_TIME" as const,
    workArrangement: "ON_SITE" as const,
    city: "New York City",
    state: "NY",
    minHourlyRate: 18.5,
    payNotes: "$0.67/mile reimbursement, mileage tracked via app",
    workDays: ["MON", "TUE", "WED", "THU", "FRI"] as const,
    scheduleNotes: "Routes run 10am–2pm",
    workAuthRequired: true,
    whatWeTeach:
      "Route optimization, customer communication, safe food transport, and our delivery app.",
    whatWereLookingFor: "Valid driver's license, clean record, reliable vehicle.",
  },
  {
    title: "Retail Sales Associate",
    description:
      "Growing clothing boutique looking for a friendly floor associate. Help customers find the right items, maintain displays, process transactions, and contribute to a positive shopping experience.",
    jobType: "PART_TIME" as const,
    workArrangement: "ON_SITE" as const,
    city: "Austin",
    state: "TX",
    minHourlyRate: 14.0,
    payNotes: "30% employee discount on all merchandise",
    workDays: ["THU", "FRI", "SAT", "SUN"] as const,
    workAuthRequired: true,
    whatWeTeach: "Visual merchandising, POS system, sales techniques, and inventory management.",
    whatWereLookingFor: "Fashion-forward, outgoing, and passionate about helping people.",
  },
  {
    title: "Data Entry Clerk",
    description:
      "Healthcare records company needs detail-oriented data entry clerks. Remote role processing patient intake forms. Must be able to type accurately and maintain confidentiality.",
    jobType: "PART_TIME" as const,
    workArrangement: "REMOTE" as const,
    city: "San Diego",
    state: "CA",
    minHourlyRate: 16.0,
    workDays: ["MON", "WED", "FRI"] as const,
    scheduleNotes: "Flexible hours, must complete daily quota",
    workAuthRequired: true,
    whatWeTeach: "HIPAA compliance, our data entry software, and quality review procedures.",
    whatWereLookingFor: "High accuracy typist (40+ WPM), detail-oriented, and trustworthy.",
  },
  {
    title: "Dishwasher / Kitchen Porter",
    description:
      "Upscale casual restaurant needs a dependable dishwasher and kitchen support person. Steady hours, friendly team, and opportunity to learn cooking if you're interested.",
    jobType: "FULL_TIME" as const,
    workArrangement: "ON_SITE" as const,
    city: "Orlando",
    state: "FL",
    minHourlyRate: 14.5,
    payNotes: "Free shift meals, tip share from servers",
    workDays: ["WED", "THU", "FRI", "SAT", "SUN"] as const,
    scheduleNotes: "Evening shift 4pm–midnight",
    workAuthRequired: false,
    whatWeTeach: "Commercial dishwashing systems, kitchen sanitation, and food safety basics.",
    whatWereLookingFor: "Hard worker who shows up on time and takes pride in keeping things clean.",
  },
  {
    title: "Landscaping / Groundskeeping Crew",
    description:
      "Residential landscaping company expanding its crew. Outdoor work maintaining lawns, gardens, and outdoor spaces. Physical job with lots of fresh air. No experience necessary.",
    jobType: "FULL_TIME" as const,
    workArrangement: "ON_SITE" as const,
    city: "Atlanta",
    state: "GA",
    minHourlyRate: 15.5,
    payNotes: "Tools and equipment provided",
    workDays: ["MON", "TUE", "WED", "THU", "FRI"] as const,
    scheduleNotes: "6am start, weather permitting",
    workAuthRequired: false,
    whatWeTeach: "Lawn maintenance, plant care, equipment operation, and landscape design basics.",
    whatWereLookingFor:
      "Dependable, physically fit, and comfortable working outdoors in any weather.",
  },
  {
    title: "Elder Care Companion",
    description:
      "Home care agency hiring compassionate companions for elderly clients. You'll assist with daily activities, provide companionship, and help clients maintain their independence at home.",
    jobType: "FULL_TIME" as const,
    workArrangement: "ON_SITE" as const,
    city: "Boston",
    state: "MA",
    minHourlyRate: 17.0,
    payNotes: "Mileage reimbursement for client visits",
    workDays: ["MON", "TUE", "WED", "THU", "FRI"] as const,
    workAuthRequired: true,
    whatWeTeach:
      "First aid certification, dementia care techniques, medication reminders, and our care protocols.",
    whatWereLookingFor:
      "Patient, empathetic, and genuinely caring person. Background check required.",
  },
  {
    title: "Social Media Content Assistant",
    description:
      "Small marketing agency needs a creative assistant to help manage client social accounts. You'll schedule posts, engage with followers, and assist with content creation under close guidance.",
    jobType: "PART_TIME" as const,
    workArrangement: "REMOTE" as const,
    city: "Denver",
    state: "CO",
    minHourlyRate: 16.5,
    workDays: ["MON", "TUE", "WED", "THU", "FRI"] as const,
    scheduleNotes: "20 hours/week, flexible schedule",
    workAuthRequired: true,
    whatWeTeach:
      "Social media strategy, Canva and scheduling tools, analytics, and content planning.",
    whatWereLookingFor: "Social media native with good writing skills and an eye for aesthetics.",
  },
  {
    title: "Assembly Line Worker",
    description:
      "Manufacturing facility with excellent safety record needs production workers. You'll assemble components, perform quality checks, and maintain a clean workstation. Consistent schedule.",
    jobType: "FULL_TIME" as const,
    workArrangement: "ON_SITE" as const,
    city: "Columbus",
    state: "OH",
    minHourlyRate: 16.0,
    payNotes: "Shift differentials for evenings and nights",
    workDays: ["MON", "TUE", "WED", "THU", "FRI"] as const,
    scheduleNotes: "Day shift 7am–3:30pm available",
    workAuthRequired: true,
    whatWeTeach:
      "Assembly procedures, quality control standards, machinery operation, and safety protocols.",
    whatWereLookingFor:
      "Detail-oriented, reliable, and comfortable with repetitive precision tasks.",
  },
  {
    title: "Hotel Front Desk Agent",
    description:
      "Boutique hotel seeks an enthusiastic front desk agent. You'll check guests in and out, handle reservations, answer questions, and ensure every guest leaves with a great impression.",
    jobType: "FULL_TIME" as const,
    workArrangement: "ON_SITE" as const,
    city: "Las Vegas",
    state: "NV",
    minHourlyRate: 16.5,
    payNotes: "Discounted hotel stays for staff",
    workDays: ["SUN", "MON", "TUE", "WED", "THU"] as const,
    scheduleNotes: "Various shifts available including evenings",
    workAuthRequired: true,
    whatWeTeach:
      "Property management system, hospitality standards, conflict resolution, and local attraction knowledge.",
    whatWereLookingFor: "Warm, professional, and calm under pressure. Multilingual a huge plus.",
  },
  {
    title: "Hotel Housekeeping Staff",
    description:
      "Established hotel chain needs housekeeping staff to maintain immaculate guest rooms and public areas. Team-oriented environment with consistent hours.",
    jobType: "PART_TIME" as const,
    workArrangement: "ON_SITE" as const,
    city: "Tampa",
    state: "FL",
    minHourlyRate: 14.5,
    payNotes: "Tips from guests go directly to staff",
    workDays: ["SAT", "SUN", "MON", "TUE", "WED"] as const,
    scheduleNotes: "8am–3pm shifts",
    workAuthRequired: false,
    whatWeTeach: "Cleaning standards, room setup, linen handling, and hospitality best practices.",
    whatWereLookingFor:
      "Efficient, thorough, and takes pride in a job well done. Physical stamina required.",
  },
  {
    title: "Grocery Store Stocker",
    description:
      "Neighborhood grocery chain needs overnight stockers to ensure shelves are full and organized for morning shoppers. Early morning completion, great for people who prefer quiet work.",
    jobType: "FULL_TIME" as const,
    workArrangement: "ON_SITE" as const,
    city: "Seattle",
    state: "WA",
    minHourlyRate: 17.5,
    payNotes: "10% employee grocery discount",
    workDays: ["SUN", "MON", "TUE", "WED", "THU"] as const,
    scheduleNotes: "Overnight shift 10pm–6am",
    workAuthRequired: true,
    whatWeTeach:
      "Inventory management, product rotation (FIFO), store layout, and forklift basics.",
    whatWereLookingFor:
      "Self-directed, physically capable, and comfortable working independently overnight.",
  },
  {
    title: "Childcare Worker",
    description:
      "Licensed daycare center expanding its toddler room team. You'll supervise and engage children ages 2–4, facilitate activities, assist with meals, and maintain a safe, nurturing environment.",
    jobType: "FULL_TIME" as const,
    workArrangement: "ON_SITE" as const,
    city: "Baltimore",
    state: "MD",
    minHourlyRate: 16.0,
    workDays: ["MON", "TUE", "WED", "THU", "FRI"] as const,
    scheduleNotes: "7:30am–4:30pm",
    workAuthRequired: true,
    whatWeTeach:
      "CPR and First Aid certification, early childhood development, and our daily curriculum.",
    whatWereLookingFor:
      "Patient, energetic, and genuinely loves working with young children. Background check required.",
  },
  {
    title: "Janitorial / Cleaning Technician",
    description:
      "Commercial cleaning company with contracts at offices, schools, and medical facilities. Consistent evening hours, steady pay, and opportunities to move into supervisor roles.",
    jobType: "PART_TIME" as const,
    workArrangement: "ON_SITE" as const,
    city: "San Antonio",
    state: "TX",
    minHourlyRate: 14.0,
    payNotes: "Equipment and supplies provided",
    workDays: ["MON", "TUE", "WED", "THU", "FRI"] as const,
    scheduleNotes: "Evening shift 5pm–9pm",
    workAuthRequired: false,
    whatWeTeach:
      "Commercial cleaning techniques, chemical safety, and medical facility sanitation.",
    whatWereLookingFor: "Reliable, detail-oriented, and someone who takes pride in cleanliness.",
  },
  {
    title: "Kitchen Prep Cook",
    description:
      "Farm-to-table restaurant needs a prep cook to support our culinary team. You'll wash, cut, and portion ingredients, maintain prep lists, and keep the kitchen organized before service.",
    jobType: "FULL_TIME" as const,
    workArrangement: "ON_SITE" as const,
    city: "San Francisco",
    state: "CA",
    minHourlyRate: 18.5,
    payNotes: "Staff meals included",
    workDays: ["TUE", "WED", "THU", "FRI", "SAT"] as const,
    scheduleNotes: "8am–4pm prep shift",
    workAuthRequired: false,
    whatWeTeach:
      "Knife skills, mise en place, kitchen hygiene, and our seasonal ingredient-focused cooking philosophy.",
    whatWereLookingFor:
      "Someone organized, efficient, and excited to grow in a professional kitchen.",
  },
  {
    title: "Administrative Assistant",
    description:
      "Small nonprofit organization needs an administrative assistant to keep operations running smoothly. Hybrid role — remote most days, in office Tuesdays for team meetings.",
    jobType: "FULL_TIME" as const,
    workArrangement: "HYBRID" as const,
    city: "New York City",
    state: "NY",
    minHourlyRate: 19.0,
    workDays: ["MON", "TUE", "WED", "THU", "FRI"] as const,
    scheduleNotes: "In-office Tuesdays required",
    workAuthRequired: true,
    whatWeTeach:
      "Nonprofit operations, Google Workspace, scheduling, donor communications, and grant reporting basics.",
    whatWereLookingFor: "Organized, proactive, and mission-aligned. Strong writing skills a plus.",
  },
] as const;

async function lookupCityCoords(city: string, stateAbbr: string) {
  return prisma.city.findFirst({
    where: { name: { equals: city, mode: "insensitive" }, state: { abbr: stateAbbr } },
    select: { lat: true, lon: true },
  });
}

async function main() {
  // Find any existing employer profile to attach the jobs to
  const employer = await prisma.employerProfile.findFirst({
    include: { user: { select: { id: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (!employer) {
    console.error(
      "No employer profile found in the database.\n" +
        "Please create an employer account through the app first, then re-run this script.",
    );
    process.exit(1);
  }

  console.log(`Creating jobs for employer: ${employer.companyName} (${employer.user.id})`);

  let created = 0;
  for (const job of FAKE_JOBS) {
    const coords = await lookupCityCoords(job.city, job.state);

    await prisma.jobPosting.create({
      data: {
        employerProfileId: employer.id,
        postedById: employer.user.id,
        title: job.title,
        description: job.description,
        jobType: job.jobType,
        workArrangement: job.workArrangement,
        city: job.city,
        state: job.state,
        ...(coords && { lat: coords.lat, lon: coords.lon }),
        minHourlyRate: job.minHourlyRate,
        payNotes: "payNotes" in job ? job.payNotes : undefined,
        workDays: [...job.workDays],
        scheduleNotes: "scheduleNotes" in job ? job.scheduleNotes : undefined,
        workAuthRequired: job.workAuthRequired,
        whatWeTeach: job.whatWeTeach,
        whatWereLookingFor: job.whatWereLookingFor,
        status: "ACTIVE",
      },
    });
    created++;
    console.log(`  [${created}/${FAKE_JOBS.length}] ${job.title} — ${job.city}, ${job.state}`);
  }

  console.log(`\nDone! Created ${created} job listings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
