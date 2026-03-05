import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      sheetId?: string;
      userSheetId?: string | null;
      isFirstTime?: boolean;
    };
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    isFirstTime?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    sheetId?: string;
    userId?: string;
    email?: string | null;
    isFirstTime?: boolean;
    userSheetId?: string | null;
    error?: string;
  }
}

