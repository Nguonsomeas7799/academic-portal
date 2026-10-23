'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Users,
  UserRoundCheck,
  X,
  ChartNoAxesCombined,
} from 'lucide-react';
import type { Role } from '@prisma/client';
import { canManageAcademics, canViewAcademics, canViewAudit, roleLabel } from '@/lib/permissions';
import { dictionary, type Locale } from '@/lib/i18n';
import { initials, cn } from '@/lib/utils';
import { logoutAction, setLocaleAction } from '@/app/actions/auth';
import { Button } from './ui/button';
type ShellUser = { name: string; email: string; role: Role; studentId?: string };
export function Shell({
  user,
  locale,
  initialDark,
  children,
}: {
  user: ShellUser;
  locale: Locale;
  initialDark: boolean;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [mobile, setMobile] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [dark, setDark] = useState(initialDark);
  const t = dictionary[locale];
  const links = [
    { href: '/dashboard', label: t.dashboard, icon: LayoutDashboard, visible: true },
    {
      href: user.role === 'STUDENT' ? `/students/${user.studentId ?? 'unlinked'}` : '/students',
      label:
        user.role === 'STUDENT'
          ? locale === 'km'
            ? 'ប្រវត្តិរបស់ខ្ញុំ'
            : 'My student record'
          : t.students,
      icon: Users,
      visible: canManageAcademics(user.role) || (user.role === 'STUDENT' && !!user.studentId),
    },
    {
      href: '/lecturers',
      label: t.lecturers,
      icon: UserRoundCheck,
      visible: canManageAcademics(user.role),
    },
    {
      href: '/academics',
      label: t.academics,
      icon: BookOpen,
      visible: canViewAcademics(user.role),
    },
    {
      href: '/attendance',
      label: t.attendance,
      icon: CalendarCheck,
      visible: canViewAcademics(user.role),
    },
    {
      href: '/reports',
      label: t.reports,
      icon: ChartNoAxesCombined,
      visible: canViewAcademics(user.role),
    },
  ];
  const current = [
    ...links,
    { href: '/audit', label: t.audit },
    { href: '/settings', label: t.settings },
  ].find((l) => path.startsWith(l.href));
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    document.cookie = `theme=${next ? 'dark' : 'light'}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }
  return (
    <div className={cn('app-shell', collapsed && 'sidebar-collapsed')}>
      {mobile && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={cn('sidebar', mobile && 'sidebar-open')} aria-label="Main navigation">
        <Link href="/dashboard" className="brand">
          <div className="brand-icon">
            <GraduationCap size={25} />
          </div>
          <span className="sidebar-label">
            academia<span className="brand-dot">.</span>
            <small>THE CAMPUS, CONNECTED</small>
          </span>
        </Link>
        <button
          className="workspace-switch"
          onClick={() => {
            setCollapsed((v) => !v);
            setMobile(false);
          }}
          aria-label="Collapse sidebar"
        >
          <span className="workspace-icon">A</span>
          <span className="sidebar-label">
            <strong>Academic Portal</strong>
            <small>{t.workspace}</small>
          </span>
          <PanelLeftClose size={15} className="sidebar-label" />
        </button>
        <div className="nav-section sidebar-label">{t.academic}</div>
        <nav>
          {links
            .filter((l) => l.visible)
            .map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobile(false)}
                title={collapsed ? label : undefined}
                className={cn('nav-link', path.startsWith(href) && 'nav-active')}
              >
                <Icon size={19} />
                <span className="sidebar-label">{label}</span>
                {path.startsWith(href) && <span className="nav-dot sidebar-label" />}
              </Link>
            ))}
        </nav>
        <div className="nav-section sidebar-label">{t.administration}</div>
        <nav>
          {canViewAudit(user.role) && (
            <Link
              href="/audit"
              onClick={() => setMobile(false)}
              className={cn('nav-link', path === '/audit' && 'nav-active')}
            >
              <ShieldCheck size={19} />
              <span className="sidebar-label">{t.audit}</span>
            </Link>
          )}
          <Link
            href="/settings"
            onClick={() => setMobile(false)}
            className={cn('nav-link', path === '/settings' && 'nav-active')}
          >
            <SlidersHorizontal size={19} />
            <span className="sidebar-label">{t.settings}</span>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="campus-note sidebar-label">
            <Sparkles size={20} />
            <strong>One campus. More possibility.</strong>
            <p>A better day starts with everything in one place.</p>
            <Link href="/settings">
              Your workspace <ChevronRight size={14} />
            </Link>
          </div>
          <div className="sidebar-profile">
            <span className="avatar avatar-purple">{initials(user.name)}</span>
            <span className="sidebar-label">
              <strong>{user.name}</strong>
              <small>{roleLabel(user.role)}</small>
            </span>
            <form action={logoutAction}>
              <button title={t.signOut} aria-label={t.signOut}>
                <LogOut size={17} />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumbs">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </Button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{current?.label ?? 'Student record'}</strong>
          </div>
          <div className="topbar-controls">
            {canViewAcademics(user.role) && (
              <form action="/search" className="global-search">
                <Search size={16} />
                <input name="q" placeholder={t.search} aria-label="Global search" maxLength={100} />
                <kbd>↵</kbd>
              </form>
            )}
            <form action={setLocaleAction}>
              <input type="hidden" name="locale" value={locale === 'en' ? 'km' : 'en'} />
              <button type="submit" className="locale-button" aria-label="Change language">
                {locale === 'en' ? 'EN' : 'ខ្មែរ'}
                <ChevronDown size={12} />
              </button>
            </form>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle color theme"
              onClick={toggleTheme}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </Button>
            <Link href="/settings" className="avatar avatar-peach" aria-label="My account">
              {initials(user.name)}
            </Link>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {children}
        </main>
        <footer className="app-footer">
          <span>Academia · A more connected campus</span>
          <span className="flex items-center gap-2">
            <span className="status-dot" />
            Academic core · Phase 1
          </span>
        </footer>
      </div>
      {mobile && (
        <Button
          className="mobile-close"
          size="icon"
          aria-label="Close menu"
          onClick={() => setMobile(false)}
        >
          <X />
        </Button>
      )}
    </div>
  );
}
