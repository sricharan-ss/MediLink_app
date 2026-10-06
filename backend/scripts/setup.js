import { spawn } from 'child_process';
import { existsSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.cyan}${colors.bright}➜${colors.reset} ${msg}`),
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', reject);
  });
}

async function checkNodeVersion() {
  log.step('Checking Node.js version...');
  try {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);
    
    if (major < 18) {
      log.error(`Node.js version ${version} detected. Version 18 or higher is required.`);
      process.exit(1);
    }
    
    log.success(`Node.js ${version} detected`);
    return true;
  } catch (error) {
    log.error('Failed to check Node.js version');
    return false;
  }
}

async function installDependencies() {
  log.step('Installing dependencies...');
  try {
    await runCommand('npm', ['install']);
    log.success('Dependencies installed successfully');
    return true;
  } catch (error) {
    log.error('Failed to install dependencies');
    console.error(error.message);
    return false;
  }
}

async function setupEnvFile() {
  log.step('Checking environment configuration...');
  
  const envPath = join(rootDir, '.env');
  const envExamplePath = join(rootDir, '.env.example');
  
  if (existsSync(envPath)) {
    log.success('.env file already exists');
    return true;
  }
  
  if (existsSync(envExamplePath)) {
    log.info('Creating .env from .env.example...');
    copyFileSync(envExamplePath, envPath);
    log.success('.env file created');
    log.warning('Please update .env file with your actual configuration values');
    
    const continueSetup = await question(`\n${colors.yellow}Have you configured your .env file? (y/n): ${colors.reset}`);
    if (continueSetup.toLowerCase() !== 'y') {
      log.warning('Please configure .env file and run npm run setup again');
      process.exit(0);
    }
  } else {
    log.error('.env.example file not found. Please create .env manually');
    return false;
  }
  
  return true;
}

async function generatePrismaClient() {
  log.step('Generating Prisma Client...');
  try {
    await runCommand('npx', ['prisma', 'generate']);
    log.success('Prisma Client generated successfully');
    return true;
  } catch (error) {
    log.error('Failed to generate Prisma Client');
    console.error(error.message);
    return false;
  }
}

async function runMigrations() {
  log.step('Running database migrations...');
  
  const answer = await question(`\n${colors.yellow}Do you want to reset the database and run migrations? (y/n): ${colors.reset}`);
  
  if (answer.toLowerCase() !== 'y') {
    log.warning('Skipping database migrations');
    return true;
  }
  
  try {
    log.info('Running: npx prisma migrate dev');
    await runCommand('npx', ['prisma', 'migrate', 'dev', '--name', 'init']);
    log.success('Database migrations completed successfully');
    return true;
  } catch (error) {
    log.error('Failed to run migrations');
    console.error(error.message);
    
    const tryReset = await question(`\n${colors.yellow}Try running migrate reset instead? (y/n): ${colors.reset}`);
    if (tryReset.toLowerCase() === 'y') {
      try {
        await runCommand('npx', ['prisma', 'migrate', 'reset', '--force']);
        log.success('Database reset and migrations completed');
        return true;
      } catch (resetError) {
        log.error('Failed to reset database');
        console.error(resetError.message);
        return false;
      }
    }
    return false;
  }
}

async function seedDatabase() {
  log.step('Database seeding...');
  
  const answer = await question(`\n${colors.yellow}Do you want to seed the database with initial data? (y/n): ${colors.reset}`);
  
  if (answer.toLowerCase() !== 'y') {
    log.warning('Skipping database seeding');
    return true;
  }
  
  try {
    const seedScript = join(rootDir, 'prisma', 'seed.js');
    if (existsSync(seedScript)) {
      log.info('Running database seed...');
      await runCommand('npx', ['prisma', 'db', 'seed']);
      log.success('Database seeded successfully');
    } else {
      log.warning('No seed script found at prisma/seed.js');
    }
    return true;
  } catch (error) {
    log.error('Failed to seed database');
    console.error(error.message);
    return false;
  }
}

async function startServer() {
  log.step('Starting development server...');
  
  const answer = await question(`\n${colors.yellow}Do you want to start the development server now? (y/n): ${colors.reset}`);
  
  if (answer.toLowerCase() !== 'y') {
    log.success('Setup completed successfully!');
    log.info('Run "npm run dev" to start the development server');
    return true;
  }
  
  try {
    log.info('Starting server with nodemon...');
    log.info('Press Ctrl+C to stop the server\n');
    await runCommand('npm', ['run', 'dev']);
    return true;
  } catch (error) {
    log.error('Failed to start server');
    console.error(error.message);
    return false;
  }
}

async function main() {
  console.log(`
${colors.cyan}${colors.bright}
╔════════════════════════════════════════════════════════════╗
║              VitaData Server Setup Script                 ║
║          First-time Developer Setup Assistant             ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}
  `);
  
  try {
    const steps = [
      checkNodeVersion,
      installDependencies,
      setupEnvFile,
      generatePrismaClient,
      runMigrations,
      seedDatabase,
      startServer,
    ];
    
    for (const step of steps) {
      const success = await step();
      if (!success) {
        log.error('Setup failed. Please fix the errors and try again.');
        rl.close();
        process.exit(1);
      }
    }
    
    console.log(`
${colors.green}${colors.bright}
╔════════════════════════════════════════════════════════════╗
║                  Setup Completed! 🎉                       ║
╠════════════════════════════════════════════════════════════╣
║  Your VitaData server is ready for development!           ║
║                                                            ║
║  Useful commands:                                          ║
║  • npm run dev        - Start development server           ║
║  • npm run start      - Start production server            ║
║  • npx prisma studio  - Open Prisma Studio                 ║
║  • npx prisma migrate - Run database migrations            ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}
    `);
    
    rl.close();
  } catch (error) {
    log.error('Unexpected error during setup');
    console.error(error);
    rl.close();
    process.exit(1);
  }
}

main();
