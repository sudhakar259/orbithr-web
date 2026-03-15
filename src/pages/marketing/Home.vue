<script setup lang="ts">
const features = [
  { icon: '👥', title: 'Employee Directory',       desc: 'Smart profiles, org charts, documents, and full lifecycle management from hire to offboard.' },
  { icon: '⏱️', title: 'Attendance & Timesheets',  desc: 'Shifts, check-ins, geofencing, regularizations and insightful daily/monthly reports.' },
  { icon: '🏝️', title: 'Leave Management',         desc: 'Policy-based accruals, holiday calendars, manager approvals and self-serve requests.' },
  { icon: '💸', title: 'Payroll',                  desc: 'Run compliant payroll in minutes. Automated tax, PF, ESI and one-click payslips.' },
  { icon: '📈', title: 'Performance',              desc: 'Goals, 360° reviews, continuous feedback, 1:1s and growth plans — all in one place.' },
  { icon: '🎯', title: 'Recruitment',              desc: 'ATS with pipeline boards, careers page, interview scheduling and offer management.' },
  { icon: '📚', title: 'Training',                 desc: 'Plan and track programs, measure adoption, and keep your team growing continuously.' },
  { icon: '🔧', title: 'Asset Management',         desc: 'Track hardware assigned to employees, manage returns and maintain your inventory.' },
  { icon: '📢', title: 'Announcements',            desc: 'Broadcast policy updates, events and urgent notices to the entire company instantly.' },
]

const stats = [
  { v: '500+', l: 'Companies onboarded' },
  { v: '50k+', l: 'Employees managed'  },
  { v: '99.9%', l: 'Uptime SLA'         },
  { v: '4.9★',  l: 'Average rating'     },
]

const trustedBy = ['Acme Corp', 'Skyline', 'Pixelware', 'Velocity', 'Nimbus', 'Quantum']

const testimonials = [
  { quote: 'OrbitHR replaced three separate tools for us. Attendance, payroll and leaves are finally in sync.', name: 'Priya Reddy', role: 'Head of HR, Skyline Tech', initials: 'PR', grad: 'linear-gradient(135deg,#4F7EFF,#9B6EFF)' },
  { quote: 'The module system is brilliant — we started with the free tier and unlocked payroll as we grew.', name: 'Arjun Kulkarni', role: 'CTO, Pixelware', initials: 'AK', grad: 'linear-gradient(135deg,#36D399,#4F7EFF)' },
  { quote: 'Setup took less than a day. The invite flow and role controls are exactly what we needed.', name: 'Neha Kapoor', role: 'Ops Lead, Nimbus', initials: 'NK', grad: 'linear-gradient(135deg,#9B6EFF,#36D399)' },
]

const plans = [
  {
    name: 'Starter', price: '₹1,999', period: '/mo', desc: 'Up to 25 employees',
    features: ['Employee Directory', 'Attendance & Leaves', 'Holiday Calendar', 'Email support'],
    cta: '/register', ctaLabel: 'Start free trial', highlight: false,
  },
  {
    name: 'Growth', price: '₹4,999', period: '/mo', desc: 'Up to 150 employees',
    features: ['Everything in Starter', 'Payroll & Payslips', 'Performance Reviews', 'Training & Assets', 'Priority support'],
    cta: '/register', ctaLabel: 'Start free trial', highlight: true,
  },
  {
    name: 'Enterprise', price: 'Custom', period: '', desc: 'Unlimited employees',
    features: ['Everything in Growth', 'SSO & SCIM', 'Dedicated CSM', 'Custom integrations', 'SLA guarantee'],
    cta: '/pricing', ctaLabel: 'Contact sales', highlight: false,
  },
]
</script>

