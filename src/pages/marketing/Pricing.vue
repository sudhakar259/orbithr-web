<script setup lang="ts">
const plans = [
  {
    name: 'Starter',
    price: '₹1,999',
    period: '/mo',
    desc: 'Up to 25 employees',
    features: [
      'Employee Directory',
      'Attendance & Leaves',
      'Holiday Calendar',
      'Basic Reports',
      'Email support',
    ],
    cta: '/register',
    ctaLabel: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '₹4,999',
    period: '/mo',
    desc: 'Up to 150 employees',
    features: [
      'Everything in Starter',
      'Payroll & Payslips',
      'Performance Reviews',
      'Training & Assets',
      'Recruitment (ATS)',
      'Priority support',
    ],
    cta: '/register',
    ctaLabel: 'Start free trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'Unlimited employees',
    features: [
      'Everything in Growth',
      'SSO & SCIM',
      'Dedicated CSM',
      'Custom integrations',
      'SLA guarantee',
      'On-prem option',
    ],
    cta: 'mailto:sales@orbithr.com',
    ctaLabel: 'Contact sales',
    highlight: false,
  },
]

const faqs = [
  { q: 'Can I change plans later?', a: 'Yes. Upgrade or downgrade anytime from your billing settings. Changes take effect at the next billing cycle.' },
  { q: 'Is there a free trial?', a: 'Every plan starts with a 14-day free trial. No credit card required to get started.' },
  { q: 'How is pricing calculated?', a: 'Pricing is per workspace per month. There are no per-seat charges on Starter and Growth — just the flat monthly fee.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards, UPI, and net banking via Stripe.' },
  { q: 'Can I cancel anytime?', a: 'Absolutely. Cancel anytime from your dashboard. You keep access until the end of your billing period.' },
]
</script>

<template>
  <div class="pr-page">
    <!-- Hero -->
    <div class="pr-hero">
      <div class="pr-badge">Pricing</div>
      <h1 class="pr-h1">Simple, transparent pricing</h1>
      <p class="pr-sub">Only pay for what you need. No hidden fees. Cancel anytime.</p>
    </div>

    <!-- Plans grid -->
    <div class="pr-grid-wrap">
      <div class="pr-grid">
        <div
          v-for="plan in plans"
          :key="plan.name"
          class="plan-card"
          :class="{ popular: plan.highlight }"
        >
          <div v-if="plan.highlight" class="pop-badge">Most popular</div>

          <div class="plan-name">{{ plan.name }}</div>
          <div class="plan-desc">{{ plan.desc }}</div>

          <div class="plan-price">
            {{ plan.price }}<span v-if="plan.period" class="plan-period">{{ plan.period }}</span>
          </div>

          <ul class="plan-features">
            <li v-for="f in plan.features" :key="f">
              <span class="pf-check">
                <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </span>
              {{ f }}
            </li>
          </ul>

          <RouterLink
            v-if="!plan.cta.startsWith('mailto')"
            :to="plan.cta"
            class="plan-btn"
            :class="{ 'plan-btn-primary': plan.highlight }"
          >{{ plan.ctaLabel }}</RouterLink>
          <a
            v-else
            :href="plan.cta"
            class="plan-btn"
          >{{ plan.ctaLabel }}</a>
        </div>
      </div>

      <p class="pr-note">All plans include a 14-day free trial. No credit card required.</p>
    </div>

    <!-- Feature comparison (simple) -->
    <div class="compare-wrap">
      <h2 class="compare-title">What's included</h2>
      <div class="compare-table">
        <div class="ct-head">
          <div class="ct-feature-col">Feature</div>
          <div class="ct-plan-col">Starter</div>
          <div class="ct-plan-col ct-popular">Growth</div>
          <div class="ct-plan-col">Enterprise</div>
        </div>
        <div v-for="row in [
          ['Employee Directory', true, true, true],
          ['Attendance & Leaves', true, true, true],
          ['Holiday Calendar', true, true, true],
          ['Payroll & Payslips', false, true, true],
          ['Performance Reviews', false, true, true],
          ['Recruitment ATS', false, true, true],
          ['Training & Development', false, true, true],
          ['Asset Management', false, true, true],
          ['SSO / SCIM', false, false, true],
          ['Dedicated CSM', false, false, true],
          ['Custom Integrations', false, false, true],
          ['SLA Guarantee', false, false, true],
        ]" :key="row[0]" class="ct-row">
          <div class="ct-feature-col">{{ row[0] }}</div>
          <div v-for="(val, i) in [row[1], row[2], row[3]]" :key="i" class="ct-plan-col" :class="{ 'ct-popular': i === 1 }">
            <span v-if="val" class="ct-yes">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
            </span>
            <span v-else class="ct-no">—</span>
          </div>
        </div>
      </div>
    </div>

    <!-- FAQ -->
    <div class="faq-wrap">
      <h2 class="compare-title">Frequently asked questions</h2>
      <div class="faq-grid">
        <div v-for="faq in faqs" :key="faq.q" class="faq-card">
          <div class="faq-q">{{ faq.q }}</div>
          <div class="faq-a">{{ faq.a }}</div>
        </div>
      </div>
    </div>

    <!-- CTA -->
    <div class="pr-cta">
      <h2 class="pr-cta-title">Ready to get started?</h2>
      <p class="pr-cta-sub">Join hundreds of companies managing their workforce on OrbitHR.</p>
      <div class="pr-cta-btns">
        <RouterLink to="/register" class="pr-cta-btn-primary">Start free trial →</RouterLink>
        <RouterLink to="/login" class="pr-cta-btn-ghost">Sign in</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pr-page {
  background: #0C0E14;
  min-height: 100vh;
  font-family: inherit;
  color: #E8EAF0;
}

