<template>
  <div class="shell">

    <!-- ── Sidebar ─────────────────────────────────────────── -->
    <aside class="sidebar">

      <!-- Logo -->
      <div class="logo">
        <div class="logo-mark">O</div>
        <div class="logo-text">Orbit<span>API</span></div>
      </div>

      <!-- Back link -->
      <router-link to="/app" class="back-link">
        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
        Back to App
      </router-link>

      <!-- Status pill -->
      <div class="status-pill" :class="apiStatus">
        <span class="sdot"></span>
        {{ apiStatus === 'online' ? 'API Online' : apiStatus === 'loading' ? 'Checking…' : 'API Offline' }}
      </div>

      <!-- Search -->
      <div class="search-wrap" :class="{ focus: searchFocus }">
        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
        <input
          v-model="filterText"
          placeholder="Filter endpoints…"
          @focus="searchFocus = true"
          @blur="searchFocus = false"
          @input="applyFilter"
        />
      </div>

      <!-- Navigation groups -->
      <nav class="nav">
        <div class="sec-label">Endpoint Groups</div>
        <button
          v-for="g in groups"
          :key="g.id"
          class="nav-item"
          :class="{ active: activeGroup === g.id }"
          @click="scrollToGroup(g.id)"
        >
          <span class="ni-dot" :style="{ background: g.color }"></span>
          <span class="ni-label">{{ g.label }}</span>
          <span class="ni-count">{{ g.count }}</span>
        </button>
      </nav>

      <!-- Footer links -->
      <div class="sidebar-footer">
        <div class="sf-label">Download</div>
        <a :href="specUrl" target="_blank" class="sf-link">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          OpenAPI Spec
        </a>
        <a :href="postmanUrl" target="_blank" class="sf-link">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/></svg>
          Postman Collection
        </a>
        <a :href="scribeUrl" target="_blank" class="sf-link sf-link-accent">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd"/></svg>
          Open Scribe UI
        </a>
      </div>
    </aside>

    <!-- ── Main ────────────────────────────────────────────── -->
    <div class="main-wrap">

      <!-- Topbar -->
      <header class="topbar">
        <div class="title-group">
          <h1 class="title">API Documentation</h1>
          <p class="subtitle">OrbitHR REST API &nbsp;·&nbsp; <code>{{ backendUrl }}/api</code> &nbsp;·&nbsp; Bearer JWT</p>
        </div>
        <div class="tb-actions">
          <div class="auth-badge">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
            JWT Auth Required
          </div>
          <a :href="scribeUrl" target="_blank" class="btn-primary">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd"/></svg>
            Open Scribe
          </a>
        </div>
      </header>

      <!-- Page content -->
      <main class="page">

        <!-- Loading state -->
        <div v-if="loading" class="state-card">
          <div class="spin"></div>
          <span>Loading API specification…</span>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="state-card error">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          <div>
            <div class="error-title">Could not load API specification</div>
            <div class="error-sub">Make sure the backend is running at <code>{{ backendUrl }}</code></div>
          </div>
        </div>

        <!-- SwaggerUI -->
        <div v-show="!loading && !error" class="swagger-card">
          <div id="swagger-ui-container" ref="swaggerEl"></div>
        </div>

      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import SwaggerUI from 'swagger-ui-dist/swagger-ui-es-bundle'
import 'swagger-ui-dist/swagger-ui.css'

const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://127.0.0.1:8000'
const specUrl    = `${backendUrl}/docs.openapi`
const postmanUrl = `${backendUrl}/docs.postman`
const scribeUrl  = `${backendUrl}/docs`

const swaggerEl   = ref<HTMLElement | null>(null)
const loading     = ref(true)
const error       = ref(false)
const filterText  = ref('')
const searchFocus = ref(false)
const activeGroup = ref('')
const apiStatus   = ref<'loading' | 'online' | 'offline'>('loading')

