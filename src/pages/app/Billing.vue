<template>
  <div class="billing-page">
    <!-- Header -->
    <div class="page-header">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 class="page-title">Billing & Subscription</h1>
        <p class="page-subtitle">Manage your plan, view transactions and invoices.</p>
      </div>
    </div>

    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Loading -->
      <div v-if="loading" class="space-y-6">
        <div class="skeleton skeleton-lg"></div>
        <div class="skeleton skeleton-md"></div>
        <div class="skeleton skeleton-md"></div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="error-banner">
        <p class="font-medium">Failed to load billing information</p>
        <p class="text-sm mt-1">{{ error }}</p>
        <button class="retry-btn" @click="loadAll">Retry</button>
      </div>

      <template v-else>
        <!-- Current Plan Card -->
        <section class="card mb-6">
          <div class="card-header">
            <h2 class="card-title">Current Plan</h2>
            <span
              v-if="subscription"
              class="status-badge"
              :class="subscriptionStatusClass"
            >
              {{ subscription.status }}
            </span>
          </div>

          <div v-if="subscription" class="card-body">
            <div class="plan-details-grid">
              <!-- Plan name & price -->
              <div>
                <div class="plan-name">{{ subscription.plan?.name ?? 'N/A' }}</div>
                <div class="plan-price-line">
                  <span class="plan-price">${{ subscription.price_at_subscription ?? subscription.plan?.price ?? '0' }}</span>
                  <span class="plan-cycle">/ {{ subscription.billing_cycle ?? subscription.plan?.billing_cycle ?? 'month' }}</span>
                </div>
              </div>

              <!-- Meta info -->
              <div class="plan-meta-grid">
                <div class="meta-block">
                  <span class="meta-label">Billing cycle</span>
                  <span class="meta-value">{{ subscription.billing_cycle ?? subscription.plan?.billing_cycle ?? '-' }}</span>
                </div>
                <div class="meta-block">
                  <span class="meta-label">Max users</span>
                  <span class="meta-value">{{ subscription.plan?.max_users ?? '-' }}</span>
                </div>
                <div class="meta-block">
                  <span class="meta-label">Active users</span>
                  <span class="meta-value">{{ subscription.active_users_count ?? '-' }}</span>
                </div>
                <div v-if="subscription.expires_at" class="meta-block">
                  <span class="meta-label">Expires</span>
                  <span class="meta-value">{{ formatDate(subscription.expires_at) }}</span>
                </div>
                <div v-if="subscription.next_billing_date" class="meta-block">
                  <span class="meta-label">Next billing</span>
                  <span class="meta-value">{{ formatDate(subscription.next_billing_date) }}</span>
                </div>
                <div v-if="subscription.is_on_trial" class="meta-block">
                  <span class="meta-label">Trial ends</span>
                  <span class="meta-value trial-text">
                    {{ subscription.trial_days_remaining }} days remaining
                  </span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="plan-actions">
              <button
                v-if="subscription.is_active && !subscription.is_cancelled"
                class="btn-primary"
                @click="showUpgradePlans = !showUpgradePlans"
              >
                {{ showUpgradePlans ? 'Hide Plans' : 'Upgrade Plan' }}
              </button>
              <button
                v-if="subscription.is_active && !subscription.is_cancelled"
                class="btn-danger"
                @click="showCancelModal = true"
              >
                Cancel Subscription
              </button>
            </div>
          </div>
          <div v-else class="card-body">
            <p class="text-muted">No active subscription found.</p>
          </div>
        </section>

        <!-- Upgrade Plans Section (collapsible) -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <section v-if="showUpgradePlans" class="mb-6">
            <h2 class="section-title">Available Plans</h2>
            <div v-if="plansLoading" class="flex gap-4">
              <div v-for="i in 3" :key="i" class="skeleton skeleton-card flex-1"></div>
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
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" class="check-icon">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                    {{ feature.name }}
                  </li>
                </ul>

                <!-- Modules -->
                <div v-if="plan.modules && plan.modules.length > 0" class="plan-modules">
                  <span class="plan-modules-label">Modules:</span>
                  <span v-for="mod in plan.modules" :key="mod.slug" class="plan-module-tag">{{ mod.name }}</span>
                </div>

                <button
                  v-if="plan.id !== subscription?.plan?.id"
                  class="btn-select-plan"
                  @click="selectPlanForUpgrade(plan)"
                >
                  Select Plan
                </button>
                <div v-else class="current-plan-label">Your current plan</div>
              </div>
            </div>
          </section>
        </Transition>

        <!-- Active Modules -->
        <section v-if="subscription?.enabled_modules && activeModules.length > 0" class="card mb-6">
          <div class="card-header">
            <h2 class="card-title">Active Modules</h2>
            <span class="module-count">{{ activeModules.length }} active</span>
          </div>
          <div class="card-body">
            <div class="modules-grid">
              <div v-for="mod in activeModules" :key="mod.slug" class="module-item">
                <div class="module-info">
                  <span class="module-name">{{ mod.name }}</span>
                  <span class="module-status-badge active">Active</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Transaction History -->
        <section class="card mb-6">
          <div class="card-header">
            <h2 class="card-title">Transaction History</h2>
          </div>
          <div class="card-body p-0">
            <div v-if="transactions.length === 0" class="empty-state">
              <p>No transactions found.</p>
            </div>
            <div v-else class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="tx in transactions" :key="tx.id">
                    <td>{{ formatDate(tx.created_at) }}</td>
                    <td>
                      <span class="type-badge" :class="'type-' + tx.type">
                        {{ formatTransactionType(tx.type) }}
                      </span>
                    </td>
                    <td class="amount-cell">
                      {{ formatCurrency(tx.amount, tx.currency) }}
                    </td>
                    <td>
                      <span class="tx-status-badge" :class="'tx-' + tx.status">
                        {{ tx.status }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
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
              <h3 class="cancel-modal-title">Cancel Subscription</h3>
            </div>
            <div class="cancel-modal-body">
              <div class="warning-banner">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" class="warning-icon">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
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
                Keep Subscription
              </button>
              <button
                class="btn-confirm-cancel"
                :disabled="cancelling"
                @click="handleCancelSubscription"
              >
                {{ cancelling ? 'Cancelling...' : 'Yes, Cancel' }}
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
/* ── CSS Variables ─────────────────────────────────────── */
.billing-page {
  --bg: #0c0e14;
  --surface: #141720;
  --surface2: #1c2030;
  --surface3: #222840;
  --accent: #4f7eff;
  --green: #36d399;
  --yellow: #f9a825;
  --red: #ff6b6b;
  --purple: #9b6eff;
  --text: #e8eaf0;
  --muted: #6b7280;

  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

/* ── Header ────────────────────────────────────────────── */
.page-header {
  border-bottom: 1px solid var(--surface3);
  background: var(--surface);
  padding: 1.5rem 0;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text);
}

.page-subtitle {
  margin-top: 0.25rem;
  color: var(--muted);
  font-size: 0.9375rem;
}

/* ── Cards ─────────────────────────────────────────────── */
.card {
  background: var(--surface);
  border: 1px solid var(--surface3);
  border-radius: 0.75rem;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--surface3);
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}

