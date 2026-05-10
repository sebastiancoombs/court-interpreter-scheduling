// Server-side renderer for the unified JCC topbar — produces the same DOM
// structure as integration/topbar/topbar.html.tmpl + the Vue/PHP renderers,
// so a Metabase HTML response wears identical chrome to bcgov + EA.

import { env } from '../shared/env.ts';

export type TopbarTab =
  | 'bookings' | 'calendar' | 'add_booking'
  | 'interpreters' | 'languages' | 'rates'
  | 'reports' | 'audit' | 'admin';

export interface TopbarUser {
  initials?: string;
  displayName?: string;
}

export interface TopbarOptions {
  active: TopbarTab;
  user?: TopbarUser;
  envBadge?: string;
}

const escape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function renderTopbar(opts: TopbarOptions): string {
  // When EA + bcgov share the unified host (Caddy front door),
  // root-relative paths land on the right subsystem via path routing.
  // EA also uses clean paths because Config::index_page is empty.
  // Reports stays host-relative `/metabase/` — the SSO sidecar serves
  // itself from the same host the topbar was rendered for.
  const unified = env.bcgov.baseUrl === env.ea.baseUrl;
  const eaCalendar   = unified ? `${env.ea.baseUrl}/calendar` : `${env.ea.baseUrl}/index.php/calendar`;
  const eaAddBooking = unified ? `${env.ea.baseUrl}/booking`  : `${env.ea.baseUrl}/`;
  const links = {
    bookings:     `${env.bcgov.baseUrl}/bookings`,
    calendar:     eaCalendar,
    add_booking:  eaAddBooking,
    interpreters: `${env.bcgov.baseUrl}/directory`,
    languages:    `${env.bcgov.baseUrl}/language`,
    rates:        `${env.bcgov.baseUrl}/rates`,
    reports:      `/metabase/`,
    audit:        `${env.bcgov.baseUrl}/audit-booking`,
    admin:        `${env.bcgov.baseUrl}/user-role`,
  };

  const user = opts.user ?? {};
  const initials = escape(user.initials ?? '');
  const displayName = escape(user.displayName ?? '');
  const showUserPill = initials || displayName;

  const tabs: Array<{ key: TopbarTab; label: string; href: string }> = [
    { key: 'bookings',     label: 'Manage Bookings', href: links.bookings },
    { key: 'calendar',     label: 'Calendar',        href: links.calendar },
    { key: 'add_booking',  label: 'Add Booking',     href: links.add_booking },
    { key: 'interpreters', label: 'Interpreters',    href: links.interpreters },
    { key: 'languages',    label: 'Languages',       href: links.languages },
    { key: 'rates',        label: 'Rates',           href: links.rates },
    { key: 'reports',      label: 'Reports',         href: links.reports },
    { key: 'audit',        label: 'Audit',           href: links.audit },
    { key: 'admin',        label: 'Admin',           href: links.admin },
  ];

  const tabHtml = tabs
    .map((t) => {
      const activeAttr = t.key === opts.active ? ' data-active' : '';
      return `<a class="cis-tab" data-active-key="${t.key}"${activeAttr} href="${escape(t.href)}">${escape(t.label)}</a>`;
    })
    .join('\n    ');

  const envBadge = opts.envBadge
    ? `<span class="cis-tab__badge">${escape(opts.envBadge)}</span>`
    : '';

  const userPill = showUserPill
    ? `<button class="cis-user-pill" type="button" aria-haspopup="menu">
        <span class="cis-avatar">${initials}</span>
        <span class="cis-user-pill__name">${displayName}</span>
      </button>`
    : '';

  return `
<header class="cis-topbar" data-cis-source="metabase-sso">
  <div class="cis-topbar__brand-row">
    <a class="cis-brand" href="${escape(links.bookings)}" aria-label="Court Interpreter Scheduling — JCC home">
      <span class="cis-brand__mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" width="32" height="32" focusable="false">
          <path d="M20 4 L34 11 V21 C34 28 28 34 20 36 C12 34 6 28 6 21 V11 Z" fill="#C19A36" stroke="#fff" stroke-width="1.5"/>
          <text x="20" y="25" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="700" fill="#001a3d">CA</text>
        </svg>
      </span>
      <span class="cis-brand__meta">
        <span class="cis-brand__pre">Judicial Council of California</span>
        <span class="cis-brand__name">Court Interpreter Scheduling</span>
      </span>
    </a>
    <div class="cis-topbar__actions">${userPill}</div>
  </div>
  <nav class="cis-subnav" aria-label="Primary">
    ${tabHtml}
    ${envBadge}
  </nav>
</header>
`;
}
