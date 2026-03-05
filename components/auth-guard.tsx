'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Props {
  children: React.ReactNode;
}

const publicPaths = new Set(['/', '/terms', '/privacy']);

export function AuthGuard({ children }: Props) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = publicPaths.has(pathname);

  useEffect(() => {
    if (!isPublic && status === 'unauthenticated') {
      router.replace('/');
    }
  }, [isPublic, router, status]);

  if (!isPublic && status === 'loading') {
    return (
      <div className="p-6">
        <div className="glass-strong inline-flex rounded-[var(--radius-sm)] px-3 py-2 text-sm text-muted-foreground">
          Checking your session...
        </div>
      </div>
    );
  }

  if (!isPublic && status === 'unauthenticated') {
    return null;
  }

  return <>{children}</>;
}

