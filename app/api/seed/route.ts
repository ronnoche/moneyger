import { getAuthedContext } from '@/lib/api/auth';
import { toErrorResponse } from '@/lib/api/errors';
import { seedSheetData } from '@/lib/google/ensureUserSheetExists';

export async function POST() {
  try {
    const { sheetId, session } = await getAuthedContext();
    await seedSheetData(sheetId, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      accessTokenExpires: session.accessTokenExpires,
    });
    return Response.json({ seeded: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

