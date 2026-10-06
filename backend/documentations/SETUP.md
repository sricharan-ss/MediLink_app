# VitaData Server Setup Guide

## First-Time Setup

This guide will help you set up the VitaData server for the first time.

### Quick Start

Run the automated setup script:

```bash
npm run setup
```

This interactive script will guide you through:

1. ✓ Checking Node.js version (requires v18+)
2. ✓ Installing all npm dependencies
3. ✓ Creating .env file from .env.example
4. ✓ Generating Prisma Client
5. ✓ Running database migrations
6. ✓ Seeding the database (optional)
7. ✓ Starting the development server (optional)

### Manual Setup

If you prefer manual setup:

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Configure Environment
Copy `.env.example` to `.env` and update with your values:
```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `RAZORPAY_KEY_ID` - Razorpay API key
- `RAZORPAY_KEY_SECRET` - Razorpay secret key
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)

#### 3. Generate Prisma Client
```bash
npx prisma generate
```

#### 4. Run Database Migrations
```bash
npx prisma migrate dev
```

Or reset and migrate:
```bash
npx prisma migrate reset --force
```

#### 5. Seed Database (Optional)
```bash
npx prisma db seed
```

#### 6. Start Development Server
```bash
npm run dev
```

### Available Scripts

- `npm run setup` - Run first-time setup wizard
- `npm run dev` - Start development server with hot reload
- `npm run start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate:dev` - Create new migration
- `npm run prisma:migrate:deploy` - Apply migrations in production
- `npm run prisma:studio` - Open Prisma Studio (DB GUI)
- `npm run seed:medicines` - Seed medicines from CSV

### Verify Installation

After setup, verify the server is running:

- Health Check: http://localhost:5000/health
- Database Check: http://localhost:5000/api/health/db
- API Root: http://localhost:5000/api

### Troubleshooting

**Port already in use:**
```bash
# Change PORT in .env file or kill existing process
```

**Database connection failed:**
```bash
# Verify DATABASE_URL in .env
# Ensure PostgreSQL is running
```

**Prisma migration failed:**
```bash
# Try reset and migrate
npx prisma migrate reset --force
```

**Node version error:**
```bash
# Install Node.js v18 or higher
# Verify with: node --version
```

### Next Steps

1. Review API documentation:
   - [Payment Flow Documentation](PaymentFlow.md) - Complete invoice → payment → refund flow
   - [Doctor Scheduling Documentation](DoctorScheduling.md) - Appointment booking with token generation
2. Explore database schema with `npx prisma studio`
3. Check implementation details:
   - Auto-generated invoices on appointment creation
   - Token generation per doctor per day
   - Duplicate payment prevention (15-minute window)
   - Automatic refund processing on cancellation

### Key Features Implemented

**Payment System:**
- ✅ Auto-invoice generation on appointment booking
- ✅ Razorpay integration with signature verification
- ✅ Duplicate payment prevention (15-minute window)
- ✅ Automatic refund processing on cancellation
- ✅ Proper status enum values (SUCCESS, PENDING, FAILED, REFUNDED, CANCELLED)

**Appointment System:**
- ✅ Automatic token generation per doctor per day
- ✅ Bidirectional sync between Encounter and DoctorSchedule
- ✅ Auto-cascade on updates and deletions
- ✅ Tax calculation (10% on consultation fee)

**Data Validation:**
- ✅ Zod validators aligned with Prisma schema
- ✅ Role-based access control on all routes
- ✅ Comprehensive error handling

### Support

For issues or questions:
- Check existing documentation in `/documentations`
- Review Prisma schema at `/prisma/schema.prisma`
- Check server logs for error details

---

**Happy coding! 🚀**
