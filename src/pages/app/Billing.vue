<template>
  <div class="billing-page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-inner">
        <div class="eyebrow">Subscription · billing · invoices</div>
        <h1 class="page-title">Billing</h1>
        <p class="page-subtitle">Plan, invoices, payment history and seat usage for your workspace.</p>
      </div>
    </div>

    <div class="page-body">
      <!-- Loading -->
      <div v-if="loading" class="space-stack">
        <div class="skeleton skeleton-lg"></div>
        <div class="skeleton skeleton-md"></div>
        <div class="skeleton skeleton-md"></div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="error-banner">
        <p class="error-title">Failed to load billing information</p>
        <p class="error-text">{{ error }}</p>
        <button class="retry-btn" @click="loadAll">Retry</button>
      </div>

      <template v-else>
        <!-- Top grid: Current plan + Payment / Auto-renew -->
        <div class="top-grid">
          <!-- Current Plan Card -->
          <section class="card">
            <div class="section-head">
              <h2 class="section-title">Current plan</h2>
              <span
                v-if="subscription"
                class="status-badge"
                :class="subscriptionStatusClass"
              >
                {{ subscription.status }}
              </span>
            </div>

            <div v-if="subscription" class="plan-hero">
              <div class="plan-hero-row">
                <div>
                  <div class="plan-eyebrow">OrbitHR · {{ subscription.plan?.name ?? 'Plan' }}</div>
                  <div class="plan-amount">
                    <span class="plan-amount-value">${{ subscription.price_at_subscription ?? subscription.plan?.price ?? '0' }}</span>
                    <span class="plan-amount-cycle">/ {{ subscription.billing_cycle ?? subscription.plan?.billing_cycle ?? 'mo' }}</span>
                  </div>
                  <div class="plan-amount-note">
                    Up to {{ subscription.plan?.max_users ?? '—' }} seats · billed {{ subscription.billing_cycle ?? subscription.plan?.billing_cycle ?? 'monthly' }}
                  </div>
                </div>
              </div>

              <!-- Meta features -->
              <div class="plan-features-grid">
                <div v-if="subscription.expires_at" class="feature-row">
                  <span class="feature-icon ok">✓</span>
                  <span class="feature-text">Renews {{ formatDate(subscription.expires_at) }}</span>
                </div>
                <div v-if="subscription.next_billing_date" class="feature-row">
                  <span class="feature-icon ok">✓</span>
                  <span class="feature-text">Next billing · {{ formatDate(subscription.next_billing_date) }}</span>
                </div>
                <div class="feature-row">
                  <span class="feature-icon ok">✓</span>
                  <span class="feature-text">{{ subscription.active_users_count ?? 0 }} active users</span>
                </div>
                <div v-if="subscription.is_on_trial" class="feature-row">
                  <span class="feature-icon warn">⏱</span>
                  <span class="feature-text trial-text">{{ subscription.trial_days_remaining }} days trial remaining</span>
                </div>
                <div class="feature-row">
                  <span class="feature-icon ok">✓</span>
                  <span class="feature-text">{{ activeModules.length }} active modules</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-plan">
              <p>No active subscription found.</p>
            </div>

            <div v-if="subscription" class="seat-section">
              <div class="seat-head">Seat usage</div>
              <div class="seat-line">
                <span class="seat-label">Seats used</span>
                <span class="seat-value">
                  <strong>{{ subscription.active_users_count ?? 0 }}</strong> / {{ subscription.plan?.max_users ?? '—' }}
                </span>
              </div>
              <div class="progress-track">
                <div
                  class="progress-fill"
                  :style="{ width: seatPercent + '%' }"
                ></div>
              </div>
              <div class="seat-note">{{ seatRemaining }} seats remaining</div>
            </div>

            <!-- Actions -->
            <div v-if="subscription" class="plan-actions">
              <button
                v-if="subscription.is_active && !subscription.is_cancelled"
                class="btn-primary"
                @click="showUpgradePlans = !showUpgradePlans"
              >
                {{ showUpgradePlans ? 'Hide plans' : 'Upgrade plan' }}
              </button>
              <button
                v-if="subscription.is_active && !subscription.is_cancelled"
                class="btn-danger"
                @click="showCancelModal = true"
              >
                Cancel subscription
              </button>
            </div>
          </section>

          <!-- Payment / Auto-renew -->
          <section class="card">
            <div class="section-head">
              <h2 class="section-title">Payment method</h2>
            </div>

            <div class="payment-card">
              <div class="payment-card-bg"></div>
              <div class="payment-card-inner">
                <div class="payment-row-top">
                  <div class="payment-bank">PRIMARY</div>
                  <div class="payment-card-icon">▭</div>
                </div>
                <div class="payment-card-num">•••• •••• •••• ••••</div>
                <div class="payment-row-bottom">
                  <span>{{ subscription?.plan?.name?.toUpperCase() ?? 'WORKSPACE' }}</span>
                  <span v-if="subscription?.next_billing_date">
                    NEXT {{ formatShortDate(subscription.next_billing_date) }}
                  </span>
                </div>
              </div>
            </div>

            <button class="btn-secondary btn-full" disabled>+ Add payment method</button>

            <div class="auto-renew">
              <div class="auto-renew-head">Auto-renew</div>
              <div class="auto-renew-row">
                <div class="auto-renew-text">
                  <template v-if="subscription?.expires_at">
                    Renews {{ formatDate(subscription.expires_at) }} · same plan
                  </template>
                  <template v-else>
                    Auto-renew status unavailable
                  </template>
                </div>
                <span class="auto-renew-badge" :class="subscription?.is_active && !subscription?.is_cancelled ? 'on' : 'off'">
                  {{ subscription?.is_active && !subscription?.is_cancelled ? 'On' : 'Off' }}
                </span>
              </div>
            </div>
          </section>
        </div>

        <!-- Upgrade Plans Section (collapsible) -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <section v-if="showUpgradePlans" class="card upgrade-section">
            <div class="section-head">
              <h2 class="section-title">Available plans</h2>
            </div>
            <div v-if="plansLoading" class="plans-grid">
              <div v-for="i in 3" :key="i" class="skeleton skeleton-card"></div>
            </div>
            <div v-else class="plans-grid">
              <div
                v-for="plan in availablePlans"
                :key="plan.id"
                class="plan-card"
                :class="{ 'plan-popular': plan.is_popular, 'plan-current': plan.id === subscription?.plan?.id }"
              >
                <div v-if="plan.is_popular" class="popular-badge">Popular</div>
                <div v-if="plan.id === subscription?.plan?.id" class="current-badge">Current</div>
                <h3 class="plan-card-name">{{ plan.name }}</h3>
                <p v-if="plan.description" class="plan-card-desc">{{ plan.description }}</p>
                <div class="plan-card-price">
                  <span class="price-amount">${{ plan.price }}</span>
                  <span class="price-cycle">/ {{ plan.billing_cycle }}</span>
                </div>
                <div class="plan-card-meta">
                  <span>Up to {{ plan.max_users }} users</span>
                  <span v-if="plan.trial_days > 0">{{ plan.trial_days }}-day trial</span>
                </div>

                <!-- Features -->
                <ul v-if="plan.features && plan.features.length > 0" class="plan-features-list">
                  <li v-for="feature in plan.features" :key="feature.slug">
                    <span class="check-icon">✓</span>
                    {{ feature.name }}
                  </li>
                </ul>

                <!-- Modules -->
                <div v-if="plan.modules && plan.modules.length > 0" class="plan-modules">
                  <span class="plan-modules-label">Modules</span>
                  <span v-for="mod in plan.modules" :key="mod.slug" class="plan-module-tag">{{ mod.name }}</span>
                </div>

                <button
                  v-if="plan.id !== subscription?.plan?.id"
                  class="btn-select-plan"
                  @click="selectPlanForUpgrade(plan)"
                >
                  Select plan
                </button>
                <div v-else class="current-plan-label">Your current plan</div>
              </div>
            </div>
          </section>
        </Transition>

        <!-- Active Modules -->
        <section v-if="subscription?.enabled_modules && activeModules.length > 0" class="card">
          <div class="section-head">
            <h2 class="section-title">Active modules</h2>
            <span class="module-count">{{ activeModules.length }} active</span>
          </div>
          <div class="modules-grid">
            <div v-for="mod in activeModules" :key="mod.slug" class="module-item">
              <span class="module-name">{{ mod.name }}</span>
              <span class="module-status-badge active">Active</span>
            </div>
          </div>
        </section>

        <!-- Transaction History -->
        <section class="card card-flush">
          <div class="section-head section-head-padded">
            <h2 class="section-title">Recent invoices</h2>
          </div>

          <div v-if="transactions.length === 0" class="empty-state">
            <p>No transactions found.</p>
          </div>

          <div v-else>
            <div class="invoice-table-head">
              <div>Reference</div>
              <div>Date</div>
              <div>Description</div>
              <div class="align-right">Amount</div>
              <div>Status</div>
            </div>
            <div
              v-for="(tx, i) in transactions"
              :key="tx.id"
              class="invoice-row"
              :class="{ 'invoice-row-last': i === transactions.length - 1 }"
            >
              <div class="invoice-ref">{{ tx.transaction_id ?? tx.id }}</div>
              <div class="invoice-date">{{ formatDate(tx.created_at) }}</div>
              <div class="invoice-desc">
                <span class="type-badge" :class="'type-' + tx.type">
                  {{ formatTransactionType(tx.type) }}
                </span>
              </div>
              <div class="invoice-amount">{{ formatCurrency(tx.amount, tx.currency) }}</div>
              <div>
                <span class="tx-status-badge" :class="'tx-' + tx.status">
                  {{ tx.status }}
                </span>
              </div>
            </div>

            <!-- Pagination -->
            <div v-if="transactionsMeta.last_page > 1" class="pagination">
              <button
                class="page-btn"
                :disabled="transactionsMeta.current_page <= 1"
                @click="loadTransactions(transactionsMeta.current_page - 1)"
              >
                Previous
              </button>
              <span class="page-info">
                Page {{ transactionsMeta.current_page }} of {{ transactionsMeta.last_page }}
              </span>
              <button
                class="page-btn"
                :disabled="transactionsMeta.current_page >= transactionsMeta.last_page"
                @click="loadTransactions(transactionsMeta.current_page + 1)"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </template>
    </div>

    <!-- Cancel Subscription Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showCancelModal" class="modal-overlay" @click.self="showCancelModal = false">
          <div class="cancel-modal">
            <div class="cancel-modal-header">
              <h3 class="cancel-modal-title">Cancel subscription</h3>
            </div>
            <div class="cancel-modal-body">
              <div class="warning-banner">
                <span class="warning-icon">!</span>
                <div>
                  <p class="warning-title">This action cannot be undone</p>
                  <p class="warning-text">
                    Your subscription will remain active until the end of the current billing period.
                    After that, you will lose access to all paid features and modules.
                  </p>
                </div>
              </div>
            </div>
            <div class="cancel-modal-footer">
              <button class="btn-cancel-action" @click="showCancelModal = false">
                Keep subscription
              </button>
              <button
                class="btn-confirm-cancel"
                :disabled="cancelling"
                @click="handleCancelSubscription"
              >
                {{ cancelling ? 'Cancelling…' : 'Yes, cancel' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Upgrade Plan Modal -->
    <UpgradePlanModal
      v-if="selectedPlan"
      :plan="selectedPlan"
      :is-open="showUpgradeModal"
      :loading="upgrading"
      @close="showUpgradeModal = false"
      @confirmed="handleUpgrade"
    />

    <!-- Toast Notification -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div v-if="toast.message" class="toast" :class="'toast-' + toast.type">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<script lang="ts">
export default { name: 'BillingPage' }
</script>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { billingService } from '@/services/billing'
import type { BillingTransaction, Plan, Subscription } from '@/services/billing'
import UpgradePlanModal from '@/components/billing/UpgradePlanModal.vue'

const loading = ref(true)
const error = ref<string | null>(null)
const subscription = ref<Subscription | null>(null)
const availablePlans = ref<Plan[]>([])
const transactions = ref<BillingTransaction[]>([])
const transactionsMeta = reactive({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
})

const showUpgradePlans = ref(false)
const plansLoading = ref(false)
const showCancelModal = ref(false)
const cancelling = ref(false)
const showUpgradeModal = ref(false)
const selectedPlan = ref<Plan | null>(null)
const upgrading = ref(false)

const toast = reactive({ message: '', type: 'success' as 'success' | 'error' })

const activeModules = computed(() => {
  if (!subscription.value?.plan?.modules) return []
  return subscription.value.plan.modules.filter((m) => m.is_active)
})

const subscriptionStatusClass = computed(() => {
  if (!subscription.value) return ''
  const s = subscription.value.status
  if (s === 'active') return 'status-active'
  if (s === 'trial') return 'status-trial'
  if (s === 'suspended' || s === 'expired' || s === 'cancelled') return 'status-danger'
  return ''
})

const seatPercent = computed(() => {
  const max = subscription.value?.plan?.max_users
  const used = subscription.value?.active_users_count
  if (!max || !used) return 0
  return Math.min(100, Math.round((Number(used) / Number(max)) * 100))
})

const seatRemaining = computed(() => {
  const max = subscription.value?.plan?.max_users
  const used = subscription.value?.active_users_count
  if (!max) return 0
  return Math.max(0, Number(max) - Number(used ?? 0))
})

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.message = message
  toast.type = type
  setTimeout(() => {
    toast.message = ''
  }, 4000)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: '2-digit',
    year: '2-digit',
  })
}

