<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

// Page title from route meta or name
const title = computed(() => {
  const name = route.name as string ?? ''
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
})

const today = computed(() =>
  new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
)

// Search
const q  = ref('')
const sf = ref(false)

// Notifications
const sn = ref(false)
const nb = ref<HTMLElement | null>(null)

const notifs = ref([
  { id: 1, emoji: '📋', bg: 'rgba(79,126,255,.15)',  text: '4 leave requests pending approval', time: '5 min ago',  unread: true  },
  { id: 2, emoji: '💰', bg: 'rgba(54,211,153,.15)',  text: 'Payroll processed successfully',    time: '1 hr ago',   unread: true  },
  { id: 3, emoji: '📅', bg: 'rgba(155,110,255,.15)', text: 'Q1 Performance reviews due soon',  time: 'Yesterday',  unread: false },
])
const unread   = computed(() => notifs.value.filter(n => n.unread).length)
const markAll  = () => notifs.value.forEach(n => (n.unread = false))

function onOutside(e: MouseEvent) {
  if (nb.value && !nb.value.contains(e.target as Node)) sn.value = false
}
onMounted(() => document.addEventListener('click', onOutside))
onUnmounted(() => document.removeEventListener('click', onOutside))

// Impersonation
const hasImpersonation = ref(!!localStorage.getItem('orbithr_impersonate_backup'))
function stopImpersonation() {
  const backup = localStorage.getItem('orbithr_impersonate_backup')
  if (backup) {
    localStorage.setItem('orbithr_token', backup)
    localStorage.removeItem('orbithr_impersonate_backup')
    window.location.reload()
  }
}

</script>

<template>
  <header class="topbar">
    <!-- Left: title -->
    <div class="title-group">
      <h1 class="title">{{ title }}</h1>
      <p class="date">{{ today }}</p>
    </div>

    <!-- Search -->
    <div class="search" :class="{ focus: sf }">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
      </svg>
      <input v-model="q" placeholder="Search…" @focus="sf = true" @blur="sf = false" />
      <kbd v-if="!sf">⌘K</kbd>
    </div>

    <!-- Right: actions -->
    <div class="actions">
      <!-- Impersonation banner -->
      <button v-if="hasImpersonation" class="imp-btn" @click="stopImpersonation">
        Return to admin
      </button>

      <!-- Notifications -->
      <div ref="nb" class="icon-btn" @click="sn = !sn">
        <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
        </svg>
        <span v-if="unread > 0" class="ndot">{{ unread }}</span>

        <Transition name="drop">
          <div v-if="sn" class="notif-panel" @click.stop>
            <div class="np-head">
              <span>Notifications</span>
              <span class="np-read" @click="markAll">Mark all read</span>
            </div>
            <div v-for="n in notifs" :key="n.id" class="np-item" :class="{ unread: n.unread }">
              <div class="np-icon" :style="{ background: n.bg }">{{ n.emoji }}</div>
              <div>
                <div class="np-text">{{ n.text }}</div>
                <div class="np-time">{{ n.time }}</div>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Add Employee -->
      <RouterLink :to="{ name: 'employee-new' }" class="btn-add">
        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
        </svg>
        Add Employee
      </RouterLink>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: var(--th);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center;
  padding: 0 28px; gap: 14px;
  background: var(--bg);
  position: sticky; top: 0; z-index: 50; flex-shrink: 0;
}

.title-group { flex: 1; }
.title { font-weight: 700; font-size: 18px; letter-spacing: -.3px; color: var(--text); }
.date  { font-size: 11px; color: var(--muted); }

.search {
  display: flex; align-items: center; gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border); border-radius: var(--rs);
  padding: 7px 12px; width: 240px;
  transition: border-color .15s; position: relative;
}
.search.focus { border-color: var(--accent); }
.search svg { color: var(--muted); flex-shrink: 0; }
.search input {
  background: none; border: none; outline: none;
  color: var(--text); font-size: 13px; font-family: inherit; width: 100%;
}
.search input::placeholder { color: var(--muted); }
kbd {
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 4px; padding: 1px 5px; font-size: 10px; color: var(--muted); flex-shrink: 0;
}

.actions { display: flex; align-items: center; gap: 8px; }

.imp-btn {
  padding: 6px 12px; border-radius: var(--rs); font-size: 12px; font-weight: 500;
  background: rgba(255,107,107,.15); color: var(--red);
  border: 1px solid rgba(255,107,107,.3); cursor: pointer; transition: all .14s;
}
.imp-btn:hover { background: rgba(255,107,107,.25); }

.icon-btn {
  width: 36px; height: 36px; border-radius: var(--rs);
  border: 1px solid var(--border); background: var(--surface);
  display: grid; place-items: center; cursor: pointer; color: var(--dim);
  transition: all .14s; position: relative;
}
.icon-btn:hover { border-color: var(--border-hi); color: var(--text); }

.ndot {
  position: absolute; top: 5px; right: 5px;
  min-width: 16px; height: 16px; padding: 0 4px;
  background: var(--red); color: #fff; font-size: 9px; font-weight: 700;
  border-radius: 10px; border: 2px solid var(--bg); display: grid; place-items: center;
}

.notif-panel {
  position: absolute; top: calc(100% + 10px); right: 0; width: 300px;
  background: var(--surface); border: 1px solid var(--border-hi);
  border-radius: var(--r); overflow: hidden;
  box-shadow: 0 16px 40px rgba(0,0,0,.55); z-index: 300;
}
.np-head {
  display: flex; justify-content: space-between;
  padding: 13px 15px 11px; border-bottom: 1px solid var(--border);
  font-size: 13px; font-weight: 600; color: var(--text);
}
.np-read { font-size: 11px; color: var(--accent); cursor: pointer; font-weight: 400; }
.np-item {
  display: flex; align-items: flex-start; gap: 11px;
  padding: 11px 14px; border-bottom: 1px solid var(--border);
  cursor: pointer; transition: background .1s;
}
.np-item:last-child { border-bottom: none; }
.np-item:hover { background: var(--surface2); }
.np-item.unread { background: rgba(79,126,255,.04); }
.np-icon { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; font-size: 13px; flex-shrink: 0; }
.np-text { font-size: 12px; line-height: 1.4; color: var(--text); }
.np-time { font-size: 10px; color: var(--muted); margin-top: 2px; }

.btn-add {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 16px; border-radius: var(--rs); font-size: 13px; font-weight: 500;
  background: var(--accent); color: #fff; border: none;
  box-shadow: 0 0 16px rgba(79,126,255,.3); transition: all .15s; text-decoration: none;
}
.btn-add:hover { background: #3d6ee8; transform: translateY(-1px); box-shadow: 0 0 22px rgba(79,126,255,.45); }

.drop-enter-active, .drop-leave-active { transition: all .18s ease; }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
