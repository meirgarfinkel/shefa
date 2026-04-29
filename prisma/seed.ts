import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SKILLS: { name: string; category: string }[] = [
  // Customer & Sales
  { name: "Customer Service", category: "Customer & Sales" },
  { name: "Cash Handling", category: "Customer & Sales" },
  { name: "Cash Register / POS", category: "Customer & Sales" },
  { name: "Sales", category: "Customer & Sales" },
  // Food & Kitchen
  { name: "Food Prep", category: "Food & Kitchen" },
  { name: "Cooking", category: "Food & Kitchen" },
  { name: "Baking", category: "Food & Kitchen" },
  { name: "Dishwashing", category: "Food & Kitchen" },
  { name: "Barista", category: "Food & Kitchen" },
  // Hospitality & Care
  { name: "Serving / Waitstaff", category: "Hospitality & Care" },
  { name: "Childcare", category: "Hospitality & Care" },
  { name: "Elder Care", category: "Hospitality & Care" },
  { name: "Basic First Aid", category: "Hospitality & Care" },
  // Cleaning & Facilities
  { name: "Cleaning / Janitorial", category: "Cleaning & Facilities" },
  { name: "Laundry", category: "Cleaning & Facilities" },
  { name: "Landscaping / Groundskeeping", category: "Cleaning & Facilities" },
  // Office & Admin
  { name: "Data Entry", category: "Office & Admin" },
  { name: "Filing & Scanning", category: "Office & Admin" },
  { name: "Scheduling", category: "Office & Admin" },
  { name: "Microsoft Office", category: "Office & Admin" },
  { name: "Social Media", category: "Office & Admin" },
  // Trades
  { name: "Painting", category: "Trades" },
  { name: "Carpentry", category: "Trades" },
  { name: "Basic Plumbing", category: "Trades" },
  { name: "Basic Electrical", category: "Trades" },
  // Warehouse & Logistics
  { name: "Forklift Operation", category: "Warehouse & Logistics" },
  { name: "Warehouse / Shipping", category: "Warehouse & Logistics" },
  { name: "Stocking Shelves", category: "Warehouse & Logistics" },
  { name: "Assembly", category: "Warehouse & Logistics" },
  // Other
  { name: "Driving (personal vehicle)", category: "Other" },
  { name: "Sewing / Alterations", category: "Other" },
];

const LANGUAGES: string[] = [
  "English",
  "Spanish",
  "Mandarin Chinese",
  "Cantonese",
  "Yiddish",
  "Hebrew",
  "Hindi",
  "Tagalog",
  "Vietnamese",
  "Korean",
  "Arabic",
  "French",
  "Haitian Creole",
  "Portuguese",
  "Russian",
  "Polish",
  "Urdu",
  "Bengali",
  "Japanese",
  "Punjabi",
  "Amharic",
  "Somali",
];

async function main() {
  console.log("Seeding skills...");
  for (const skill of SKILLS) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: { category: skill.category },
      create: skill,
    });
  }
  console.log(`  ${SKILLS.length} skills seeded.`);

  console.log("Seeding languages...");
  for (const name of LANGUAGES) {
    await prisma.language.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`  ${LANGUAGES.length} languages seeded.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