function formatCurrency(amount: string | number, currency = 'usd'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(num)
}

function formatTransactionType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

async function loadSubscription() {
  try {
    const res = await billingService.getCurrentSubscription()
    subscription.value = res.data
  } catch {
    // Subscription may not exist yet
    subscription.value = null
  }
}

async function loadTransactions(page = 1) {
  try {
    const res = await billingService.getTransactions(page)
    const data = res.data
    transactions.value = data.data
    transactionsMeta.current_page = data.current_page
    transactionsMeta.last_page = data.last_page
    transactionsMeta.per_page = data.per_page
    transactionsMeta.total = data.total
  } catch {
    transactions.value = []
  }
}

async function loadPlans() {
  plansLoading.value = true
  try {
    const res = await billingService.getAvailablePlans()
    availablePlans.value = res.data
  } catch {
    availablePlans.value = []
  } finally {
    plansLoading.value = false
  }
}

async function loadAll() {
  loading.value = true
  error.value = null
  try {
    await Promise.all([loadSubscription(), loadTransactions(), loadPlans()])
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load billing data'
  } finally {
    loading.value = false
  }
}

function selectPlanForUpgrade(plan: Plan) {
  selectedPlan.value = plan
  showUpgradeModal.value = true
}

async function handleUpgrade(plan: Plan) {
  upgrading.value = true
  try {
    const res = await billingService.initiateUpgrade({
      plan_id: plan.id,
      success_url: `${window.location.origin}/app/billing?upgrade=success`,
      cancel_url: `${window.location.origin}/app/billing?upgrade=cancelled`,
    })
    // Redirect to Stripe checkout
    window.location.href = res.data.checkout_url
  } catch (err) {
    upgrading.value = false
    showUpgradeModal.value = false
    const message =
      err instanceof Error ? err.message : 'Failed to initiate upgrade. Please try again.'
    showToast(message, 'error')
  }
}

