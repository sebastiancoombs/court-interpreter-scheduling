<template>
    <div v-if="pageReady" class="cis-landing">

        <!-- ── Hero ── -->
        <section class="cis-hero">
            <div class="cis-hero__geo" aria-hidden="true">
                <svg viewBox="0 0 1440 560" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="1200" cy="-60" r="320" fill="rgba(193,154,54,.07)"/>
                    <circle cx="1320" cy="400" r="180" fill="rgba(193,154,54,.05)"/>
                    <circle cx="-80" cy="480" r="260" fill="rgba(255,255,255,.03)"/>
                    <path d="M0 400 Q360 320 720 380 Q1080 440 1440 360 L1440 560 L0 560 Z" fill="rgba(0,26,61,.35)"/>
                </svg>
            </div>

            <div class="cis-hero__body">
                <!-- shield mark -->
                <div class="cis-hero__shield" aria-hidden="true">
                    <svg viewBox="0 0 80 88" width="80" height="88" xmlns="http://www.w3.org/2000/svg">
                        <path d="M40 4 L72 18 V40 C72 58 57 72 40 78 C23 72 8 58 8 40 V18 Z"
                              fill="#C19A36" stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>
                        <text x="40" y="50" text-anchor="middle"
                              font-family="Inter, system-ui, sans-serif"
                              font-size="24" font-weight="700" fill="#001a3d">CA</text>
                    </svg>
                </div>

                <p class="cis-hero__eyebrow">Judicial Council of California</p>
                <h1 class="cis-hero__title">Court Interpreter<br>Scheduling</h1>
                <p class="cis-hero__sub">
                    Streamlined booking and management of certified court interpreters<br class="d-none d-md-inline">
                    across California's superior courts.
                </p>

                <button class="cis-hero__cta" @click="login">
                    Sign In to the Portal
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="2"
                              stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        </section>

        <!-- ── Feature cards ── -->
        <section class="cis-features" aria-label="Features">
            <div class="cis-feature">
                <div class="cis-feature__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
                    </svg>
                </div>
                <h3 class="cis-feature__title">Manage Bookings</h3>
                <p class="cis-feature__body">Create, view, and track interpreter appointments with calendar and list views.</p>
            </div>

            <div class="cis-feature">
                <div class="cis-feature__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/>
                    </svg>
                </div>
                <h3 class="cis-feature__title">Interpreter Directory</h3>
                <p class="cis-feature__body">Browse certified interpreters by language, certification level, and availability.</p>
            </div>

            <div class="cis-feature">
                <div class="cis-feature__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        <line x1="9" y1="10" x2="15" y2="10"/><line x1="12" y1="7" x2="12" y2="13"/>
                    </svg>
                </div>
                <h3 class="cis-feature__title">70+ Languages</h3>
                <p class="cis-feature__body">Access qualified interpreters for Spanish, Mandarin, Vietnamese, and dozens more.</p>
            </div>
        </section>

        <!-- ── Contact strip ── -->
        <section class="cis-contact">
            <p class="cis-contact__label">Need assistance?</p>
            <div class="cis-contact__items">
                <a class="cis-contact__item" href="tel:6194507100">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.36 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.34 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    (619) 450-7100
                </a>
                <span class="cis-contact__sep" aria-hidden="true">·</span>
                <a class="cis-contact__item" href="mailto:interpreters@sdcourt.ca.gov">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    interpreters@sdcourt.ca.gov
                </a>
                <span class="cis-contact__sep" aria-hidden="true">·</span>
                <span class="cis-contact__item cis-contact__item--muted">Mon–Fri 7:30 am – 4:30 pm PT</span>
            </div>
        </section>

    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { SessionManager } from "@/components/utils/utils";
import { namespace } from "vuex-class";
import "@/store/modules/common";
const commonState = namespace("Common");

@Component
export default class LandingPage extends Vue {
    @commonState.State public userId!: string;
    pageReady = false;