/* Hero */
.pr-hero {
  text-align: center;
  padding: 80px 40px 48px;
}
.pr-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #4F7EFF;
  background: rgba(79,126,255,.1);
  border: 1px solid rgba(79,126,255,.2);
  border-radius: 20px;
  padding: 5px 14px;
  margin-bottom: 20px;
}
.pr-h1 {
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -1px;
  color: #E8EAF0;
  margin-bottom: 14px;
  line-height: 1.2;
}
.pr-sub {
  font-size: 16px;
  color: #6B7280;
  max-width: 480px;
  margin: 0 auto;
  line-height: 1.65;
}

/* Plans grid */
.pr-grid-wrap {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 40px 64px;
}
.pr-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: start;
}
.plan-card {
  background: #141720;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 20px;
  padding: 32px;
  position: relative;
  transition: border-color .2s, transform .2s;
}
.plan-card:hover { transform: translateY(-2px); }
.plan-card.popular {
  border-color: rgba(79,126,255,.5);
  background: linear-gradient(180deg, rgba(79,126,255,.07) 0%, #141720 60%);
  box-shadow: 0 0 40px rgba(79,126,255,.12);
}
.pop-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 16px;
  border-radius: 20px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(79,126,255,.4);
}
.plan-name { font-size: 18px; font-weight: 700; color: #E8EAF0; margin-bottom: 4px; }
.plan-desc { font-size: 13px; color: #6B7280; margin-bottom: 20px; }
.plan-price {
  font-size: 40px;
  font-weight: 800;
  color: #E8EAF0;
  letter-spacing: -1px;
  margin-bottom: 24px;
  line-height: 1;
}
.plan-period { font-size: 15px; font-weight: 400; color: #6B7280; }
.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 28px;
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.plan-features li { font-size: 13px; color: #9CA3AF; display: flex; align-items: center; gap: 9px; }
.pf-check {
  width: 20px; height: 20px; border-radius: 50%;
  background: rgba(54,211,153,.12);
  color: #36D399;
  display: grid; place-items: center;
  flex-shrink: 0;
}
.plan-btn {
  display: block;
  text-align: center;
  border-radius: 10px;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: all .15s;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.12);
  color: #E8EAF0;
}
.plan-btn:hover { background: rgba(255,255,255,.12); }
.plan-btn-primary {
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  border: none;
  color: #fff;
  box-shadow: 0 0 28px rgba(79,126,255,.4);
}
.plan-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 0 40px rgba(79,126,255,.55); }
.pr-note { text-align: center; font-size: 13px; color: #6B7280; margin-top: 24px; }

/* Comparison table */
.compare-wrap {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 40px 72px;
}
.compare-title {
  font-size: 26px;
  font-weight: 700;
  color: #E8EAF0;
  text-align: center;
  margin-bottom: 32px;
  letter-spacing: -0.5px;
}
.compare-table {
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 16px;
  overflow: hidden;
}
.ct-head {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  background: #1C2030;
  padding: 14px 24px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #6B7280;
}
.ct-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  padding: 14px 24px;
  font-size: 14px;
  border-top: 1px solid rgba(255,255,255,.05);
  transition: background .15s;
}
.ct-row:hover { background: rgba(255,255,255,.02); }
.ct-feature-col { color: #9CA3AF; }
.ct-plan-col { text-align: center; }
.ct-popular { color: #4F7EFF; }
.ct-yes { color: #36D399; display: grid; place-items: center; }
.ct-no { color: #374151; }

/* FAQ */
.faq-wrap {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 40px 72px;
}
.faq-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.faq-card {
  background: #141720;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px;
  padding: 24px;
  transition: border-color .2s;
}
.faq-card:hover { border-color: rgba(79,126,255,.2); }
.faq-q { font-size: 14px; font-weight: 600; color: #E8EAF0; margin-bottom: 10px; }
.faq-a { font-size: 13px; color: #6B7280; line-height: 1.65; }

/* CTA */
.pr-cta {
  text-align: center;
  padding: 80px 40px;
  background: linear-gradient(180deg, transparent, rgba(79,126,255,.04));
  border-top: 1px solid rgba(255,255,255,.06);
}
.pr-cta-title { font-size: 32px; font-weight: 800; color: #E8EAF0; margin-bottom: 12px; letter-spacing: -0.5px; }
.pr-cta-sub { font-size: 15px; color: #6B7280; margin-bottom: 32px; }
.pr-cta-btns { display: flex; gap: 12px; justify-content: center; }
.pr-cta-btn-primary {
  display: inline-flex; align-items: center; padding: 13px 28px;
  border-radius: 10px; font-size: 14px; font-weight: 600;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF); color: #fff;
  text-decoration: none; box-shadow: 0 0 24px rgba(79,126,255,.4);
  transition: all .15s;
}
.pr-cta-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 0 36px rgba(79,126,255,.55); }
.pr-cta-btn-ghost {
  display: inline-flex; align-items: center; padding: 13px 28px;
  border-radius: 10px; font-size: 14px; font-weight: 600;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); color: #E8EAF0;
  text-decoration: none; transition: all .15s;
}
.pr-cta-btn-ghost:hover { background: rgba(255,255,255,.1); }

@media (max-width: 900px) {
  .pr-grid { grid-template-columns: 1fr; max-width: 420px; margin: 0 auto; }
  .faq-grid { grid-template-columns: 1fr; }
  .ct-head, .ct-row { grid-template-columns: 2fr 1fr 1fr 1fr; font-size: 12px; padding: 12px 16px; }
}
@media (max-width: 600px) {
  .pr-h1 { font-size: 30px; }
  .pr-grid-wrap, .compare-wrap, .faq-wrap { padding-left: 20px; padding-right: 20px; }
  .pr-hero { padding: 60px 20px 36px; }
  .pr-cta { padding: 60px 20px; }
  .pr-cta-btns { flex-direction: column; align-items: center; }
  .compare-wrap { overflow-x: auto; }
}
</style>