<template>
  <div class="home">

    <!-- ── Hero ─────────────────────────────────────────── -->
    <section class="hero">
      <div class="hero-glow hero-glow-1"></div>
      <div class="hero-glow hero-glow-2"></div>

      <div class="hero-inner">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          New — Payroll 2.0 with automated TDS & PF
        </div>

        <h1 class="hero-h1">
          HR software your<br />
          <span class="hero-accent">team will actually use</span>
        </h1>

        <p class="hero-sub">
          Directory, attendance, leaves, payroll, performance and recruitment
          — unified in one beautiful platform. Built for Indian teams.
        </p>

        <div class="hero-cta">
          <RouterLink to="/register" class="btn-hero-primary">
            Start free trial
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
          </RouterLink>
          <RouterLink to="/pricing" class="btn-hero-ghost">View pricing</RouterLink>
        </div>

        <div class="hero-trust">
          <div class="trust-avatars">
            <div v-for="(c, i) in ['PR','AK','NK','DS','RS']" :key="c" class="trust-av" :style="{ zIndex: 5 - i, background: ['linear-gradient(135deg,#4F7EFF,#9B6EFF)','linear-gradient(135deg,#36D399,#4F7EFF)','linear-gradient(135deg,#F9A825,#FF6B6B)','linear-gradient(135deg,#FF6B6B,#9B6EFF)','linear-gradient(135deg,#9B6EFF,#36D399)'][i] }">{{ c }}</div>
          </div>
          <span class="trust-text">Trusted by <strong>500+ companies</strong> across India</span>
        </div>
      </div>

      <!-- Dashboard mockup -->
      <div class="hero-mockup">
        <div class="mock-window">
          <div class="mock-topbar">
            <div class="mock-dot" style="background:#FF6B6B"></div>
            <div class="mock-dot" style="background:#F9A825"></div>
            <div class="mock-dot" style="background:#36D399"></div>
            <div class="mock-url">orbithr.app/dashboard</div>
          </div>
          <div class="mock-body">
            <div class="mock-sidebar">
              <div class="ms-logo">O<span>HR</span></div>
              <div v-for="item in ['Dashboard','Employees','Attendance','Payroll','Leave']" :key="item" class="ms-item" :class="{ active: item === 'Dashboard' }">{{ item }}</div>
            </div>
            <div class="mock-content">
              <div class="mock-kpis">
                <div class="mkpi" v-for="(kpi, i) in [{ v: '248', l: 'Employees', c: '#4F7EFF' }, { v: '94%', l: 'Present today', c: '#36D399' }, { v: '₹18.4L', l: 'Payroll this month', c: '#9B6EFF' }, { v: '12', l: 'Pending approvals', c: '#F9A825' }]" :key="i" :style="{ '--c': kpi.c }">
                  <div class="mkpi-v">{{ kpi.v }}</div>
                  <div class="mkpi-l">{{ kpi.l }}</div>
                </div>
              </div>
              <div class="mock-chart">
                <div class="mc-label">Attendance — this week</div>
                <div class="mc-bars">
                  <div v-for="(h, i) in [78, 92, 88, 95, 82, 60, 45]" :key="i" class="mc-bar-wrap">
                    <div class="mc-bar" :style="{ height: h + '%' }"></div>
                    <div class="mc-day">{{ ['M','T','W','T','F','S','S'][i] }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Floating badges -->
        <div class="float-badge fb-1">✓ Payslip generated</div>
        <div class="float-badge fb-2">👤 New hire: Priya R.</div>
        <div class="float-badge fb-3">📅 Leave approved</div>
      </div>
    </section>

    <!-- ── Trusted by ─────────────────────────────────── -->
    <section class="trusted-bar">
      <div class="tb-inner">
        <span class="tb-label">Trusted by fast-growing teams</span>
        <div class="tb-logos">
          <div v-for="name in trustedBy" :key="name" class="tb-logo">{{ name }}</div>
        </div>
      </div>
    </section>

    <!-- ── Stats ──────────────────────────────────────── -->
    <section class="stats-section">
      <div class="stats-grid">
        <div v-for="(s, i) in stats" :key="s.l" class="stat-item" :style="{ '--i': i }">
          <div class="si-val">{{ s.v }}</div>
          <div class="si-label">{{ s.l }}</div>
        </div>
      </div>
    </section>

    <!-- ── Features ───────────────────────────────────── -->
    <section class="features-section">
      <div class="sec-head">
        <div class="sec-badge">Features</div>
        <h2 class="sec-h2">Everything HR in one place</h2>
        <p class="sec-sub">Powerful modules that work beautifully together so your team can focus on people, not paperwork.</p>
      </div>
      <div class="features-grid">
        <div v-for="(f, i) in features" :key="f.title" class="feat-card" :style="{ '--i': i }">
          <div class="fc-icon">{{ f.icon }}</div>
          <div class="fc-title">{{ f.title }}</div>
          <div class="fc-desc">{{ f.desc }}</div>
        </div>
      </div>
    </section>

    <!-- ── How it works ───────────────────────────────── -->
    <section class="hiw-section">
      <div class="sec-head">
        <div class="sec-badge">How it works</div>
        <h2 class="sec-h2">Up and running in minutes</h2>
        <p class="sec-sub">No lengthy implementation. No consultants. Just sign up and go.</p>
      </div>
      <div class="hiw-steps">
        <div v-for="(step, i) in [
          { n: '01', title: 'Create your workspace', desc: 'Register with your company email. Your dedicated subdomain is ready instantly.' },
          { n: '02', title: 'Invite your team', desc: 'Add employees via CSV or invite link. Roles and permissions set automatically.' },
          { n: '03', title: 'Activate modules', desc: 'Start with the free core modules. Unlock payroll, performance and more as you grow.' },
          { n: '04', title: 'Run HR effortlessly', desc: 'Your team checks in, applies leaves, views payslips — all from one beautiful interface.' },
        ]" :key="step.n" class="hiw-step">
          <div class="hiw-num">{{ step.n }}</div>
          <div class="hiw-connector" v-if="i < 3"></div>
          <div class="hiw-card">
            <div class="hiw-title">{{ step.title }}</div>
            <div class="hiw-desc">{{ step.desc }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Testimonials ───────────────────────────────── -->
    <section class="testi-section">
      <div class="sec-head">
        <div class="sec-badge">Testimonials</div>
        <h2 class="sec-h2">Loved by HR teams</h2>
      </div>
      <div class="testi-grid">
        <div v-for="t in testimonials" :key="t.name" class="testi-card">
          <div class="tc-stars">★★★★★</div>
          <div class="tc-quote">"{{ t.quote }}"</div>
          <div class="tc-author">
            <div class="tc-av" :style="{ background: t.grad }">{{ t.initials }}</div>
            <div>
              <div class="tc-name">{{ t.name }}</div>
              <div class="tc-role">{{ t.role }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Pricing ────────────────────────────────────── -->
    <section class="pricing-section">
      <div class="sec-head">
        <div class="sec-badge">Pricing</div>
        <h2 class="sec-h2">Simple, transparent pricing</h2>
        <p class="sec-sub">Only pay for what you need. Cancel anytime. No hidden fees.</p>
      </div>
      <div class="pricing-grid">
        <div v-for="plan in plans" :key="plan.name" class="plan-card" :class="{ popular: plan.highlight }">
          <div v-if="plan.highlight" class="pop-badge">Most popular</div>
          <div class="plan-name">{{ plan.name }}</div>
          <div class="plan-desc">{{ plan.desc }}</div>
          <div class="plan-price">
            {{ plan.price }}<span v-if="plan.period" class="plan-period">{{ plan.period }}</span>
          </div>
          <ul class="plan-features">
            <li v-for="f in plan.features" :key="f">
              <span class="pf-check">✓</span> {{ f }}
            </li>
          </ul>
          <RouterLink :to="plan.cta" class="plan-btn" :class="{ 'plan-btn-primary': plan.highlight }">
            {{ plan.ctaLabel }}
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- ── CTA ────────────────────────────────────────── -->
    <section class="cta-section">
      <div class="cta-box">
        <div class="cta-glow"></div>
        <div class="cta-inner">
          <div class="cta-left">
            <h3 class="cta-h3">Ready to transform your HR?</h3>
            <p class="cta-sub">Start your 14-day free trial. No credit card required. Cancel anytime.</p>
            <div class="cta-checks">
              <span v-for="c in ['Free onboarding', 'Dedicated support', 'Cancel anytime']" :key="c" class="cta-check">
                <span class="cc-icon">✓</span> {{ c }}
              </span>
            </div>
          </div>
          <div class="cta-right">
            <RouterLink to="/register" class="btn-cta-primary">Create your workspace →</RouterLink>
            <RouterLink to="/pricing" class="btn-cta-ghost">View all plans</RouterLink>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
/* ── Base ──────────────────────────────────────────── */
.home {
  background: #0C0E14;
  color: #E8EAF0;
  font-family: 'DM Sans', Inter, system-ui, sans-serif;
  overflow-x: hidden;
}

/* ── Hero ──────────────────────────────────────────── */
.hero {
  position: relative;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 60px;
  padding: 100px 80px 80px;
  overflow: hidden;
}
.hero-glow {
  position: absolute; border-radius: 50%; filter: blur(120px); pointer-events: none;
}
.hero-glow-1 {
  width: 600px; height: 600px; top: -100px; left: -100px;
  background: radial-gradient(circle, rgba(79,126,255,.18) 0%, transparent 70%);
}
.hero-glow-2 {
  width: 500px; height: 500px; bottom: -50px; right: 30%;
  background: radial-gradient(circle, rgba(155,110,255,.14) 0%, transparent 70%);
}

.hero-inner { position: relative; z-index: 1; }

.hero-badge {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(79,126,255,.1); border: 1px solid rgba(79,126,255,.25);
  border-radius: 100px; padding: 6px 14px;
  font-size: 12px; font-weight: 600; color: #4F7EFF; margin-bottom: 24px;
}
.badge-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #4F7EFF;
  box-shadow: 0 0 8px #4F7EFF; animation: pulse 2s ease infinite;
}
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }

.hero-h1 {
  font-size: clamp(36px, 4.5vw, 58px); font-weight: 800;
  line-height: 1.12; letter-spacing: -1.5px; color: #E8EAF0; margin-bottom: 20px;
}
.hero-accent {
  background: linear-gradient(90deg, #4F7EFF, #9B6EFF);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-sub {
  font-size: 17px; line-height: 1.7; color: #9CA3AF; margin-bottom: 36px; max-width: 480px;
}

.hero-cta { display: flex; gap: 12px; margin-bottom: 36px; flex-wrap: wrap; }
.btn-hero-primary {
  display: inline-flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF); color: #fff;
  border: none; border-radius: 12px; padding: 14px 28px;
  font-size: 15px; font-weight: 600; text-decoration: none;
  box-shadow: 0 0 32px rgba(79,126,255,.4); transition: all .2s;
}
.btn-hero-primary:hover { transform: translateY(-2px); box-shadow: 0 0 44px rgba(79,126,255,.55); }
.btn-hero-ghost {
  display: inline-flex; align-items: center;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12);
  border-radius: 12px; padding: 14px 28px;
  font-size: 15px; font-weight: 600; color: #E8EAF0; text-decoration: none; transition: all .2s;
}
.btn-hero-ghost:hover { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.2); }

