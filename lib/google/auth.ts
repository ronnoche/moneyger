import { google } from 'googleapis';

export interface TokenSet {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
}

export const createOAuthClient = (tokens?: TokenSet) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }

  const auth = new google.auth.OAuth2(
    clientId,
    clientSecret,
    process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/auth/callback/google` : undefined,
  );

  auth.setCredentials({
    access_token: tokens?.accessToken,
    refresh_token: tokens?.refreshToken,
    expiry_date: tokens?.accessTokenExpires,
  });

  return auth;
};

export const refreshAccessToken = async (tokens: Required<Pick<TokenSet, 'refreshToken'>> & TokenSet) => {
  const auth = createOAuthClient(tokens);
  const response = await auth.refreshAccessToken();
  const credentials = response.credentials;

  return {
    accessToken: credentials.access_token ?? tokens.accessToken,
    refreshToken: credentials.refresh_token ?? tokens.refreshToken,
    accessTokenExpires: credentials.expiry_date ?? Date.now() + 50 * 60 * 1000,
  };
};