.card-body {
  padding: 1.5rem;
}

.card-body.p-0 {
  padding: 0;
}

/* ── Status Badges ─────────────────────────────────────── */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.status-active {
  background: rgba(54, 211, 153, 0.15);
  color: var(--green);
}

.status-trial {
  background: rgba(249, 168, 37, 0.15);
  color: var(--yellow);
}

.status-danger {
  background: rgba(255, 107, 107, 0.15);
  color: var(--red);
}

/* ── Current Plan ──────────────────────────────────────── */
.plan-details-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.plan-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
}

.plan-price-line {
  margin-top: 0.25rem;
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.plan-price {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent);
}

.plan-cycle {
  font-size: 0.875rem;
  color: var(--muted);
}

.plan-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
}

.meta-block {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.meta-label {
  font-size: 0.75rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-value {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text);
}

.trial-text {
  color: var(--yellow);
}

.plan-actions {
  margin-top: 1.5rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.text-muted {
  color: var(--muted);
}

/* ── Buttons ───────────────────────────────────────────── */
.btn-primary {
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-danger {
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--red);
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-danger:hover {
  background: rgba(255, 107, 107, 0.2);
}

/* ── Section title ─────────────────────────────────────── */
.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 1rem;
}

/* ── Plans Grid ────────────────────────────────────────── */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.plan-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--surface3);
  border-radius: 0.75rem;
  padding: 1.5rem;
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
  opacity: 0.7;
}

.popular-badge {
  position: absolute;
  top: -0.5rem;
  right: 1rem;
  background: var(--accent);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.125rem 0.625rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.current-badge {
  position: absolute;
  top: -0.5rem;
  right: 1rem;
  background: var(--green);
  color: #0c0e14;
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.125rem 0.625rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.plan-card-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
}

.plan-card-desc {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  color: var(--muted);
  line-height: 1.5;
}

.plan-card-price {
  margin-top: 0.75rem;
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.price-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
}

.price-cycle {
  font-size: 0.8125rem;
  color: var(--muted);
}

.plan-card-meta {
  margin-top: 0.5rem;
  display: flex;
  gap: 1rem;
  font-size: 0.8125rem;
  color: var(--muted);
}

.plan-features-list {
  margin-top: 1rem;
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1;
}

.plan-features-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--text);
}

