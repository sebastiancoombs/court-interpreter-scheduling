<template>
    <header class="cis-topbar">
        <div class="cis-topbar__brand-row">
            <a class="cis-brand" :href="links.bookings" aria-label="Court Interpreter Scheduling — JCC home">
                <span class="cis-brand__mark" aria-hidden="true">
                    <svg viewBox="0 0 40 40" width="32" height="32" focusable="false">
                        <path d="M20 4 L34 11 V21 C34 28 28 34 20 36 C12 34 6 28 6 21 V11 Z"
                              fill="#C19A36" stroke="#fff" stroke-width="1.5"/>
                        <text x="20" y="25" text-anchor="middle" font-family="Inter, system-ui, sans-serif"
                              font-size="13" font-weight="700" fill="#001a3d">CA</text>
                    </svg>
                </span>
                <span class="cis-brand__meta">
                    <span class="cis-brand__pre">Judicial Council of California</span>
                    <span class="cis-brand__name">Court Interpreter Scheduling</span>
                </span>
            </a>

            <div class="cis-topbar__actions" v-if="userName">
                <select class="cis-court-select"
                        v-model="selectedLocation"
                        @change="onLocationChange"
                        aria-label="Court location">
                    <option v-for="loc in sortedCourtLocations" :key="loc.id" :value="loc.id">{{ loc.name }}</option>
                </select>
                <button class="cis-user-pill" type="button" @click="logout">
                    <span class="cis-avatar">{{ initials }}</span>
                    <span class="cis-user-pill__name">{{ userName }}</span>
                </button>
            </div>
        </div>

        <nav class="cis-subnav" aria-label="Primary" v-if="userName">
            <a v-for="tab in tabs"
               :key="tab.key"
               :href="tab.href"
               :data-active="active === tab.key ? '' : null"
               class="cis-tab">{{ tab.label }}</a>
            <span class="cis-tab__badge" v-if="env">{{ env }}</span>
        </nav>
    </header>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import { Route } from 'vue-router';
import { namespace } from 'vuex-class';
import * as _ from 'underscore';
import { SessionManager } from '@/components/utils/utils';
import { locationsInfoType } from '@/types/Common/json';
import '@/store/modules/common';

const commonState = namespace('Common');

interface Tab { key: string; label: string; href: string; }

@Component
export default class UnifiedTopbar extends Vue {
    @commonState.State public userName!: string;
    @commonState.State public courtLocations!: locationsInfoType[];
    @commonState.State public userLocation!: locationsInfoType;
    @commonState.Action public UpdateUserLocation!: (l: locationsInfoType) => void;

    selectedLocation: number | null = null;

    // Companion URLs — env-driven with smart defaults.
    // When the page is reached via the Caddy front door (port 8000/8443 or
    // any deployment without a port suffix) every companion lives on the
    // same host, so root-relative paths are correct and the URL bar shows
    // no port-leaks or `/index.php/` prefixes. Direct-port dev hits :8080
    // and falls back to absolute URLs into the EA + Metabase containers.
    private envOr(key: string, fallback: string): string {
        const w = window as any;
        return (w.CIS_LINKS && w.CIS_LINKS[key]) ?? fallback;
    }
    private get unified(): boolean {
        const port = (typeof window !== 'undefined' ? window.location.port : '') ?? '';
        return port === '' || port === '8000' || port === '8443';
    }
    get bcgovBase(): string { return this.envOr('bcgov', ''); }
    get eaBase():    string {
        return this.envOr('ea', this.unified ? '' : 'http://localhost:8085');
    }
    // Reports go through the metabase-sso sidecar (which injects the
    // unified topbar into Metabase HTML). Caddy mounts the sidecar at
    // `/reports`; direct-port dev hits the sidecar at :8091/metabase.
    get mbBase():    string {
        return this.envOr('metabase', this.unified ? '/reports' : 'http://localhost:8091/metabase');
    }

    get links() {
        // EA's calendar/booking paths drop `/index.php/` when reached
        // through the Caddy front door (since `Config::index_page = ''`
        // and Caddy proxies clean paths to EA's nginx).
        const eaCalendar    = this.unified ? '/calendar' : `${this.eaBase}/index.php/calendar`;
        const eaAddBooking  = this.unified ? '/booking'  : `${this.eaBase}/`;
        return {
            bookings:     `${this.bcgovBase}/bookings`,
            calendar:     eaCalendar,
            add_booking:  eaAddBooking,
            interpreters: `${this.bcgovBase}/directory`,
            languages:    `${this.bcgovBase}/language`,
            rates:        `${this.bcgovBase}/rates`,
            reports:      this.mbBase,
            audit:        `${this.bcgovBase}/audit-booking`,
            admin:        `${this.bcgovBase}/user-role`,
        };
    }

    get tabs(): Tab[] {
        return [
            { key: 'bookings',     label: 'Manage Bookings', href: this.links.bookings },
            { key: 'calendar',     label: 'Calendar',        href: this.links.calendar },
            { key: 'add_booking',  label: 'Add Booking',     href: this.links.add_booking },
            { key: 'interpreters', label: 'Interpreters',    href: this.links.interpreters },
            { key: 'languages',    label: 'Languages',       href: this.links.languages },
            { key: 'rates',        label: 'Rates',           href: this.links.rates },
            { key: 'reports',      label: 'Reports',         href: this.links.reports },
            { key: 'audit',        label: 'Audit',           href: this.links.audit },
            { key: 'admin',        label: 'Admin',           href: this.links.admin },
        ];
    }

    get active(): string {
        const path = this.$route?.path ?? window.location.pathname;
        if (/\/bookings/.test(path)) return 'bookings';
        if (/\/create/.test(path)) return 'add_booking';
        if (/\/directory/.test(path)) return 'interpreters';
        if (/\/language/.test(path)) return 'languages';
        if (/\/rates/.test(path)) return 'rates';
        if (/\/audit/.test(path)) return 'audit';
        if (/\/user-role|\/update-geo/.test(path)) return 'admin';
        return 'bookings';
    }

    get env(): string {
        const host = window.location.host;
        if (/0\.0\.0\.0|localhost|dev\./.test(host)) return 'DEV';
        if (/test\./.test(host)) return 'TEST';
        return '';
    }

    get sortedCourtLocations() { return _.sortBy(this.courtLocations ?? [], 'name'); }

    get initials(): string {
        if (!this.userName) return '';
        const parts = this.userName.trim().split(/\s+/);
        return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
    }

    @Watch('userLocation', { immediate: true })
    onUserLocation() { this.selectedLocation = this.userLocation?.id ?? null; }

    onLocationChange() {
        const loc = (this.courtLocations ?? []).find(l => l.id === this.selectedLocation);
        if (!loc) return;
        this.$http.put('/user-info/save-location', { locationId: loc.id })
            .then(() => this.UpdateUserLocation(loc), () => { /* ignored */ });
    }

    logout() { SessionManager.logout(this.$store); }

    mounted() {
        // Load the canonical topbar CSS so any companion (EA, Metabase)
        // that injects this component also gets the design tokens.
        // Override at runtime via window.CIS_TOPBAR_CSS.
        const href = (window as any).CIS_TOPBAR_CSS ?? '/topbar.css';
        if (!document.querySelector(`link[href="${href}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }
        document.body.classList.add('cis-topbar-mounted');
    }
}
</script>
