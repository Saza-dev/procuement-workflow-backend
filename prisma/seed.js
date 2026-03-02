import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Database...");

  const rawPassword = "123456";
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(rawPassword, salt);

  const userData = [
    { id: 1, email: "department.head@fochant.lk", role: "DH" },
    { id: 2, email: "procurement.executive@fochant.lk", role: "PE" },
    { id: 3, email: "finance.manager@fochant.lk", role: "FM" },
    { id: 4, email: "operations.manager@fochant.lk", role: "OM" },
    { id: 5, email: "ceo@fochant.lk", role: "CEO" },
    { id: 6, email: "hr@fochant.lk", role: "HR" },
  ];


  const usersWithPasswords = userData.map((user) => ({
    ...user,
    password: hashedPassword,
  }));

  await prisma.user.createMany({
    data: usersWithPasswords,
    skipDuplicates: true,
  });

  console.log("Database Seeding Complete!");
  console.log(`Created ${usersWithPasswords.length} Workflow Users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