.check-icon {
  color: var(--green);
  flex-shrink: 0;
}

.plan-modules {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
}

.plan-modules-label {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 600;
}

.plan-module-tag {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  background: var(--surface3);
  color: var(--text);
  border-radius: 9999px;
}

.btn-select-plan {
  margin-top: 1rem;
  width: 100%;
  padding: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-select-plan:hover {
  opacity: 0.9;
}

.current-plan-label {
  margin-top: 1rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--green);
  font-weight: 500;
}

/* ── Active Modules ────────────────────────────────────── */
.module-count {
  font-size: 0.75rem;
  color: var(--green);
  font-weight: 500;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
}

.module-item {
  padding: 0.75rem 1rem;
  background: var(--surface2);
  border-radius: 0.5rem;
  border: 1px solid var(--surface3);
}

.module-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.module-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

.module-status-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  text-transform: capitalize;
}

.module-status-badge.active {
  background: rgba(54, 211, 153, 0.15);
  color: var(--green);
}

/* ── Transaction Table ─────────────────────────────────── */
.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--muted);
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.data-table th {
  text-align: left;
  padding: 0.75rem 1.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--surface3);
  background: var(--surface2);
}

.data-table td {
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--surface3);
  color: var(--text);
}

.data-table tbody tr:hover {
  background: var(--surface2);
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.type-registration {
  background: rgba(79, 126, 255, 0.15);
  color: var(--accent);
}

.type-module_purchase {
  background: rgba(155, 110, 255, 0.15);
  color: var(--purple);
}

.type-plan_upgrade {
  background: rgba(54, 211, 153, 0.15);
  color: var(--green);
}

.type-renewal {
  background: rgba(249, 168, 37, 0.15);
  color: var(--yellow);
}

.amount-cell {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.tx-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.tx-completed {
  background: rgba(54, 211, 153, 0.15);
  color: var(--green);
}

.tx-failed {
  background: rgba(255, 107, 107, 0.15);
  color: var(--red);
}

.tx-pending {
  background: rgba(249, 168, 37, 0.15);
  color: var(--yellow);
}

.tx-refunded {
  background: rgba(155, 110, 255, 0.15);
  color: var(--purple);
}

/* ── Pagination ────────────────────────────────────────── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  border-top: 1px solid var(--surface3);
}

.page-btn {
  padding: 0.375rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text);
  background: var(--surface2);
  border: 1px solid var(--surface3);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.15s;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--accent);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.8125rem;
  color: var(--muted);
}

/* ── Cancel Modal ──────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 1rem;
}

.cancel-modal {
  background: var(--surface);
  border: 1px solid var(--surface3);
  border-radius: 1rem;
  width: 100%;
  max-width: 460px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
}

.cancel-modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--surface3);
}

.cancel-modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--red);
}

.cancel-modal-body {
  padding: 1.5rem;
}

.warning-banner {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(255, 107, 107, 0.08);
  border: 1px solid rgba(255, 107, 107, 0.2);
  border-radius: 0.5rem;
}

.warning-icon {
  color: var(--red);
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.warning-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--red);
}

.warning-text {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  color: var(--muted);
  line-height: 1.6;
}

.cancel-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--surface3);
}

.btn-cancel-action {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
  background: var(--surface2);
  border: 1px solid var(--surface3);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel-action:hover {
  border-color: var(--muted);
}

.btn-confirm-cancel {
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  background: var(--red);
  border: none;
  border-radius: 0.5rem;
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

/* ── Toast ─────────────────────────────────────────────── */
.toast {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 60;
  padding: 0.75rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.toast-success {
  background: rgba(54, 211, 153, 0.15);
  color: var(--green);
  border: 1px solid rgba(54, 211, 153, 0.3);
}

.toast-error {
  background: rgba(255, 107, 107, 0.15);
  color: var(--red);
  border: 1px solid rgba(255, 107, 107, 0.3);
}

/* ── Skeleton Loading ──────────────────────────────────── */
.skeleton {
  background: var(--surface);
  border: 1px solid var(--surface3);
  border-radius: 0.75rem;
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
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ── Error Banner ──────────────────────────────────────── */
.error-banner {
  padding: 1.25rem;
  background: rgba(255, 107, 107, 0.08);
  border: 1px solid rgba(255, 107, 107, 0.25);
  border-radius: 0.75rem;
  color: var(--red);
}

.retry-btn {
  margin-top: 0.5rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--red);
  background: rgba(255, 107, 107, 0.15);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.15s;
}

.retry-btn:hover {
  background: rgba(255, 107, 107, 0.25);
}
</style>