async function handleCancelSubscription() {
  cancelling.value = true
  try {
    await billingService.cancelSubscription()
    showCancelModal.value = false
    showToast('Subscription cancelled successfully.')
    await loadSubscription()
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to cancel subscription. Please try again.'
    showToast(message, 'error')
  } finally {
    cancelling.value = false
  }
}

onMounted(() => {
  loadAll()

  // Check for upgrade result from URL params
  const params = new URLSearchParams(window.location.search)
  if (params.get('upgrade') === 'success') {
    showToast('Plan upgraded successfully!')
    // Clean the URL
    window.history.replaceState({}, '', window.location.pathname)
  } else if (params.get('upgrade') === 'cancelled') {
    showToast('Upgrade was cancelled.', 'error')
    window.history.replaceState({}, '', window.location.pathname)
  }
})
</script>

<style scoped>
/* Design tokens scoped to this page */
.billing-page {
  --bg: #0d0f17;
  --surface: #161a23;
  --surface2: #1c2030;
  --surface3: #232936;
  --border: #232936;
  --border-hi: #2c3344;
  --accent: #6b5bff;
  --accent-soft: rgba(107, 91, 255, 0.12);
  --green: #4dd39a;
  --red: #f38288;
  --yellow: #f5a623;
  --purple: #b28dff;
  --text: #eef0f4;
  --muted: #7a8299;
  --dim: #b0b6c5;

  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-feature-settings: 'ss01' on;
}

