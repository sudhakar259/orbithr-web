<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 bg-black bg-opacity-50" @click="$emit('close')" />
    </Transition>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
        @click.self="$emit('close')"
      >
        <div class="w-full max-w-md rounded-lg bg-white shadow-xl">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 class="text-xl font-bold text-slate-900">Complete Your Purchase</h2>
            <button
              @click="$emit('close')"
              class="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          <!-- Content -->
          <div class="px-6 py-4">
            <!-- Module Details -->
            <div class="mb-6 rounded-lg bg-slate-50 p-4">
              <h3 class="font-bold text-slate-900">{{ module.name }}</h3>
              <p class="mt-1 text-sm text-slate-600">{{ module.description }}</p>

              <div class="mt-4 flex items-baseline gap-2">
                <span class="text-2xl font-bold text-slate-900">${{ module.price }}</span>
                <span class="text-sm text-slate-600">/{{ billingTypeLabel }}</span>
              </div>
            </div>

            <!-- Features List -->
            <div class="mb-6">
              <h4 class="mb-2 font-medium text-slate-900">Included features:</h4>
              <ul class="space-y-2">
                <li v-for="feature in module.features" :key="feature.slug" class="flex items-start gap-2 text-sm text-slate-600">
                  <span class="mt-0.5 text-brand-600">✓</span>
                  <span>{{ feature.name }}</span>
                </li>
              </ul>
            </div>

            <!-- Error Message -->
            <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {{ error }}
            </div>

            <!-- Info Message -->
            <div class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
              You will be redirected to Stripe to complete your payment.
            </div>
          </div>

          <!-- Footer -->
          <div class="flex gap-3 border-t border-slate-200 px-6 py-4">
            <button
              @click="$emit('close')"
              class="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              :disabled="loading"
              @click="handleCheckout"
              class="flex-1 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="loading" class="mr-2 inline-block animate-spin">⚙️</span>
              {{ loading ? 'Processing...' : 'Proceed to Payment' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Feature {
  id: number
  module_id: number
  name: string
  slug: string
  description: string | null
  is_active: boolean
}

interface Module {
  id: number
  name: string
  slug: string
  description: string
  features: Feature[]
  price: number
  billing_type: string
  is_free: boolean
  is_core: boolean
}

interface Props {
  module: Module
  open: boolean
}

interface Emits {
  close: []
  success: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const loading = ref(false)
const error = ref('')

const billingTypeLabel = computed(() => {
  return props.module.billing_type === 'recurring' ? 'month' : 'one-time'
})

const handleCheckout = async () => {
  loading.value = true
  error.value = ''

  try {
    // Get current page URL for success/cancel redirects
    const successUrl = `${window.location.origin}/modules/checkout/success`
    const cancelUrl = `${window.location.origin}/modules/checkout/cancel`

    // Call backend to create checkout session
    const response = await fetch(`/api/tenant/modules/${props.module.slug}/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        price_id: `price_${props.module.slug}`, // This should come from your product setup
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to initiate checkout')
    }

    const data = await response.json()

    // Check if it's a free module
    if (data.status === 'free') {
      emit('success')
      return
    }

    // Redirect to Stripe checkout
    if (data.checkout_url) {
      window.location.href = data.checkout_url
    } else {
      throw new Error('No checkout URL received')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred'
  } finally {
    loading.value = false
  }
}

</script>
