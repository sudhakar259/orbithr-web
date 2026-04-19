<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div v-if="isOpen" class="modal-content">
            <!-- Header -->
            <div class="modal-header">
              <h3 class="modal-title">Upgrade to {{ plan.name }}</h3>
              <button class="modal-close" @click="$emit('close')">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="modal-body">
              <!-- Plan info -->
              <div class="plan-summary">
                <div class="plan-price-row">
                  <span class="plan-price">${{ plan.price }}</span>
                  <span class="plan-cycle">/ {{ plan.billing_cycle }}</span>
                </div>
                <p v-if="plan.description" class="plan-desc">{{ plan.description }}</p>
                <div class="plan-meta">
                  <span class="meta-item">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"
                      />
                    </svg>
                    Up to {{ plan.max_users }} users
                  </span>
                  <span v-if="plan.trial_days > 0" class="meta-item meta-trial">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    {{ plan.trial_days }}-day free trial
                  </span>
                </div>
              </div>

              <!-- Features -->
              <div v-if="plan.features && plan.features.length > 0" class="features-section">
                <h4 class="features-heading">Included features</h4>
                <ul class="features-list">
                  <li v-for="feature in plan.features" :key="feature.slug" class="feature-item">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      class="feature-check"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    <span>{{ feature.name }}</span>
                    <span v-if="feature.value" class="feature-value">{{ feature.value }}</span>
                  </li>
                </ul>
              </div>

              <!-- Modules -->
              <div v-if="plan.modules && plan.modules.length > 0" class="features-section">
                <h4 class="features-heading">Included modules</h4>
                <div class="modules-tags">
                  <span v-for="mod in plan.modules" :key="mod.slug" class="module-tag">
                    {{ mod.name }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="modal-footer">
              <button class="btn-cancel" @click="$emit('close')">Cancel</button>
              <button class="btn-confirm" :disabled="loading" @click="$emit('confirmed', plan)">
                <svg
                  v-if="loading"
                  class="animate-spin"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="3"
                    class="opacity-25"
                  />
                  <path
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    fill="currentColor"
                    class="opacity-75"
                  />
                </svg>
                {{ loading ? 'Redirecting...' : 'Confirm & Pay' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Plan } from '@/services/billing'

defineProps<{
  plan: Plan
  isOpen: boolean
  loading?: boolean
}>()

defineEmits<{
  close: []
  confirmed: [plan: Plan]
}>()
</script>

<style scoped>
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

.modal-content {
  --surface: #141720;
  --surface2: #1c2030;
  --surface3: #222840;
  --accent: #4f7eff;
  --green: #36d399;
  --yellow: #f9a825;
  --text: #e8eaf0;
  --muted: #6b7280;

  background: var(--surface);
  border: 1px solid var(--surface3);
  border-radius: 1rem;
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--surface3);
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
}

.modal-close {
  color: var(--muted);
  padding: 0.25rem;
  border-radius: 0.375rem;
  transition: color 0.15s;
  background: none;
  border: none;
  cursor: pointer;
}

.modal-close:hover {
  color: var(--text);
}

.modal-body {
  padding: 1.5rem;
}

.plan-summary {
  padding: 1rem;
  background: var(--surface2);
  border-radius: 0.75rem;
  margin-bottom: 1.25rem;
}

.plan-price-row {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.plan-price {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text);
}

.plan-cycle {
  font-size: 0.875rem;
  color: var(--muted);
}

.plan-desc {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--muted);
  line-height: 1.5;
}

.plan-meta {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: var(--muted);
}

.meta-trial {
  color: var(--yellow);
}

.features-section {
  margin-bottom: 1.25rem;
}

.features-heading {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text);
}

.feature-check {
  color: var(--green);
  flex-shrink: 0;
}

.feature-value {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--muted);
  background: var(--surface3);
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
}

.modules-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.module-tag {
  font-size: 0.8125rem;
  padding: 0.25rem 0.75rem;
  background: var(--surface3);
  color: var(--text);
  border-radius: 9999px;
  border: 1px solid rgba(79, 126, 255, 0.2);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--surface3);
}

.btn-cancel {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--muted);
  background: var(--surface2);
  border: 1px solid var(--surface3);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel:hover {
  color: var(--text);
  border-color: var(--muted);
}

.btn-confirm {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
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

.btn-confirm:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