/* ── Page header ─────────────────────────── */
.page-header {
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.page-header-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 26px 24px 22px;
}

.eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
}

.page-title {
  margin-top: 6px;
  font-family: 'Instrument Serif', serif;
  font-size: 38px;
  letter-spacing: -0.02em;
  color: var(--text);
  line-height: 1.05;
}

.page-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: var(--dim);
  max-width: 560px;
}

/* ── Body ──────────────────────────────── */
.page-body {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px 24px 56px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.space-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Cards ─────────────────────────────── */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px 20px;
}

.card-flush {
  padding: 0;
  overflow: hidden;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-head-padded {
  padding: 14px 20px;
  margin-bottom: 0;
  border-bottom: 1px solid var(--border);
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
}

/* ── Top grid ──────────────────────────── */
.top-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
}

@media (max-width: 1000px) {
  .top-grid {
    grid-template-columns: 1fr;
  }
}

/* ── Plan hero ──────────────────────────── */
.plan-hero {
  padding: 18px;
  background: linear-gradient(135deg, var(--accent-soft), transparent 80%);
  border: 1px solid rgba(107, 91, 255, 0.35);
  border-radius: 12px;
}

.plan-hero-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.plan-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  font-family: 'JetBrains Mono', monospace;
}

.plan-amount {
  margin-top: 6px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.plan-amount-value {
  font-family: 'Instrument Serif', serif;
  font-size: 38px;
  letter-spacing: -0.02em;
  color: var(--text);
  line-height: 1;
}

.plan-amount-cycle {
  font-size: 13px;
  color: var(--dim);
  font-family: 'JetBrains Mono', monospace;
}

.plan-amount-note {
  margin-top: 4px;
  font-size: 12px;
  color: var(--dim);
}

.plan-features-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.feature-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text);
}

