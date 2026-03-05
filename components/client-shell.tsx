'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AuthGuard } from '@/components/auth-guard';
import { BottomNav } from '@/components/bottom-nav';

interface Props {
  children: React.ReactNode;
}

export function ClientShell({ children }: Props) {
  const pathname = usePathname();
  const { status } = useSession();
  const showSidebar = pathname !== '/' && status === 'authenticated';

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <div className="mx-auto min-h-screen max-w-[1600px] px-3 py-4 md:px-6 md:py-6">
          <main className="min-h-[calc(100vh-2rem)] pb-20 md:pb-24">{children}</main>
        </div>
        {showSidebar ? (
          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center">
            <div className="pointer-events-auto w-full max-w-md px-4">
              <BottomNav />
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}

