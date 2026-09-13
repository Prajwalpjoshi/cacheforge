import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

// Deterministic, small demo catalog. Never seed RequestMetric or
// BenchmarkRun rows here — those must represent real measured traffic
// (PROJECT_SPEC.md §13).
const products = [
  {
    sku: "CF-001",
    name: "Mechanical Keyboard",
    description: "Hot-swappable 65% mechanical keyboard.",
    category: "peripherals",
    price: 129.99,
    stock: 42,
  },
  {
    sku: "CF-002",
    name: "4K Monitor",
    description: "27-inch 4K IPS monitor, 144Hz.",
    category: "displays",
    price: 449.0,
    stock: 15,
  },
  {
    sku: "CF-003",
    name: "USB-C Dock",
    description: "12-in-1 USB-C docking station.",
    category: "peripherals",
    price: 79.5,
    stock: 60,
  },
  {
    sku: "CF-004",
    name: "Standing Desk",
    description: "Electric height-adjustable desk.",
    category: "furniture",
    price: 349.0,
    stock: 8,
  },
  {
    sku: "CF-005",
    name: "Noise-Cancelling Headphones",
    description: "Over-ear ANC headphones.",
    category: "audio",
    price: 199.99,
    stock: 25,
  },
  {
    sku: "CF-006",
    name: "1080p Webcam",
    description: "1080p60 webcam with a privacy shutter.",
    category: "peripherals",
    price: 59.99,
    stock: 100,
  },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }
  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
