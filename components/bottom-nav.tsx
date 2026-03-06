'use client';

import { signOut, useSession } from 'next-auth/react';
import type { SVGProps } from 'react';
import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ExpandableTabs } from '@/components/ui/expandable-tabs';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui';

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
};

function IconBase({ size = 24, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

function TrendUpIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M21 9V3h-6" />
    </IconBase>
  );
}

function HomeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M9 20v-6h6v6" />
    </IconBase>
  );
}

function PlusCircleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </IconBase>
  );
}

function WalletIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-5" />
      <path d="M2 10h18" />
      <path d="M16 16h4" />
    </IconBase>
  );
}

function UserIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20a6 6 0 0 1 12 0" />
    </IconBase>
  );
}

const tabs = [
  { title: 'Buckets', icon: HomeIcon, href: '/budgets' },
  { title: 'Cash Flow', icon: TrendUpIcon, href: '/cashflow' },
  { title: 'New', icon: PlusCircleIcon, href: '/transactions' },
  { title: 'Wallets', icon: WalletIcon, href: '/accounts' },
  { title: 'Profile', icon: UserIcon, href: '/profile' },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const profileIndex = useMemo(
    () => tabs.findIndex((tab) => tab.href === '/profile'),
    [],
  );

  const routeActiveIndex = tabs.findIndex((tab) =>
    pathname.startsWith(tab.href),
  );
  const activeIndex = menuOpen ? profileIndex : routeActiveIndex;

  return (
    <div className="relative">
      {menuOpen ? (
        <>
          <button
            aria-label="Close account menu"
            className="fixed inset-0 z-30 cursor-default bg-transparent"
            onClick={() => setMenuOpen(false)}
            type="button"
          />
          <div className="absolute bottom-full right-0 z-40 mb-3 w-[40%] rounded-lg border border-surface-border bg-surface-strong p-4 text-sm text-foreground shadow-lg text-right">
            <p className="mb-3 truncate">{data?.user?.email}</p>
            <div className="mb-4 flex justify-end">
              <ThemeToggle />
            </div>
            <Button
              className="ml-auto"
              onClick={() => signOut({ callbackUrl: '/' })}
              size="sm"
              type="button"
              variant="danger"
            >
              Sign out
            </Button>
          </div>
        </>
      ) : null}

      <ExpandableTabs
        tabs={tabs}
        initialIndex={activeIndex === -1 ? null : activeIndex}
        activeColor="text-brand"
        disableOutsideClick={menuOpen}
        className="w-full justify-between rounded-[999px] border-surface-border bg-surface-strong/95 px-4 py-2.5 shadow-lg backdrop-blur"
        onChange={(index) => {
          if (index == null) {
            setMenuOpen(false);
            return;
          }

          const target = tabs[index];
          if (!target) {
            return;
          }

          if (target.href === '/profile') {
            setMenuOpen((open) => !open);
            return;
          }

          setMenuOpen(false);
          if (target.href === pathname) {
            return;
          }
          router.push(target.href);
        }}
      />
    </div>
  );
}