.hero-trust { display: flex; align-items: center; gap: 12px; }
.trust-avatars { display: flex; }
.trust-av {
  width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center;
  font-size: 10px; font-weight: 700; color: #fff;
  border: 2px solid #0C0E14; margin-left: -8px;
}
.trust-av:first-child { margin-left: 0; }
.trust-text { font-size: 13px; color: #9CA3AF; }
.trust-text strong { color: #E8EAF0; }

/* Dashboard mockup */
.hero-mockup {
  position: relative; z-index: 1;
  animation: floatUp .8s ease both;
}
@keyframes floatUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

.mock-window {
  background: #141720; border: 1px solid rgba(255,255,255,.09);
  border-radius: 16px; overflow: hidden;
  box-shadow: 0 40px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(79,126,255,.12);
}
.mock-topbar {
  display: flex; align-items: center; gap: 6px;
  background: #0D0F1A; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,.06);
}
.mock-dot { width: 10px; height: 10px; border-radius: 50%; }
.mock-url {
  background: rgba(255,255,255,.05); border-radius: 6px;
  padding: 3px 10px; font-size: 11px; color: #6B7280; margin-left: 8px;
}

.mock-body { display: flex; }
.mock-sidebar {
  width: 130px; background: #0D0F1A; border-right: 1px solid rgba(255,255,255,.05);
  padding: 14px 10px; display: flex; flex-direction: column; gap: 3px; flex-shrink: 0;
}
.ms-logo { font-weight: 800; font-size: 13px; color: #E8EAF0; padding: 4px 8px 12px; }
.ms-logo span { color: #4F7EFF; }
.ms-item { font-size: 11px; color: #6B7280; padding: 5px 8px; border-radius: 5px; cursor: default; }
.ms-item.active { background: rgba(79,126,255,.15); color: #4F7EFF; }

.mock-content { flex: 1; padding: 14px; }
.mock-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.mkpi {
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
  border-radius: 8px; padding: 8px 10px;
}
.mkpi-v { font-size: 16px; font-weight: 700; color: var(--c, #4F7EFF); line-height: 1; }
.mkpi-l { font-size: 9px; color: #6B7280; margin-top: 2px; }

.mock-chart { background: rgba(255,255,255,.02); border-radius: 8px; padding: 10px; }
.mc-label { font-size: 9px; color: #6B7280; margin-bottom: 8px; }
.mc-bars { display: flex; align-items: flex-end; gap: 4px; height: 60px; }
.mc-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; height: 100%; justify-content: flex-end; }
.mc-bar { width: 100%; background: linear-gradient(180deg, #4F7EFF, rgba(79,126,255,.3)); border-radius: 3px 3px 0 0; min-height: 4px; }
.mc-day { font-size: 8px; color: #6B7280; }

/* Floating badges */
.float-badge {
  position: absolute; background: #1C2030; border: 1px solid rgba(255,255,255,.12);
  border-radius: 100px; padding: 6px 14px; font-size: 11px; font-weight: 600; color: #E8EAF0;
  box-shadow: 0 8px 24px rgba(0,0,0,.4); white-space: nowrap;
  animation: floatBadge 3s ease infinite;
}
.fb-1 { bottom: -16px; left: 20px; animation-delay: 0s; }
.fb-2 { top: 30px; right: -20px; animation-delay: 1s; }
.fb-3 { bottom: 40px; right: -10px; animation-delay: 2s; }
@keyframes floatBadge { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }

/* ── Trusted by ────────────────────────────────────── */
.trusted-bar {
  border-top: 1px solid rgba(255,255,255,.06);
  border-bottom: 1px solid rgba(255,255,255,.06);
  background: rgba(255,255,255,.02);
  padding: 24px 80px;
}
.tb-inner { display: flex; align-items: center; gap: 40px; }
.tb-label { font-size: 12px; color: #6B7280; white-space: nowrap; font-weight: 500; }
.tb-logos { display: flex; gap: 40px; flex-wrap: wrap; }
.tb-logo { font-size: 13px; font-weight: 700; color: #4B5563; letter-spacing: 1px; text-transform: uppercase; transition: color .2s; cursor: default; }
.tb-logo:hover { color: #9CA3AF; }

/* ── Stats ─────────────────────────────────────────── */
.stats-section { padding: 60px 80px; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: rgba(255,255,255,.06); border-radius: 16px; overflow: hidden; }
.stat-item {
  background: #0C0E14; padding: 32px 24px; text-align: center;
  animation: fadeUp .5s ease calc(var(--i, 0) * .1s) both;
}
.si-val { font-size: 36px; font-weight: 800; letter-spacing: -1px; color: #E8EAF0; margin-bottom: 6px; }
.si-label { font-size: 13px; color: #6B7280; }

/* ── Section common ────────────────────────────────── */
.sec-head { text-align: center; margin-bottom: 52px; }
.sec-badge {
  display: inline-block; font-size: 11px; font-weight: 700;
  letter-spacing: 1.2px; text-transform: uppercase; color: #4F7EFF;
  background: rgba(79,126,255,.1); border: 1px solid rgba(79,126,255,.2);
  border-radius: 100px; padding: 5px 14px; margin-bottom: 14px;
}
.sec-h2 { font-size: clamp(28px, 3vw, 40px); font-weight: 800; letter-spacing: -1px; color: #E8EAF0; margin-bottom: 12px; }
.sec-sub { font-size: 15px; color: #9CA3AF; max-width: 520px; margin: 0 auto; line-height: 1.7; }

/* ── Features ──────────────────────────────────────── */
.features-section { padding: 80px; }
.features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.feat-card {
  background: #141720; border: 1px solid rgba(255,255,255,.07);
  border-radius: 16px; padding: 24px;
  transition: all .25s; cursor: default;
  animation: fadeUp .4s ease calc(var(--i, 0) * .05s) both;
}
.feat-card:hover { border-color: rgba(79,126,255,.35); transform: translateY(-3px); box-shadow: 0 16px 40px rgba(0,0,0,.3), 0 0 0 1px rgba(79,126,255,.1); }
.fc-icon { font-size: 28px; margin-bottom: 14px; }
.fc-title { font-size: 15px; font-weight: 700; color: #E8EAF0; margin-bottom: 8px; }
.fc-desc { font-size: 13px; color: #6B7280; line-height: 1.7; }

/* ── How it works ──────────────────────────────────── */
.hiw-section { padding: 80px; background: rgba(255,255,255,.015); }
.hiw-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; position: relative; }
.hiw-step { display: flex; flex-direction: column; align-items: center; text-align: center; }
.hiw-num {
  width: 48px; height: 48px; border-radius: 50%;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF); color: #fff;
  display: grid; place-items: center; font-size: 13px; font-weight: 800;
  margin-bottom: 16px; box-shadow: 0 0 24px rgba(79,126,255,.4); flex-shrink: 0;
}
.hiw-connector {
  display: none;
}
.hiw-card { display: flex; flex-direction: column; }
.hiw-title { font-size: 15px; font-weight: 700; color: #E8EAF0; margin-bottom: 8px; }
.hiw-desc { font-size: 13px; color: #6B7280; line-height: 1.65; }

/* ── Testimonials ──────────────────────────────────── */
.testi-section { padding: 80px; }
.testi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.testi-card {
  background: #141720; border: 1px solid rgba(255,255,255,.07);
  border-radius: 16px; padding: 28px;
  transition: border-color .2s;
}
.testi-card:hover { border-color: rgba(79,126,255,.3); }
.tc-stars { color: #F9A825; font-size: 14px; margin-bottom: 14px; letter-spacing: 2px; }
.tc-quote { font-size: 14px; color: #9CA3AF; line-height: 1.75; margin-bottom: 20px; font-style: italic; }
.tc-author { display: flex; align-items: center; gap: 12px; }
.tc-av {
  width: 38px; height: 38px; border-radius: 50%; display: grid;
  place-items: center; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.tc-name { font-size: 13px; font-weight: 600; color: #E8EAF0; }
.tc-role { font-size: 11px; color: #6B7280; margin-top: 2px; }

/* ── Pricing ───────────────────────────────────────── */
.pricing-section { padding: 80px; }
.pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: start; }
.plan-card {
  background: #141720; border: 1px solid rgba(255,255,255,.08);
  border-radius: 20px; padding: 32px; position: relative;
  transition: border-color .2s;
}
.plan-card.popular {
  border-color: rgba(79,126,255,.5);
  background: linear-gradient(180deg, rgba(79,126,255,.06) 0%, #141720 60%);
  box-shadow: 0 0 60px rgba(79,126,255,.15);
}
.pop-badge {
  position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF); color: #fff;
  font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 100px;
  white-space: nowrap;
}
.plan-name { font-size: 16px; font-weight: 700; color: #E8EAF0; margin-bottom: 4px; }
.plan-desc { font-size: 12px; color: #6B7280; margin-bottom: 20px; }
.plan-price { font-size: 36px; font-weight: 800; color: #E8EAF0; letter-spacing: -1px; margin-bottom: 24px; }
.plan-period { font-size: 14px; font-weight: 400; color: #6B7280; }
.plan-features { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
.plan-features li { font-size: 13px; color: #9CA3AF; display: flex; align-items: center; gap: 8px; }
.pf-check { color: #36D399; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.plan-btn {
  display: block; text-align: center; border-radius: 10px; padding: 12px;
  font-size: 14px; font-weight: 600; text-decoration: none; transition: all .15s;
  background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); color: #E8EAF0;
}
.plan-btn:hover { background: rgba(255,255,255,.12); }
.plan-btn.plan-btn-primary {
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF); border: none; color: #fff;
  box-shadow: 0 0 28px rgba(79,126,255,.4);
}
.plan-btn.plan-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 0 40px rgba(79,126,255,.55); }

/* ── CTA ───────────────────────────────────────────── */
.cta-section { padding: 80px; }
.cta-box {
  position: relative; border-radius: 24px; overflow: hidden;
  background: linear-gradient(135deg, #0D1628 0%, #111628 50%, #13102A 100%);
  border: 1px solid rgba(79,126,255,.25);
  box-shadow: 0 0 80px rgba(79,126,255,.12);
  padding: 60px 64px;
}
.cta-glow {
  position: absolute; top: -80px; left: 50%; transform: translateX(-50%);
  width: 600px; height: 300px;
  background: radial-gradient(ellipse, rgba(79,126,255,.18) 0%, transparent 70%);
  pointer-events: none;
}
.cta-inner { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr auto; gap: 48px; align-items: center; }
.cta-h3 { font-size: 32px; font-weight: 800; letter-spacing: -.8px; color: #E8EAF0; margin-bottom: 10px; }
.cta-sub { font-size: 15px; color: #9CA3AF; margin-bottom: 20px; }
.cta-checks { display: flex; gap: 20px; flex-wrap: wrap; }
.cta-check { display: flex; align-items: center; gap: 7px; font-size: 13px; color: #9CA3AF; }
.cc-icon { color: #36D399; font-weight: 700; }
.cta-right { display: flex; flex-direction: column; gap: 12px; align-items: flex-end; }
.btn-cta-primary {
  white-space: nowrap;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF); color: #fff;
  border: none; border-radius: 12px; padding: 15px 32px;
  font-size: 15px; font-weight: 600; text-decoration: none;
  box-shadow: 0 0 32px rgba(79,126,255,.4); transition: all .2s;
}
.btn-cta-primary:hover { transform: translateY(-2px); box-shadow: 0 0 48px rgba(79,126,255,.6); }
.btn-cta-ghost {
  font-size: 13px; color: #6B7280; text-decoration: none; transition: color .15s;
}
.btn-cta-ghost:hover { color: #E8EAF0; }

/* ── Animations ────────────────────────────────────── */
@keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

/* ── Responsive ────────────────────────────────────── */
@media (max-width: 1100px) {
  .hero { grid-template-columns: 1fr; padding: 100px 40px 60px; }
  .hero-mockup { display: none; }
  .features-grid { grid-template-columns: repeat(2, 1fr); }
  .hiw-steps { grid-template-columns: repeat(2, 1fr); }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .hero { padding: 80px 24px 48px; }
  .trusted-bar, .stats-section, .features-section, .hiw-section, .testi-section, .pricing-section, .cta-section { padding: 48px 24px; }
  .features-grid { grid-template-columns: 1fr; }
  .testi-grid, .pricing-grid, .hiw-steps { grid-template-columns: 1fr; }
  .cta-inner { grid-template-columns: 1fr; }
  .cta-right { align-items: flex-start; }
  .tb-inner { flex-direction: column; align-items: flex-start; gap: 16px; }
}
</style>
