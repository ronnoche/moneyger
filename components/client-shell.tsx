'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { Sidebar } from '@/components/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui';

interface Props {
  children: React.ReactNode;
}

export function ClientShell({ children }: Props) {
  const pathname = usePathname();
  const { status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const showSidebar = pathname !== '/' && status === 'authenticated';
  const pageTitle = pathname.slice(1).split('/')[0] || 'Home';

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [mobileOpen]);

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <div className="mx-auto min-h-screen max-w-[1600px] px-3 py-4 md:px-6 md:py-6">
          {showSidebar ? (
            <header className="glass-strong mb-3 flex items-center justify-between px-3 py-2 md:hidden">
              <Button
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
                size="sm"
                type="button"
                variant="secondary"
              >
                Menu
              </Button>
              <p className="text-sm font-semibold capitalize text-foreground">{pageTitle}</p>
              <ThemeToggle />
            </header>
          ) : null}

          <div className="flex min-h-[calc(100vh-2rem)] gap-4">
            {showSidebar ? (
              <>
                <div className="hidden shrink-0 md:block">
                  <div className="sticky top-6 h-[calc(100vh-3rem)]">
                    {sidebarCollapsed ? (
                      <div className="flex h-full items-start">
                        <Button
                          aria-label="Expand navigation"
                          className="w-10"
                          onClick={() => setSidebarCollapsed(false)}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          {'>'}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex h-full">
                        <Sidebar
                          className="w-80"
                          onCollapse={() => {
                            setSidebarCollapsed(true);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                {mobileOpen ? (
                  <div className="fixed inset-0 z-40 md:hidden">
                    <button
                      aria-label="Close navigation"
                      className="absolute inset-0 bg-slate-950/45"
                      onClick={() => setMobileOpen(false)}
                      type="button"
                    />
                    <div className="relative flex h-full max-w-80 flex-col p-3">
                      <Sidebar
                        className="h-full"
                        onNavigate={() => {
                          setMobileOpen(false);
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
            <main className="min-w-0 flex-1 pb-6">{children}</main>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

