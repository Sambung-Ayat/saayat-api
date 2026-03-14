import { betterAuth } from 'better-auth';
import { anonymous } from 'better-auth/plugins';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { onLinkAccount } from './hooks/link-account.hook';

const isProductionOrTest = process.env.NODE_ENV !== 'development';

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
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (user.isAnonymous) {
            return {
              data: { ...user, name: 'Hamba Allah' },
            };
          }
        },
      },
    },
  },
  trustedOrigins: process.env.ORIGINS?.split(',') || [],
  plugins: [
    anonymous({
      emailDomainName: 'guest.saayat.site',
      onLinkAccount,
    }),
  ],
  advanced: {
    database: {
      generateId: () => uuidv4(),
    },
    crossSubDomainCookies: isProductionOrTest
      ? { enabled: true, domain: process.env.BETTER_AUTH_COOKIE_DOMAIN }
      : { enabled: false },
    defaultCookieAttributes: {
      secure: isProductionOrTest,
      sameSite: 'lax',
      httpOnly: true,
    },
  },
});

export type Auth = typeof auth;
