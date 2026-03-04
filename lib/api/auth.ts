import { getServerSession } from 'next-auth';
import { ApiError } from '@/lib/api/errors';
import { authOptions } from '@/lib/auth/options';
import { getGoogleClients } from '@/lib/google/client';

export const getAuthedContext = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session.accessToken || !session.user.sheetId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const clients = getGoogleClients({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    accessTokenExpires: session.accessTokenExpires,
  });

  return {
    session,
    sheetId: session.user.sheetId,
    clients,
  };
};

