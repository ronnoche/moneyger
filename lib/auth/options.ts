import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { ensureUserSheetExists } from '@/lib/google/ensureUserSheetExists';
import { refreshAccessToken } from '@/lib/google/auth';
import { syncRegistryUser } from '@/lib/google/registry';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async signIn() {
      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.email) token.email = user.email;
      if (user?.id) token.userId = user.id;

      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token ?? token.refreshToken;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : Date.now() + 50 * 60 * 1000;
      }

      if ((!token.sheetId || account) && token.accessToken) {
        try {
          token.sheetId = await ensureUserSheetExists({
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            accessTokenExpires: token.accessTokenExpires,
          });
        } catch (error) {
          console.error('[auth] Failed to ensure user sheet exists:', error);
        }
      }

      if (token.sheetId) {
        token.userSheetId = token.sheetId;
      }

      if (token.sub && token.email && token.sheetId) {
        try {
          const result = await syncRegistryUser({
            googleSub: token.sub,
            email: token.email,
            userSheetId: token.sheetId,
          });
          token.isFirstTime = result.isFirstTime;
        } catch (error) {
          console.error('[registry] Failed to sync registry user:', error);
        }
      }

      if (token.accessToken && token.accessTokenExpires && Date.now() < token.accessTokenExpires - 60_000) {
        return token;
      }

      if (!token.refreshToken) {
        token.error = 'NoRefreshToken';
        return token;
      }

      try {
        const refreshed = await refreshAccessToken({
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          accessTokenExpires: token.accessTokenExpires,
        });
        token.accessToken = refreshed.accessToken;
        token.refreshToken = refreshed.refreshToken;
        token.accessTokenExpires = refreshed.accessTokenExpires;
      } catch (error) {
        console.error('Failed to refresh token:', error);
        token.error = 'RefreshAccessTokenError';
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.email = token.email ?? session.user.email;
      session.user.sheetId = token.sheetId;
       session.user.userSheetId = (token as typeof token & { userSheetId?: string | null }).userSheetId ?? token.sheetId ?? null;
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.accessTokenExpires = token.accessTokenExpires;
      session.user.isFirstTime = token.isFirstTime;
      session.isFirstTime = token.isFirstTime;
      return session;
    },
  },
};

