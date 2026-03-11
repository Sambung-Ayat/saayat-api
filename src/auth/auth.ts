import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { mergeGuestHook } from './hooks/merge-guest.hook';

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: '/auth',
  database: new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT!),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  }),
  socialProviders: {
    google: {
      prompt: 'select_account',
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectURI: `${process.env.BETTER_AUTH_URL}/auth/callback/google`,
    },
  },
  trustedOrigins: [
    'http://localhost:3000',
    'https://dev.saayat.site',
    'https://saayat.site',
  ],
  hooks: {
    after: mergeGuestHook,
  },
  advanced: {
    database: {
      generateId: () => uuidv4(),
    },
  },
});

export type Auth = typeof auth;
