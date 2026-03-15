<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import api from '@/services/api'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'

const { user, setAuth, token } = useAuth()
const toast    = useToast()
const editing  = ref(false)
const pwError  = ref('')

const getInitials = (name: string) =>
  (name ?? '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

const initials = computed(() => getInitials(user.value?.name ?? 'U'))

const form = reactive({
  name:  user.value?.name  ?? '',
  email: user.value?.email ?? '',
  phone: user.value?.phone ?? '',
  bio:   user.value?.bio   ?? '',
})

const pw = reactive({ current: '', newPw: '', confirm: '' })

const sessions = ref([
  { id: 1, device: 'Current Browser', location: 'Current Session', time: 'Active now', icon: '💻', current: true },
])

async function loadProfile() {
  try {
    const { data } = await api.get('/profile')
    const u = data.data ?? data
    form.name  = u.name  ?? form.name
    form.email = u.email ?? form.email
    form.phone = u.phone ?? form.phone
    form.bio   = u.bio   ?? form.bio
    if (u.sessions) sessions.value = u.sessions
  } catch {}
}

async function saveProfile() {
  try {
    const { data } = await api.put('/profile', {
      name: form.name, email: form.email, phone: form.phone, bio: form.bio,
    })
    const updated = data.data ?? data
    setAuth({ ...user.value, ...updated }, token.value ?? '')
    editing.value = false
    toast.success('✓ Profile updated successfully!')
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? 'Failed to update profile.')
  }
}

async function changePassword() {
  pwError.value = ''
  if (!pw.current) { pwError.value = 'Enter your current password.'; return }
  if (!pw.newPw || pw.newPw.length < 8) { pwError.value = 'New password must be at least 8 characters.'; return }
  if (pw.newPw !== pw.confirm) { pwError.value = 'Passwords do not match.'; return }
  try {
    await api.post('/auth/change-password', {
      current_password: pw.current,
      password: pw.newPw,
      password_confirmation: pw.confirm,
    })
    Object.assign(pw, { current: '', newPw: '', confirm: '' })
    toast.success('✓ Password updated successfully!')
  } catch (e: any) {
    pwError.value = e?.response?.data?.message ?? 'Failed to update password.'
  }
}

async function revokeSession(id: number) {
  try {
    await api.delete(`/sessions/${id}`)
  } catch {}
  sessions.value = sessions.value.filter(s => s.id !== id)
  toast.success('Session revoked.')
}

onMounted(loadProfile)

const userRoles = computed(() => {
  if (!user.value) return []
  const r = user.value.roles ?? []
  return r.map((x: any) => typeof x === 'string' ? x : x.name)
})
</script>

<template>
  <div class="profile-page">
    <div class="page-head">
      <router-link to="/app" class="back-link">← Back to Dashboard</router-link>
      <h1 class="ph-title">My Profile</h1>
      <p class="ph-sub">Manage your personal account settings</p>
    </div>

    <div class="profile-grid">
      <!-- Avatar card -->
      <div class="card avatar-card">
        <div class="av-big">{{ initials }}</div>
        <div class="av-name">{{ form.name }}</div>
        <div v-if="userRoles.length" class="av-role">{{ userRoles[0] }}</div>
        <div class="av-email">{{ form.email }}</div>

        <div class="av-divider"></div>

        <!-- Roles -->
        <div class="perm-summary" v-if="userRoles.length">
          <div class="ps-title">Roles</div>
          <div v-for="role in userRoles" :key="role" class="ps-row">
            <span class="ps-label">{{ role }}</span>
            <span class="ps-badge yes">✓</span>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div class="col-right">
        <!-- Personal info -->
        <div class="card">
          <div class="card-head">
            <div class="ct">Personal Information</div>
            <button class="edit-toggle" @click="editing = !editing">
              {{ editing ? '✕ Cancel' : '✏ Edit' }}
            </button>
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div class="field">
                <label>Full Name</label>
                <input v-model="form.name" :disabled="!editing" :class="{ disabled: !editing }" />
              </div>
              <div class="field">
                <label>Email Address</label>
                <input v-model="form.email" type="email" :disabled="!editing" :class="{ disabled: !editing }" />
              </div>
              <div class="field">
                <label>Phone Number</label>
                <input v-model="form.phone" :disabled="!editing" :class="{ disabled: !editing }" placeholder="+91 XXXXX XXXXX" />
              </div>
              <div class="field">
                <label>Role</label>
                <input :value="userRoles[0] ?? '—'" disabled class="disabled" />
              </div>
              <div class="field span2">
                <label>Bio</label>
                <textarea v-model="form.bio" rows="3" :disabled="!editing" :class="{ disabled: !editing }" placeholder="Tell your team a bit about yourself…"></textarea>
              </div>
            </div>
            <div v-if="editing" class="form-actions">
              <button class="btn-primary" @click="saveProfile">Save Changes</button>
              <button class="btn-ghost" @click="editing = false">Cancel</button>
            </div>
          </div>
        </div>

        <!-- Change password -->
        <div class="card">
          <div class="card-head"><div class="ct">Change Password</div></div>
          <div class="card-body">
            <div class="form-grid">
              <div class="field span2">
                <label>Current Password</label>
                <input v-model="pw.current" type="password" placeholder="Enter current password" />
              </div>
              <div class="field">
                <label>New Password</label>
                <input v-model="pw.newPw" type="password" placeholder="Min. 8 characters" />
              </div>
              <div class="field">
                <label>Confirm New Password</label>
                <input v-model="pw.confirm" type="password" placeholder="Re-enter new password" />
              </div>
            </div>
            <div v-if="pwError" class="err-msg">⚠️ {{ pwError }}</div>
            <div class="form-actions">
              <button class="btn-primary" @click="changePassword">Update Password</button>
            </div>
          </div>
        </div>

        <!-- Active sessions -->
        <div class="card">
          <div class="card-head"><div class="ct">Active Sessions</div></div>
          <div class="card-body" style="padding:0">
            <div v-for="s in sessions" :key="s.id" class="session-row">
              <div class="sr-icon">{{ s.icon }}</div>
              <div class="sr-info">
                <div class="sr-device">{{ s.device }}</div>
                <div class="sr-meta">{{ s.location }} · {{ s.time }}</div>
              </div>
              <span v-if="s.current" class="sr-current">Current</span>
              <button v-else class="sr-revoke" @click="revokeSession(s.id)">Revoke</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page { display: flex; flex-direction: column; gap: 20px; }