// API groups matching the Scribe @group annotations
const groups = [
  { id: 'authentication',    label: 'Authentication',      color: '#9B6EFF', count: 8  },
  { id: 'employees',         label: 'Employees',           color: '#4F7EFF', count: 12 },
  { id: 'attendance',        label: 'Attendance',          color: '#36D399', count: 14 },
  { id: 'leave',             label: 'Leave',               color: '#F9A825', count: 12 },
  { id: 'payroll',           label: 'Payroll',             color: '#4F7EFF', count: 13 },
  { id: 'payslips',          label: 'Payslips',            color: '#36D399', count: 10 },
  { id: 'salary-advances',   label: 'Salary Advances',     color: '#50E3C2', count: 9  },
  { id: 'projects',          label: 'Projects',            color: '#F9A825', count: 6  },
  { id: 'documents',         label: 'Documents',           color: '#FF6B6B', count: 7  },
  { id: 'roles-permissions', label: 'Roles & Permissions', color: '#9B6EFF', count: 8  },
  { id: 'module-marketplace',label: 'Module Marketplace',  color: '#4F7EFF', count: 7  },
  { id: 'admin-modules',     label: 'Admin: Modules',      color: '#FF6B6B', count: 10 },
  { id: 'admin-plans',       label: 'Admin: Plans',        color: '#F9A825', count: 11 },
  { id: 'webhooks',          label: 'Webhooks',            color: '#36D399', count: 1  },
]

let swaggerInstance: any = null

