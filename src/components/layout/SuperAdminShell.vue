<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const route  = useRoute()
const router = useRouter()
const { user, logout, roles } = useAuth()

const time = ref('')
let timer: ReturnType<typeof setInterval>

function updateTime() {
  time.value = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}
onMounted(() => { updateTime(); timer = setInterval(updateTime, 1000) })
onUnmounted(() => clearInterval(timer))

const initials = computed(() => {
  const name = user.value?.name ?? ''
  return name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase() || 'SA'
})

const isSuperAdmin = computed(() =>
  roles().map((r: string) => r.toLowerCase()).includes('super admin'),
)

const isActive = (path: string) =>
  route.path === path || route.path.startsWith(path + '/')

function handleLogout() {
  logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="sa-shell">
    <!-- Sidebar -->
    <aside class="sa-sidebar">
      <div class="sa-logo">
        <div class="sa-logo-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div>
          <div class="sa-logo-text">Orbit<span>HR</span></div>
          <div class="sa-logo-sub">Super Admin</div>
        </div>
      </div>

      <nav class="sa-nav">
        <div class="sa-sec-label">Platform</div>
        <RouterLink to="/super/dashboard" class="sa-nav-item" :class="{ active: isActive('/super/dashboard') }">
          <span>🏠</span> Dashboard
        </RouterLink>
        <RouterLink to="/super/tenants" class="sa-nav-item" :class="{ active: isActive('/super/tenants') }">
          <span>🏢</span> Tenants
        </RouterLink>
        <RouterLink to="/super/subscriptions" class="sa-nav-item" :class="{ active: isActive('/super/subscriptions') }">
          <span>💳</span> Subscriptions
        </RouterLink>
        <RouterLink to="/super/modules" class="sa-nav-item" :class="{ active: isActive('/super/modules') }">
          <span>🧩</span> Modules
        </RouterLink>

        <div class="sa-sec-label" style="margin-top:8px">Analytics</div>
        <RouterLink to="/super/billing" class="sa-nav-item" :class="{ active: isActive('/super/billing') }">
          <span>💰</span> Billing & Revenue
        </RouterLink>
        <RouterLink to="/super/audit" class="sa-nav-item" :class="{ active: isActive('/super/audit') }">
          <span>📋</span> Audit Log
        </RouterLink>

        <div class="sa-sec-label" style="margin-top:8px">Management</div>
        <RouterLink to="/app/admin/users" class="sa-nav-item" :class="{ active: isActive('/app/admin/users') }">
          <span>👥</span> Users
        </RouterLink>
        <RouterLink to="/app/admin/roles-permissions" class="sa-nav-item" :class="{ active: isActive('/app/admin/roles-permissions') }">
          <span>🛡️</span> Roles & Permissions
        </RouterLink>
        <RouterLink to="/app/admin/plans" class="sa-nav-item" :class="{ active: isActive('/app/admin/plans') }">
          <span>🏷️</span> Plans
        </RouterLink>
        <RouterLink to="/app/admin/transactions" class="sa-nav-item" :class="{ active: isActive('/app/admin/transactions') }">
          <span>🔁</span> Transactions
        </RouterLink>
        <RouterLink to="/app/admin/domain-requests" class="sa-nav-item" :class="{ active: isActive('/app/admin/domain-requests') }">
          <span>🌐</span> Domain Requests
        </RouterLink>
        <RouterLink to="/app/admin/settings" class="sa-nav-item" :class="{ active: isActive('/app/admin/settings') }">
          <span>⚙️</span> Admin Settings
        </RouterLink>

        <div class="sa-sec-label" style="margin-top:8px">App</div>
        <RouterLink to="/app" class="sa-nav-item">
          <span>↩️</span> Back to App
        </RouterLink>
      </nav>

      <div class="sa-footer">
        <div class="sa-user">
          <div class="sa-av">{{ initials }}</div>
          <div class="sa-uinfo">
            <div class="sa-uname">{{ user?.name || 'Super Admin' }}</div>
            <div class="sa-urole">Super Administrator</div>
          </div>
          <button class="sa-logout" title="Sign out" @click="handleLogout">⏏</button>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div class="sa-main">
      <header class="sa-topbar">
        <div class="sa-tb-left">
          <h1 class="sa-page-title">{{ ($route.meta as any).title ?? 'Super Admin' }}</h1>
        </div>
        <div class="sa-tb-right">
          <div class="sa-env-badge">🔴 Production Environment</div>
          <div class="sa-time">{{ time }}</div>
        </div>
      </header>

      <main class="sa-content">
        <RouterView v-slot="{ Component }">
          <Transition name="pg" mode="out-in">
            <component :is="Component" :key="$route.path" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped>
.sa-shell { display: flex; min-height: 100vh; background: #070910; }

.sa-sidebar {
  width: 240px; flex-shrink: 0;
  background: #0D0F1A;
  border-right: 1px solid rgba(79,126,255,.12);
  display: flex; flex-direction: column;
  position: fixed; top: 0; left: 0; bottom: 0; z-index: 100;
}

.sa-logo {
  padding: 22px 18px 20px;
  border-bottom: 1px solid rgba(79,126,255,.1);
  display: flex; align-items: center; gap: 12px; flex-shrink: 0;
}
.sa-logo-mark {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  display: grid; place-items: center;
  box-shadow: 0 0 20px rgba(79,126,255,.4);
}
.sa-logo-text { font-weight: 800; font-size: 17px; color: #E8EAF0; }
.sa-logo-text span { color: #4F7EFF; }
.sa-logo-sub { font-size: 9px; color: #6B7280; letter-spacing: 1px; text-transform: uppercase; margin-top: 1px; }

.sa-nav {
  flex: 1; padding: 12px 10px;
  display: flex; flex-direction: column; gap: 2px;
  overflow-y: auto;
}
.sa-sec-label {
  font-size: 9px; font-weight: 700; letter-spacing: 1.2px;
  text-transform: uppercase; color: #4B5563; padding: 10px 10px 5px;
}
.sa-nav-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 10px;
  border-radius: 8px; color: #6B7280; font-size: 13px;
  text-decoration: none; transition: all .14s;
}
.sa-nav-item:hover { background: rgba(79,126,255,.08); color: #9CA3AF; }
.sa-nav-item.active {
  background: rgba(79,126,255,.15); color: #4F7EFF; font-weight: 500;
  border: 1px solid rgba(79,126,255,.2);
}
.sa-badge {
  margin-left: auto; background: rgba(79,126,255,.2); color: #4F7EFF;
  font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 10px;
}
.sa-badge.red { background: rgba(255,107,107,.2); color: #FF6B6B; }

.sa-footer { padding: 12px; border-top: 1px solid rgba(255,255,255,.05); flex-shrink: 0; }
.sa-user { display: flex; align-items: center; gap: 10px; padding: 9px 10px; }
.sa-av {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  display: grid; place-items: center; font-size: 11px; font-weight: 700; color: #fff;
}
.sa-uinfo { flex: 1; min-width: 0; }
.sa-uname { font-size: 12px; font-weight: 500; color: #E8EAF0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
.sa-urole { font-size: 10px; color: #6B7280; }
.sa-logout { margin-left: auto; background: none; border: none; color: #6B7280; cursor: pointer; font-size: 14px; padding: 4px; transition: color .14s; }
.sa-logout:hover { color: #FF6B6B; }

.sa-main { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
.sa-topbar {
  height: 60px; border-bottom: 1px solid rgba(79,126,255,.1);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px; background: #070910; position: sticky; top: 0; z-index: 50; flex-shrink: 0;
}
.sa-page-title { font-weight: 700; font-size: 18px; color: #E8EAF0; }
.sa-tb-right { display: flex; align-items: center; gap: 16px; }
.sa-env-badge {
  font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px;
  background: rgba(255,107,107,.1); color: #FF6B6B; border: 1px solid rgba(255,107,107,.2);
}
.sa-time { font-family: monospace; font-size: 13px; color: #6B7280; }

.sa-content { flex: 1; padding: 28px; overflow-y: auto; }

.pg-enter-active, .pg-leave-active { transition: all .16s ease; }
.pg-enter-from { opacity: 0; transform: translateY(6px); }
.pg-leave-to { opacity: 0; }
</style>