.page-head { display: flex; flex-direction: column; gap: 4px; }
.back-link { font-size: 13px; color: var(--accent); text-decoration: none; margin-bottom: 4px; }
.back-link:hover { opacity: .7; }
.ph-title { font-size: 22px; font-weight: 700; color: var(--text); }
.ph-sub { font-size: 13px; color: var(--muted); }

.profile-grid { display: grid; grid-template-columns: 260px 1fr; gap: 18px; align-items: start; }
.col-right { display: flex; flex-direction: column; gap: 16px; }

.avatar-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
  padding: 28px 22px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;
}
.av-big {
  width: 72px; height: 72px; border-radius: 50%; display: grid; place-items: center;
  font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 6px;
  background: linear-gradient(135deg,#4F7EFF,#9B6EFF);
  box-shadow: 0 0 24px rgba(79,126,255,.4);
}
.av-name { font-weight: 700; font-size: 17px; color: var(--text); }
.av-role { font-size: 12px; color: var(--accent); background: var(--accent-glow); padding: 3px 10px; border-radius: 20px; font-weight: 500; }
.av-email { font-size: 12px; color: var(--muted); }
.av-divider { width: 100%; height: 1px; background: var(--border); margin: 8px 0; }

.perm-summary { width: 100%; }
.ps-title { font-size: 10px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; text-align: left; }
.ps-row { display: flex; align-items: center; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid var(--border); }
.ps-row:last-child { border-bottom: none; }
.ps-label { font-size: 11px; color: var(--dim); text-align: left; }
.ps-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; }
.ps-badge.yes { background: rgba(54,211,153,.12); color: #36D399; }
.ps-badge.no  { background: rgba(255,107,107,.1);  color: #FF6B6B; }

.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
.card-head { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
.ct { font-weight: 600; font-size: 15px; color: var(--text); }
.card-body { padding: 20px; }

.edit-toggle {
  background: var(--surface2); border: 1px solid var(--border); border-radius: var(--rs);
  padding: 6px 14px; font-size: 12px; font-weight: 500; cursor: pointer; color: var(--dim);
  font-family: inherit; transition: all .14s;
}
.edit-toggle:hover { border-color: var(--accent); color: var(--accent); }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field.span2 { grid-column: span 2; }
.field label { font-size: 12px; color: var(--dim); font-weight: 500; }
.field input, .field textarea {
  background: var(--surface2); border: 1px solid var(--border); border-radius: var(--rs);
  padding: 10px 13px; color: var(--text); font-size: 13px; font-family: inherit;
  outline: none; transition: border-color .15s; resize: vertical;
}
.field input:focus:not(.disabled), .field textarea:focus:not(.disabled) { border-color: var(--accent); }
.field input.disabled, .field textarea.disabled { opacity: .6; cursor: default; }
.field input::placeholder, .field textarea::placeholder { color: var(--muted); }

.form-actions { display: flex; gap: 10px; }
.btn-primary { background: var(--accent); color: #fff; border: none; border-radius: var(--rs); padding: 9px 20px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .15s; }
.btn-primary:hover { background: #3d6ee8; transform: translateY(-1px); }
.btn-ghost { background: var(--surface2); color: var(--dim); border: 1px solid var(--border); border-radius: var(--rs); padding: 9px 18px; font-size: 13px; cursor: pointer; font-family: inherit; }
.btn-ghost:hover { border-color: var(--border-hi); color: var(--text); }
.err-msg { font-size: 12px; color: var(--red); background: rgba(255,107,107,.08); padding: 8px 12px; border-radius: var(--rs); margin-bottom: 14px; }

.session-row {
  display: flex; align-items: center; gap: 12px; padding: 12px 20px;
  border-bottom: 1px solid var(--border); transition: background .1s;
}
.session-row:last-child { border-bottom: none; }
.session-row:hover { background: rgba(255,255,255,.02); }
.sr-icon { font-size: 20px; flex-shrink: 0; }
.sr-info { flex: 1; }
.sr-device { font-size: 13px; font-weight: 500; color: var(--text); }
.sr-meta   { font-size: 11px; color: var(--muted); margin-top: 2px; }
.sr-current { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 10px; background: rgba(54,211,153,.12); color: #36D399; }
.sr-revoke {
  font-size: 11px; color: var(--red); background: rgba(255,107,107,.1);
  border: 1px solid rgba(255,107,107,.2); border-radius: 5px; padding: 4px 10px;
  cursor: pointer; font-family: inherit; transition: all .1s;
}
.sr-revoke:hover { background: rgba(255,107,107,.2); }

@media (max-width: 900px) { .profile-grid { grid-template-columns: 1fr; } }
</style>
