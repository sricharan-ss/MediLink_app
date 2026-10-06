/**
 * CSV Medicines Seeding Script
 * Seeds medicines from a local CSV file into the database.
 * CSV columns: id, name, Is_discontinued, manufacturer_name, type, short_composition_1
 * Run with: node scripts/seedMedicinesFromCsv.js
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

const defaultCsvPath = 'temp_medicine.csv';
const csvPath = process.env.MEDICINE_CSV_PATH || defaultCsvPath;
const resolvedCsvPath = path.isAbsolute(csvPath)
  ? csvPath
  : path.resolve(process.cwd(), csvPath);

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function normalizeString(value) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseBoolean(value) {
  if (!value) return false;
  const str = String(value).trim().toLowerCase();
  return str === 'true' || str === '1' || str === 'yes';
}

function buildMedicine(record) {
  const csvId = normalizeString(record.id);
  const name = normalizeString(record.name);
  const manufacturer = normalizeString(record.manufacturer_name);
  const type = normalizeString(record.type);
  const shortComposition1 = normalizeString(record.short_composition1);
  const shortComposition2 = normalizeString(record.short_composition2);
  const saltComposition = normalizeString(record.salt_composition);
  const isDiscontinued = parseBoolean(record.Is_discontinued);

  return {
    csvId,
    name,
    type,
    manufacturer,
    shortComposition1,
    shortComposition2,
    saltComposition,
    isDiscontinued,
  };
}

async function seedMedicines() {
  if (!fs.existsSync(resolvedCsvPath)) {
    console.error(`❌ CSV file not found: ${resolvedCsvPath}`);
    process.exit(1);
  }

  try {
    console.log('🚀 Starting medicine seeding process from CSV...\n');

    const existingCount = await prisma.medicine.count();
    if (existingCount > 0) {
      console.log(`⚠️  Database already contains ${existingCount} medicines.`);
      if (process.env.SEED_FORCE !== '1') {
        const response = await getUserConfirmation('Do you want to clear and reseed? (y/n): ');
        if (response.toLowerCase() !== 'y') {
          console.log('Seeding cancelled.');
          process.exit(0);
        }
      }
      await prisma.medicine.deleteMany({});
      console.log('🗑️  Cleared existing medicines.\n');
    }

    const fileStream = fs.createReadStream(resolvedCsvPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let headers = null;
    let batch = [];
    const batchSize = 500;
    let totalRead = 0;
    let totalInserted = 0;
    let skipped = 0;

    console.log('📖 Reading CSV file...\n');

    for await (const line of rl) {
      if (!line || !line.trim()) continue;

      if (!headers) {
        headers = parseCsvLine(line).map((value) => value.trim());
        console.log(`📋 CSV Headers: ${headers.join(', ')}\n`);
        continue;
      }

      const values = parseCsvLine(line);
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index] ?? '';
      });

      const medicine = buildMedicine(record);
      
      // Skip if name is missing
      if (!medicine.name) {
        skipped += 1;
        continue;
      }

      batch.push(medicine);
      totalRead += 1;

      if (batch.length >= batchSize) {
        const result = await prisma.medicine.createMany({
          data: batch,
          skipDuplicates: true,
        });
        totalInserted += result.count;
        console.log(`✓ Inserted ${totalInserted} medicines (${skipped} skipped)...`);
        batch = [];
      }
    }

    // Insert remaining batch
    if (batch.length > 0) {
      const result = await prisma.medicine.createMany({
        data: batch,
        skipDuplicates: true,
      });
      totalInserted += result.count;
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`📊 Total: ${totalInserted} inserted, ${skipped} skipped, ${totalRead} processed`);

    // Show sample
    const samples = await prisma.medicine.findMany({ take: 5 });
    if (samples.length > 0) {
      console.log('\n📋 Sample medicines:');
      samples.forEach((med) => {
        console.log(`  - ${med.name}`);
        if (med.type) console.log(`    Type: ${med.type}`);
        if (med.manufacturer) console.log(`    Manufacturer: ${med.manufacturer}`);
        if (med.shortComposition1) console.log(`    Composition: ${med.shortComposition1}`);
        if (med.saltComposition) console.log(`    Salt: ${med.saltComposition}`);
        if (med.isDiscontinued) console.log(`    ⚠️  Discontinued`);
      });
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function getUserConfirmation(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.resume();
    process.stdin.once('data', (data) => {
      process.stdin.pause();
      resolve(data.toString().trim());
    });
  });
}

seedMedicines();
