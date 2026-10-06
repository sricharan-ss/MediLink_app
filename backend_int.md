Currently, connection for backend. 12/05/2026

Installed dependencies - npm install. Working on NPM version 11 for backward compatability of mobile app fetures, but suggested version was 18.
Created a new .env file
Made a new supabase account and project for free in personal mail. Used a postgres link (with pooler) in .env file
No changes to schema.prisma
Did - npx prisma generate
DO NOT USE migrate dev Initially. Because its cloud. So, used - npx prisma db push instead of npx prisma migrate dev. Did it, but db push didnt work.
Switched from node v22 to node v18. No installations. Chnaged command - nvm install 18
nvm use 18
Even after moving to v18, error persists.
GPT suggested - Fix imports in files
Did 3 lines of change in 3 files for syntax of import, export. npm install crash stopped after this. So it proved that this change was mandatory.
npm install working well, but npx prisma db push or migrate did not work. Main problem was crashing cloud.
So switching to offline Postgres v14.
PGadmin, a tool for offline postgres.


After the changes - will try Postgres today.
13/05/2026
Created DB in Postgres offline.
New DB URL is - DATABASE_URL="postgresql://postgres:password@localhost:5432/medilink"
Success in npx prisma db push and npm run dev.
Writing code for entry. More than 300 lines of code changed in flutter. Stuck at error. GPT Codex session credits got over and Antigravity servers short term crash. So halted. I didnt upload in Github yet as its with error.
Somehow app running. Need to check how well it does.

14 and 15/05/2026
DB, backend, frontend all are healthy. But no connection between frontend and backend. 
Problem found was - insertion of new users was a 2 step process involving OTP and till now no one said anythiing about OTP. Neither documentation, nor the env file say that we have to use Twilio and even if we asked them, they directed to the backend team and they also didn't respond.
May 10 to 15 - These many days wasted for this.
../Vitadata_backend/backend/src/services/sendOtpByNumber.js
Now needed in env
TWILIO_ACCOUNT_SID - Your Twilio account SID
TWILIO_AUTH_TOKEN - Your Twilio auth token
TWILIO_PHONE_NUMBER - The phone number Twilio provides for sending SMS
Try all the codes.
