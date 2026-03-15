<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
const open = ref(false)
</script>

<template>
  <header class="mh-header">
    <div class="mh-inner">
      <!-- Brand -->
      <RouterLink to="/" class="mh-brand">
        <div class="mh-logo-mark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="mh-brand-name">Orbit<span>HR</span></span>
      </RouterLink>

      <!-- Desktop nav -->
      <nav class="mh-nav">
        <RouterLink to="/" class="mh-link">Features</RouterLink>
        <RouterLink to="/pricing" class="mh-link">Pricing</RouterLink>
        <a href="#how-it-works" class="mh-link">How it works</a>
        <a href="#testimonials" class="mh-link">Customers</a>
      </nav>

      <!-- Desktop CTA -->
      <div class="mh-cta">
        <RouterLink to="/login" class="mh-signin">Sign In</RouterLink>
        <RouterLink to="/register" class="mh-btn">Start free trial</RouterLink>
      </div>

      <!-- Mobile hamburger -->
      <button class="mh-burger" @click="open = !open" aria-label="Toggle menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <template v-if="!open">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </template>
          <template v-else>
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </template>
        </svg>
      </button>
    </div>

    <!-- Mobile menu -->
    <div v-if="open" class="mh-mobile">
      <RouterLink to="/" class="mh-mobile-link" @click="open=false">Features</RouterLink>
      <RouterLink to="/pricing" class="mh-mobile-link" @click="open=false">Pricing</RouterLink>
      <a href="#how-it-works" class="mh-mobile-link" @click="open=false">How it works</a>
      <a href="#testimonials" class="mh-mobile-link" @click="open=false">Customers</a>
      <div class="mh-mobile-divider"></div>
      <RouterLink to="/login" class="mh-mobile-link" @click="open=false">Sign In</RouterLink>
      <RouterLink to="/register" class="mh-btn mh-mobile-btn" @click="open=false">Start free trial</RouterLink>
    </div>
  </header>
</template>

<style scoped>
.mh-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(12, 14, 20, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.mh-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 40px;
}

/* Brand */
.mh-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
}
.mh-logo-mark {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  display: grid;
  place-items: center;
  box-shadow: 0 0 16px rgba(79, 126, 255, 0.35);
}
.mh-brand-name {
  font-size: 17px;
  font-weight: 800;
  color: #E8EAF0;
  letter-spacing: -0.3px;
}
.mh-brand-name span { color: #4F7EFF; }

/* Nav */
.mh-nav {
  display: flex;
  align-items: center;
  gap: 32px;
  flex: 1;
}
.mh-link {
  font-size: 14px;
  font-weight: 500;
  color: #9CA3AF;
  text-decoration: none;
  transition: color 0.15s;
}
.mh-link:hover { color: #E8EAF0; }

/* CTA */
.mh-cta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.mh-signin {
  font-size: 14px;
  font-weight: 500;
  color: #9CA3AF;
  text-decoration: none;
  transition: color 0.15s;
}
.mh-signin:hover { color: #E8EAF0; }
.mh-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 18px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  text-decoration: none;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  box-shadow: 0 0 18px rgba(79, 126, 255, 0.3);
  transition: box-shadow 0.15s, transform 0.15s;
}
.mh-btn:hover {
  box-shadow: 0 0 26px rgba(79, 126, 255, 0.5);
  transform: translateY(-1px);
}

/* Hamburger */
.mh-burger {
  display: none;
  background: none;
  border: none;
  color: #9CA3AF;
  cursor: pointer;
  margin-left: auto;
  padding: 4px;
}

/* Mobile menu */
.mh-mobile {
  display: flex;
  flex-direction: column;
  padding: 12px 20px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: #0C0E14;
  gap: 4px;
}
.mh-mobile-link {
  font-size: 15px;
  font-weight: 500;
  color: #9CA3AF;
  text-decoration: none;
  padding: 10px 8px;
  border-radius: 8px;
  transition: background 0.15s, color 0.15s;
}
.mh-mobile-link:hover { background: rgba(255,255,255,.05); color: #E8EAF0; }
.mh-mobile-divider { height: 1px; background: rgba(255,255,255,.06); margin: 8px 0; }
.mh-mobile-btn { width: 100%; justify-content: center; margin-top: 8px; }

@media (max-width: 768px) {
  .mh-inner { padding: 0 20px; gap: 0; }
  .mh-nav, .mh-cta { display: none; }
  .mh-burger { display: block; }
}
</style>