.feature-icon {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 9px;
  font-weight: 700;
  flex-shrink: 0;
}

.feature-icon.ok {
  background: rgba(77, 211, 154, 0.18);
  color: var(--green);
}

.feature-icon.warn {
  background: rgba(245, 166, 35, 0.18);
  color: var(--yellow);
}

.feature-text {
  font-size: 12px;
}

.trial-text {
  color: var(--yellow);
}

.empty-plan {
  padding: 18px;
  font-size: 13px;
  color: var(--muted);
  border: 1px dashed var(--border-hi);
  border-radius: 12px;
}

/* ── Status badges ─────────────────────── */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.status-active {
  background: rgba(77, 211, 154, 0.15);
  color: var(--green);
}

.status-trial {
  background: rgba(245, 166, 35, 0.15);
  color: var(--yellow);
}

.status-danger {
  background: rgba(243, 130, 136, 0.15);
  color: var(--red);
}

/* ── Seat usage ────────────────────────── */
.seat-section {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.seat-head {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 10px;
}

.seat-line {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--dim);
}

.seat-value {
  font-family: 'JetBrains Mono', monospace;
}

.seat-value strong {
  color: var(--text);
  font-weight: 600;
}

.progress-track {
  margin-top: 8px;
  height: 8px;
  background: var(--surface2);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.seat-note {
  margin-top: 8px;
  font-size: 11px;
  color: var(--muted);
}

/* ── Plan actions ──────────────────────── */
.plan-actions {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* ── Buttons ───────────────────────────── */
.btn-primary {
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--border-hi);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-full {
  width: 100%;
  margin-top: 12px;
}

.btn-danger {
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  color: var(--red);
  background: rgba(243, 130, 136, 0.1);
  border: 1px solid rgba(243, 130, 136, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-danger:hover {
  background: rgba(243, 130, 136, 0.2);
}

/* ── Payment card ──────────────────────── */
.payment-card {
  position: relative;
  padding: 14px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0a0a14, #1a1530 70%);
  border: 1px solid var(--border);
  height: 130px;
  overflow: hidden;
}

.payment-card-bg {
  position: absolute;
  right: -30px;
  top: -30px;
  width: 120px;
  height: 120px;
  border-radius: 60px;
  background: rgba(107, 91, 255, 0.25);
}

.payment-card-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}

.payment-row-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.payment-bank {
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--dim);
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.payment-card-icon {
  font-size: 18px;
  color: #fff;
}

.payment-card-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  letter-spacing: 0.16em;
  color: var(--text);
}

.payment-row-bottom {
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
  color: var(--dim);
  font-family: 'JetBrains Mono', monospace;
}

/* ── Auto-renew ────────────────────────── */
.auto-renew {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.auto-renew-head {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 10px;
}

.auto-renew-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.auto-renew-text {
  font-size: 12px;
  color: var(--text);
}

.auto-renew-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.auto-renew-badge.on {
  background: rgba(77, 211, 154, 0.15);
  color: var(--green);
}

.auto-renew-badge.off {
  background: rgba(243, 130, 136, 0.15);
  color: var(--red);
}

/* ── Available plans ───────────────────── */
.upgrade-section {
  padding: 18px 20px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.plan-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s;
}

.plan-card:hover {
  border-color: var(--accent);
}

.plan-popular {
  border-color: var(--accent);
}

.plan-current {
  border-color: var(--green);
  opacity: 0.85;
}

.popular-badge {
  position: absolute;
  top: -8px;
  right: 14px;
  background: var(--accent);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.current-badge {
  position: absolute;
  top: -8px;
  right: 14px;
  background: var(--green);
  color: #0c0e14;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.plan-card-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.plan-card-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--dim);
  line-height: 1.5;
}

.plan-card-price {
  margin-top: 10px;
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.price-amount {
  font-family: 'Instrument Serif', serif;
  font-size: 28px;
  color: var(--text);
  letter-spacing: -0.02em;
}

.price-cycle {
  font-size: 12px;
  color: var(--dim);
  font-family: 'JetBrains Mono', monospace;
}

.plan-card-meta {
  margin-top: 6px;
  display: flex;
  gap: 12px;
  font-size: 11.5px;
  color: var(--muted);
}

.plan-features-list {
  margin-top: 14px;
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.plan-features-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text);
}

.check-icon {
  color: var(--green);
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.plan-modules {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.plan-modules-label {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
}

.plan-module-tag {
  font-size: 10.5px;
  padding: 2px 8px;
  background: var(--surface2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 999px;
}

.btn-select-plan {
  margin-top: 14px;
  width: 100%;
  padding: 9px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-select-plan:hover {
  opacity: 0.9;
}

.current-plan-label {
  margin-top: 14px;
  text-align: center;
  font-size: 12px;
  color: var(--green);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-family: 'JetBrains Mono', monospace;
}

/* ── Active modules ─────────────────────── */
.module-count {
  font-size: 11px;
  color: var(--green);
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.04em;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.module-item {
  padding: 10px 14px;
  background: var(--surface2);
  border-radius: 8px;
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.module-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.module-status-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.module-status-badge.active {
  background: rgba(77, 211, 154, 0.15);
  color: var(--green);
}

/* ── Invoice table ─────────────────────── */
.empty-state {
  padding: 32px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
}

.invoice-table-head {
  display: grid;
  grid-template-columns: 170px 130px 1fr 140px 100px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.015);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  gap: 12px;
  font-family: 'JetBrains Mono', monospace;
}

.invoice-row {
  display: grid;
  grid-template-columns: 170px 130px 1fr 140px 100px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  align-items: center;
  gap: 12px;
  transition: background 0.12s;
}

.invoice-row:hover {
  background: rgba(255, 255, 255, 0.015);
}

.invoice-row-last {
  border-bottom: none;
}

.invoice-ref {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  color: var(--accent);
}

.invoice-date {
  font-size: 11.5px;
  color: var(--dim);
  font-family: 'JetBrains Mono', monospace;
}

.invoice-desc {
  font-size: 12.5px;
  color: var(--text);
}

.invoice-amount {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--text);
  font-weight: 600;
  text-align: right;
}

.align-right {
  text-align: right;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  text-transform: capitalize;
}

.type-registration {
  background: rgba(107, 91, 255, 0.15);
  color: var(--accent);
}

.type-module_purchase {
  background: rgba(178, 141, 255, 0.15);
  color: var(--purple);
}

.type-plan_upgrade {
  background: rgba(77, 211, 154, 0.15);
  color: var(--green);
}

.type-renewal {
  background: rgba(245, 166, 35, 0.15);
  color: var(--yellow);
}

.tx-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.tx-completed {
  background: rgba(77, 211, 154, 0.15);
  color: var(--green);
}

.tx-failed {
  background: rgba(243, 130, 136, 0.15);
  color: var(--red);
}

.tx-pending {
  background: rgba(245, 166, 35, 0.15);
  color: var(--yellow);
}

.tx-refunded {
  background: rgba(178, 141, 255, 0.15);
  color: var(--purple);
}

/* ── Pagination ────────────────────────── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 14px;
  border-top: 1px solid var(--border);
}

.page-btn {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--accent);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: 11.5px;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
}

/* ── Cancel modal ──────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 16px;
}

.cancel-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  width: 100%;
  max-width: 460px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
}

.cancel-modal-header {
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
}

.cancel-modal-title {
  font-family: 'Instrument Serif', serif;
  font-size: 22px;
  letter-spacing: -0.01em;
  color: var(--red);
}

.cancel-modal-body {
  padding: 18px 20px;
}

.warning-banner {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: rgba(243, 130, 136, 0.08);
  border: 1px solid rgba(243, 130, 136, 0.25);
  border-radius: 10px;
}

.warning-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(243, 130, 136, 0.2);
  color: var(--red);
  font-weight: 700;
  font-size: 13px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.warning-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--red);
}

.warning-text {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--dim);
  line-height: 1.6;
}

.cancel-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
}

.btn-cancel-action {
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.btn-cancel-action:hover {
  border-color: var(--border-hi);
}

.btn-confirm-cancel {
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--red);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-confirm-cancel:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-confirm-cancel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── Toast ─────────────────────────────── */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 60;
  padding: 11px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.toast-success {
  background: rgba(77, 211, 154, 0.15);
  color: var(--green);
  border: 1px solid rgba(77, 211, 154, 0.3);
}

.toast-error {
  background: rgba(243, 130, 136, 0.15);
  color: var(--red);
  border: 1px solid rgba(243, 130, 136, 0.3);
}

/* ── Skeleton loading ──────────────────── */
.skeleton {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-lg {
  height: 200px;
}

.skeleton-md {
  height: 140px;
}

.skeleton-card {
  height: 320px;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ── Error banner ──────────────────────── */
.error-banner {
  padding: 18px;
  background: rgba(243, 130, 136, 0.08);
  border: 1px solid rgba(243, 130, 136, 0.25);
  border-radius: 12px;
  color: var(--red);
}

.error-title {
  font-size: 13px;
  font-weight: 600;
}

.error-text {
  margin-top: 4px;
  font-size: 12px;
  color: var(--dim);
}

.retry-btn {
  margin-top: 10px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--red);
  background: rgba(243, 130, 136, 0.15);
  border: 1px solid rgba(243, 130, 136, 0.3);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.retry-btn:hover {
  background: rgba(243, 130, 136, 0.25);
}

/* ── Responsive ────────────────────────── */
@media (max-width: 720px) {
  .invoice-table-head,
  .invoice-row {
    grid-template-columns: 1fr 100px;
    grid-row-gap: 4px;
  }
  .invoice-table-head > div:nth-child(2),
  .invoice-table-head > div:nth-child(3),
  .invoice-table-head > div:nth-child(4),
  .invoice-row > div:nth-child(2),
  .invoice-row > div:nth-child(3),
  .invoice-row > div:nth-child(4) {
    display: none;
  }
}
</style>