function scrollToGroup(id: string) {
  activeGroup.value = id
  // SwaggerUI renders tags as <h3> with data-tag or section[id] — scroll to it
  const el = document.querySelector(`.opblock-tag[data-tag="${id}"], #operations-tag-${id}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function applyFilter() {
  if (!swaggerInstance) return
  // trigger SwaggerUI's built-in filter
  swaggerInstance.getSystem().layoutActions.updateFilter(filterText.value)
}

async function checkApiStatus() {
  try {
    const res = await fetch(`${backendUrl}/up`, { signal: AbortSignal.timeout(3000) })
    apiStatus.value = res.ok ? 'online' : 'offline'
  } catch {
    apiStatus.value = 'offline'
  }
}

onMounted(async () => {
  checkApiStatus()

  try {
    const res = await fetch(specUrl)
    if (!res.ok) throw new Error()

    loading.value = false

    swaggerInstance = SwaggerUI({
      dom_id: '#swagger-ui-container',
      url: specUrl,
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: false,
      defaultModelsExpandDepth: -1,
      defaultModelExpandDepth: 2,
      docExpansion: 'list',
      presets: [SwaggerUI.presets.apis],
      plugins: [SwaggerUI.plugins.DownloadUrl],
      layout: 'BaseLayout',
    })
  } catch {
    loading.value = false
    error.value = true
  }
})

onUnmounted(() => { swaggerInstance = null })
</script>

<style>
/* ── Reset & CSS vars (matching template global.css) ──────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.shell {
  --bg:        #0C0E14;
  --surface:   #141720;
  --surface2:  #1C2030;
  --surface3:  #222840;
  --border:    rgba(255,255,255,0.06);
  --border-hi: rgba(255,255,255,0.13);
  --accent:    #4F7EFF;
  --accent-glow: rgba(79,126,255,0.14);
  --green:     #36D399;
  --yellow:    #F9A825;
  --red:       #FF6B6B;
  --purple:    #9B6EFF;
  --text:      #E8EAF0;
  --muted:     #6B7280;
  --dim:       #9CA3AF;
  --sw:        260px;
  --th:        64px;
  --r:         14px;
  --rs:        8px;

  display: flex;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ── Sidebar ──────────────────────────────────────────────── */
.sidebar {
  width: var(--sw);
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 100;
  overflow: hidden;
}

.logo {
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.logo-mark {
  width: 34px; height: 34px;
  background: var(--accent);
  border-radius: 10px;
  display: grid; place-items: center;
  font-weight: 800; font-size: 15px; color: #fff;
  box-shadow: 0 0 18px rgba(79,126,255,.4);
  flex-shrink: 0;
}
.logo-text { font-weight: 700; font-size: 17px; letter-spacing: -.3px; }
.logo-text span { color: var(--accent); }

.back-link {
  display: flex; align-items: center; gap: 8px;
  margin: 12px 12px 4px;
  padding: 7px 10px;
  border-radius: var(--rs);
  font-size: 12px; color: var(--muted);
  text-decoration: none;
  transition: all .14s;
  border: 1px solid transparent;
}
.back-link:hover { background: var(--surface2); color: var(--text); border-color: var(--border); }

.status-pill {
  display: flex; align-items: center; gap: 7px;
  margin: 0 12px 8px;
  padding: 6px 10px;
  border-radius: var(--rs);
  font-size: 11px; font-weight: 600;
  background: var(--surface2);
}
.status-pill.online  { color: var(--green); }
.status-pill.offline { color: var(--red);   }
.status-pill.loading { color: var(--yellow); }
.sdot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
  background: currentColor;
}
.status-pill.online  .sdot { box-shadow: 0 0 6px rgba(54,211,153,.6); }
.status-pill.loading .sdot { animation: pulse 1.2s ease infinite; }

/* Search */
.search-wrap {
  display: flex; align-items: center; gap: 8px;
  margin: 0 12px 8px;
  padding: 7px 10px;
  border-radius: var(--rs);
  background: var(--surface2);
  border: 1px solid var(--border);
  transition: border-color .15s;
}
.search-wrap.focus { border-color: var(--accent); }
.search-wrap svg { color: var(--muted); flex-shrink: 0; }
.search-wrap input {
  background: none; border: none; outline: none;
  color: var(--text); font-size: 12px; font-family: inherit; width: 100%;
}
.search-wrap input::placeholder { color: var(--muted); }

/* Nav */
.nav {
  flex: 1;
  padding: 4px 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.sec-label {
  font-size: 9px; font-weight: 700; letter-spacing: 1.2px;
  text-transform: uppercase; color: var(--muted);
  padding: 8px 10px 5px; margin-top: 2px;
}
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px;
  border-radius: var(--rs);
  background: none; border: none;
  color: var(--dim); font-size: 12.5px; font-family: inherit;
  cursor: pointer; text-align: left;
  transition: all .14s;
}
.nav-item:hover { background: var(--surface2); color: var(--text); }
.nav-item.active { background: var(--accent-glow); color: var(--accent); }
.ni-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.ni-label { flex: 1; }
.ni-count {
  font-size: 10px; background: var(--surface2);
  border-radius: 20px; padding: 1px 6px; color: var(--muted);
}
.nav-item.active .ni-count { background: var(--accent-glow); color: var(--accent); }

/* Sidebar footer */
.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sf-label { font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); padding: 2px 4px 6px; }
.sf-link {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: var(--rs);
  font-size: 12px; color: var(--dim);
  text-decoration: none; transition: all .14s;
}
.sf-link:hover { background: var(--surface2); color: var(--text); }
.sf-link-accent { color: var(--accent); margin-top: 4px; }
.sf-link-accent:hover { background: var(--accent-glow); }

/* ── Main wrap ────────────────────────────────────────────── */
.main-wrap {
  margin-left: var(--sw);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* Topbar */
.topbar {
  height: var(--th);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center;
  padding: 0 28px; gap: 14px;
  background: var(--bg);
  position: sticky; top: 0; z-index: 50; flex-shrink: 0;
}
.title-group { flex: 1; }
.title { font-weight: 700; font-size: 20px; letter-spacing: -.3px; }
.subtitle { font-size: 11px; color: var(--muted); margin-top: 2px; }
.subtitle code {
  background: var(--surface2); color: var(--dim);
  padding: 1px 5px; border-radius: 4px; font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
}

.tb-actions { display: flex; align-items: center; gap: 8px; }
.auth-badge {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 11px;
  background: rgba(155,110,255,.1);
  border: 1px solid rgba(155,110,255,.2);
  border-radius: var(--rs);
  font-size: 11px; font-weight: 500; color: #9B6EFF;
}
.btn-primary {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 16px;
  border-radius: var(--rs); font-size: 13px; font-weight: 500;
  background: var(--accent); color: #fff; border: none;
  box-shadow: 0 0 16px rgba(79,126,255,.3);
  transition: all .15s; text-decoration: none; cursor: pointer;
}
.btn-primary:hover { background: #3d6ee8; transform: translateY(-1px); box-shadow: 0 0 22px rgba(79,126,255,.45); }

/* Page */
.page {
  flex: 1; padding: 24px 28px;
  display: flex; flex-direction: column; gap: 16px;
}

/* State cards */
.state-card {
  display: flex; align-items: center; gap: 14px;
  padding: 32px 28px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r);
  color: var(--muted); font-size: 14px;
}
.state-card.error { color: var(--red); border-color: rgba(255,107,107,.15); background: rgba(255,107,107,.04); }
.error-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.error-sub { font-size: 12px; color: var(--muted); }
.error-sub code { background: var(--surface2); padding: 1px 5px; border-radius: 4px; color: var(--dim); }

/* Spinner */
.spin {
  width: 18px; height: 18px; flex-shrink: 0;
  border: 2px solid var(--border-hi);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin .7s linear infinite;
}

/* Swagger card */
.swagger-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
  padding: 20px;
}

/* ── SwaggerUI dark theme ─────────────────────────────────── */
.swagger-ui { font-family: 'DM Sans', system-ui, sans-serif !important; color: var(--text) !important; }
.swagger-ui .topbar { display: none !important; }
.swagger-ui .info { margin: 0 0 20px; padding: 20px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--rs); }
.swagger-ui .info .title { color: var(--text) !important; font-size: 22px !important; font-weight: 700 !important; }
.swagger-ui .info .title small { background: var(--accent-glow); color: var(--accent); border: none; border-radius: 6px; padding: 2px 10px; font-size: 12px; }
.swagger-ui .info p, .swagger-ui .info li { color: var(--dim) !important; }
.swagger-ui .info a { color: var(--accent) !important; }
.swagger-ui .info code { background: var(--surface3); border-radius: 4px; padding: 1px 5px; color: var(--dim); }

.swagger-ui .scheme-container { background: var(--surface2) !important; box-shadow: none !important; padding: 12px 16px; border: 1px solid var(--border); border-radius: var(--rs); margin-bottom: 16px; }
.swagger-ui .schemes > label  { color: var(--muted) !important; font-size: 11px !important; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.swagger-ui select { background: var(--surface3) !important; color: var(--text) !important; border: 1px solid var(--border-hi) !important; border-radius: var(--rs) !important; padding: 5px 10px !important; }

.swagger-ui .auth-wrapper .authorize { background: var(--accent) !important; border-color: var(--accent) !important; color: #fff !important; border-radius: var(--rs) !important; }
.swagger-ui .auth-wrapper svg { fill: #fff !important; }

/* Tags */
.swagger-ui .opblock-tag { color: var(--text) !important; border-bottom: 1px solid var(--border) !important; font-size: 15px !important; font-weight: 600 !important; padding: 14px 0 !important; margin: 0 !important; }
.swagger-ui .opblock-tag:hover { background: rgba(255,255,255,.02) !important; }
.swagger-ui .opblock-tag small { color: var(--muted) !important; font-size: 12px !important; font-weight: 400; }
.swagger-ui .opblock-tag-section { background: transparent !important; margin-bottom: 8px !important; }

/* Operation blocks */
.swagger-ui .opblock { background: var(--surface2) !important; border: 1px solid var(--border) !important; border-radius: var(--rs) !important; margin: 4px 0 !important; box-shadow: none !important; }
.swagger-ui .opblock:hover { border-color: var(--border-hi) !important; }
.swagger-ui .opblock .opblock-summary { padding: 10px 14px !important; }
.swagger-ui .opblock .opblock-summary-description { color: var(--dim) !important; font-size: 13px !important; }
.swagger-ui .opblock .opblock-summary-path { color: var(--text) !important; font-size: 13px !important; font-family: 'JetBrains Mono', monospace !important; }
.swagger-ui .opblock-body { background: var(--surface3) !important; border-top: 1px solid var(--border) !important; }

/* HTTP method colors */
.swagger-ui .opblock-summary-method { border-radius: 5px !important; font-size: 11px !important; font-weight: 700 !important; min-width: 58px !important; padding: 4px 6px !important; text-align: center !important; }

.swagger-ui .opblock.opblock-get    { border-left: 3px solid #36D399 !important; }
.swagger-ui .opblock.opblock-get    .opblock-summary-method { background: rgba(54,211,153,.15)  !important; color: #36D399 !important; }
.swagger-ui .opblock.opblock-post   { border-left: 3px solid #4F7EFF !important; }
.swagger-ui .opblock.opblock-post   .opblock-summary-method { background: rgba(79,126,255,.15)  !important; color: #4F7EFF !important; }
.swagger-ui .opblock.opblock-put    { border-left: 3px solid #F9A825 !important; }
.swagger-ui .opblock.opblock-put    .opblock-summary-method { background: rgba(249,168,37,.15)  !important; color: #F9A825 !important; }
.swagger-ui .opblock.opblock-patch  { border-left: 3px solid #50E3C2 !important; }
.swagger-ui .opblock.opblock-patch  .opblock-summary-method { background: rgba(80,227,194,.15)  !important; color: #50E3C2 !important; }
.swagger-ui .opblock.opblock-delete { border-left: 3px solid #FF6B6B !important; }
.swagger-ui .opblock.opblock-delete .opblock-summary-method { background: rgba(255,107,107,.15) !important; color: #FF6B6B !important; }

/* Section headers inside body */
.swagger-ui .opblock-section-header { background: var(--surface2) !important; border-bottom: 1px solid var(--border) !important; }
.swagger-ui .opblock-section-header label { color: var(--muted) !important; font-size: 11px !important; font-weight: 600 !important; text-transform: uppercase; letter-spacing: .5px; }
.swagger-ui .opblock-section-header h4 { color: var(--dim) !important; }

/* Parameters */
.swagger-ui table thead tr td, .swagger-ui table thead tr th { color: var(--muted) !important; border-bottom: 1px solid var(--border) !important; font-size: 11px !important; font-weight: 600 !important; text-transform: uppercase; letter-spacing: .5px; background: transparent !important; padding: 8px 10px !important; }
.swagger-ui .parameter__name { color: var(--text) !important; font-size: 13px !important; font-family: 'JetBrains Mono', monospace !important; }
.swagger-ui .parameter__type { color: var(--purple) !important; font-size: 11px !important; }
.swagger-ui .parameter__name.required span { color: var(--red) !important; }
.swagger-ui .parameter__in { color: var(--muted) !important; font-size: 11px !important; }
.swagger-ui td.col { background: transparent !important; color: var(--dim) !important; font-size: 13px !important; }
.swagger-ui tr.odd { background: rgba(255,255,255,.015) !important; }

/* Markdown */
.swagger-ui .markdown p, .swagger-ui .renderedMarkdown p { color: var(--dim) !important; font-size: 13px !important; }
.swagger-ui .markdown code, .swagger-ui .renderedMarkdown code { background: var(--surface3) !important; color: var(--accent) !important; border-radius: 4px; padding: 1px 5px; }

/* Response codes */
.swagger-ui .response-col_status { color: var(--text) !important; font-family: 'JetBrains Mono', monospace !important; font-size: 13px !important; }
.swagger-ui .response-col_description { color: var(--dim) !important; font-size: 13px !important; }

/* Code blocks */
.swagger-ui .highlight-code { background: var(--surface3) !important; border-radius: var(--rs) !important; border: 1px solid var(--border) !important; }
.swagger-ui .microlight { color: var(--text) !important; font-size: 12px !important; font-family: 'JetBrains Mono', monospace !important; }
.swagger-ui pre.microlight { padding: 14px !important; }
.swagger-ui .body-param__text { background: var(--surface3) !important; color: var(--text) !important; border: 1px solid var(--border-hi) !important; border-radius: var(--rs) !important; font-family: 'JetBrains Mono', monospace !important; font-size: 12px !important; }

/* Buttons */
.swagger-ui .try-out__btn { background: var(--surface3) !important; color: var(--accent) !important; border: 1px solid var(--accent) !important; border-radius: var(--rs) !important; font-size: 12px !important; }
.swagger-ui .btn.execute { background: var(--accent) !important; border-color: var(--accent) !important; border-radius: var(--rs) !important; color: #fff !important; box-shadow: 0 0 12px rgba(79,126,255,.3) !important; }
.swagger-ui .btn.cancel  { background: transparent !important; border: 1px solid var(--border-hi) !important; color: var(--dim) !important; border-radius: var(--rs) !important; }
.swagger-ui .btn.authorize { background: var(--accent) !important; border-radius: var(--rs) !important; color: #fff !important; border-color: var(--accent) !important; }

/* Inputs */
.swagger-ui input[type="text"], .swagger-ui input[type="password"], .swagger-ui textarea {
  background: var(--surface3) !important; color: var(--text) !important;
  border: 1px solid var(--border-hi) !important; border-radius: var(--rs) !important;
}
.swagger-ui input::placeholder { color: var(--muted) !important; }

/* Filter input */
.swagger-ui .filter-container input { background: var(--surface2) !important; border: 1px solid var(--border-hi) !important; color: var(--text) !important; border-radius: var(--rs) !important; padding: 8px 14px !important; }
.swagger-ui .filter-container input::placeholder { color: var(--muted) !important; }

/* Models section */
.swagger-ui section.models { background: var(--surface2) !important; border: 1px solid var(--border) !important; border-radius: var(--rs) !important; margin-top: 16px !important; }
.swagger-ui section.models h4 { color: var(--text) !important; font-size: 14px !important; }
.swagger-ui .model { color: var(--dim) !important; font-size: 13px !important; }
.swagger-ui .prop-name { color: var(--accent) !important; font-family: 'JetBrains Mono', monospace !important; }
.swagger-ui .prop-type { color: var(--purple) !important; font-size: 12px !important; }

/* Auth modal */
.swagger-ui .dialog-ux .modal-ux { background: var(--surface) !important; border: 1px solid var(--border-hi) !important; border-radius: var(--r) !important; }
.swagger-ui .dialog-ux .modal-ux-header { background: var(--surface2) !important; border-bottom: 1px solid var(--border) !important; }
.swagger-ui .dialog-ux .modal-ux-header h3 { color: var(--text) !important; }
.swagger-ui .dialog-ux .modal-ux-content p { color: var(--muted) !important; font-size: 12px !important; }

/* Arrow expand icons */
.swagger-ui .expand-operation svg, .swagger-ui .arrow { fill: var(--muted) !important; }

/* Scrollbar */
.swagger-ui ::-webkit-scrollbar, .sidebar::-webkit-scrollbar, .nav::-webkit-scrollbar { width: 4px; height: 4px; }
.swagger-ui ::-webkit-scrollbar-track, .sidebar::-webkit-scrollbar-track, .nav::-webkit-scrollbar-track { background: transparent; }
.swagger-ui ::-webkit-scrollbar-thumb, .sidebar::-webkit-scrollbar-thumb, .nav::-webkit-scrollbar-thumb { background: var(--border-hi); border-radius: 4px; }

/* Animations */
@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
</style>