    async mounted() {
        this.pageReady = false;
        if (this.$store.state.Common.token)
            await SessionManager.getUserInfo(this.$store);
        if (this.userId) {
            this.$router.push({ name: "bookings" });
        } else {
            this.pageReady = true;
        }
    }

    login() {
        this.$router.push({ name: "bookings" });
    }
}
</script>

<style scoped lang="scss">
.cis-landing {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 96px); // subtract topbar height
}

// ── Hero ──────────────────────────────────────────────────────
.cis-hero {
  position: relative;
  flex: 1 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 5rem 1.5rem 6rem;
  background: linear-gradient(160deg, #001a3d 0%, #002F65 50%, #003a7a 100%);
  overflow: hidden;
}

.cis-hero__geo {
  position: absolute;
  inset: 0;
  pointer-events: none;
  svg { width: 100%; height: 100%; }
}

.cis-hero__body {
  position: relative;
  z-index: 1;
  max-width: 640px;
}

.cis-hero__shield {
  display: inline-flex;
  margin-bottom: 1.5rem;
  filter: drop-shadow(0 4px 16px rgba(193,154,54,.35));
}

.cis-hero__eyebrow {
  font-size: .8rem;
  font-weight: 600;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #C19A36;
  margin: 0 0 .75rem;
}

.cis-hero__title {
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 700;
  color: #fff;
  line-height: 1.15;
  letter-spacing: -.02em;
  margin: 0 0 1.25rem;
}

.cis-hero__sub {
  font-size: 1.0625rem;
  color: rgba(255,255,255,.72);
  line-height: 1.6;
  margin: 0 0 2.5rem;
}

.cis-hero__cta {
  display: inline-flex;
  align-items: center;
  gap: .6rem;
  background: #C19A36;
  color: #001a3d;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: .01em;
  padding: .85rem 2rem;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color .15s, transform .15s, box-shadow .15s;
  box-shadow: 0 4px 20px rgba(193,154,54,.4);

  &:hover { background: #a8852f; transform: translateY(-2px); box-shadow: 0 6px 28px rgba(193,154,54,.5); }
  &:active { transform: translateY(0); }
  &:focus-visible { outline: 3px solid rgba(193,154,54,.6); outline-offset: 3px; }
}

// ── Feature cards ─────────────────────────────────────────────
.cis-features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  padding: 3rem 2rem;
  background: #f5f7fb;
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 2rem 1rem;
    gap: 1rem;
  }
}

.cis-feature {
  background: #fff;
  border: 1px solid rgba(15,23,42,.06);
  border-radius: .75rem;
  padding: 1.75rem 1.5rem;
  box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.05);
  transition: box-shadow .2s, transform .2s;

  &:hover { box-shadow: 0 8px 24px rgba(0,47,101,.1); transform: translateY(-2px); }
}

.cis-feature__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  background: rgba(0,47,101,.07);
  color: #002F65;
  border-radius: .625rem;
  margin-bottom: 1rem;
}

.cis-feature__title {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 .5rem;
}

.cis-feature__body {
  font-size: .9rem;
  color: #64748b;
  line-height: 1.55;
  margin: 0;
}

// ── Contact strip ─────────────────────────────────────────────
.cis-contact {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: .5rem 1rem;
  padding: 1.25rem 1.5rem;
  background: #fff;
  border-top: 1px solid #e5e7eb;
  font-size: .8375rem;
}

.cis-contact__label {
  font-weight: 600;
  color: #475569;
  margin: 0;
}

.cis-contact__items {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .25rem .75rem;
}

.cis-contact__item {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  color: #475569;
  text-decoration: none;
  transition: color .12s;

  &:hover { color: #002F65; }
  &--muted { color: #94a3b8; cursor: default; }
  &:hover { text-decoration: none; }
}

.cis-contact__sep { color: #cbd5e1; }

@media (max-width: 576px) {
  .cis-hero { padding: 4rem 1rem 5rem; }
  .cis-hero__title { font-size: 2rem; }
  .cis-contact { flex-direction: column; text-align: center; }
  .cis-contact__items { justify-content: center; }
  .cis-contact__sep { display: none; }
}
</style>
