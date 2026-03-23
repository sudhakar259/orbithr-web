<script setup lang="ts">
defineOptions({ name: 'KnowledgeBase' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'

interface Article {
  id: number
  title: string
  category: string
  content: string
  views?: number
  is_published?: boolean
  published_at?: string
  created_at?: string
}

const { hasRole } = useAuth()
const toast = useToast()
const loading = ref(true)
const articles = ref<Article[]>([])
const selectedId = ref<number | null>(null)
const activeCategory = ref('')
const search = ref('')
const showForm = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)

const form = ref({ title: '', category: '', content: '', is_published: true })

const isAdmin = computed(() => hasRole('admin') || hasRole('hr_manager'))

const categories = computed(() => {
  const cats: Record<string, number> = {}
  articles.value.forEach(a => {
    cats[a.category] = (cats[a.category] || 0) + 1
  })
  return Object.entries(cats).map(([name, count]) => ({ name, count }))
})

const filteredArticles = computed(() => {
  let list = [...articles.value]
  if (activeCategory.value) list = list.filter(a => a.category === activeCategory.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(a => a.title.toLowerCase().includes(q))
  }
  return list
})

const selectedArticle = computed(() =>
  articles.value.find(a => a.id === selectedId.value) ?? null
)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/knowledge-base')
    articles.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch {
    articles.value = []
  } finally {
    loading.value = false
  }
}

async function saveArticle() {
  if (!form.value.title || !form.value.content) return
  saving.value = true
  try {
    if (editingId.value) {
      await api.put(`/knowledge-base/${editingId.value}`, form.value)
      toast.success('Article updated')
    } else {
      await api.post('/knowledge-base', form.value)
      toast.success('Article created')
    }
    showForm.value = false
    editingId.value = null
    form.value = { title: '', category: '', content: '', is_published: true }
    await load()
  } catch {
    toast.error('Failed to save article')
  } finally {
    saving.value = false
  }
}

function editArticle(a: Article) {
  editingId.value = a.id
  form.value = { title: a.title, category: a.category, content: a.content, is_published: a.is_published ?? true }
  showForm.value = true
}

function newArticle() {
  editingId.value = null
  form.value = { title: '', category: '', content: '', is_published: true }
  showForm.value = true
}

async function togglePublish(a: Article) {
  try {
    await api.patch(`/knowledge-base/${a.id}`, { is_published: !a.is_published })
    a.is_published = !a.is_published
    toast.success(a.is_published ? 'Article published' : 'Article unpublished')
  } catch {
    toast.error('Failed to update article')
  }
}

function formatDate(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Knowledge Base</h1>
        <p class="page-sub">HR policies, FAQs and company guides</p>
      </div>
      <button v-if="isAdmin" class="btn-primary" @click="newArticle">+ New Article</button>
    </div>

    <!-- Admin form -->
    <div v-if="showForm && isAdmin" class="form-card">
      <h3 class="form-heading">{{ editingId ? 'Edit Article' : 'New Article' }}</h3>
      <div class="form-stack">
        <div class="field">
          <label>Title *</label>
          <input v-model="form.title" placeholder="Article title" />
        </div>
        <div class="field">
          <label>Category *</label>
          <input v-model="form.category" placeholder="e.g. Leave Policy, IT, Onboarding" />
        </div>
        <div class="field">
          <label>Content *</label>
          <textarea v-model="form.content" rows="8" placeholder="Write your article content (supports HTML)..."></textarea>
        </div>
        <label class="check-label">
          <input type="checkbox" v-model="form.is_published" />
          <span>Published</span>
        </label>
      </div>
      <div class="form-actions">
        <button class="btn-primary" :disabled="saving" @click="saveArticle">{{ saving ? 'Saving...' : 'Save' }}</button>
        <button class="btn-ghost" @click="showForm = false">Cancel</button>
      </div>
    </div>

    <div v-if="loading" class="loading-row">Loading articles...</div>

    <div v-else class="kb-layout">
      <!-- Left pane -->
      <div class="left-pane">
        <input v-model="search" class="search-input" placeholder="Search articles..." />
        <div class="cat-list">
          <button
            class="cat-item"
            :class="{ active: !activeCategory }"
            @click="activeCategory = ''"
          >All <span class="cat-count">{{ articles.length }}</span></button>
          <button
            v-for="c in categories"
            :key="c.name"
            class="cat-item"
            :class="{ active: activeCategory === c.name }"
            @click="activeCategory = c.name"
          >{{ c.name }} <span class="cat-count">{{ c.count }}</span></button>
        </div>
        <div class="article-list">
          <div
            v-for="a in filteredArticles"
            :key="a.id"
            class="article-item"
            :class="{ active: selectedId === a.id }"
            @click="selectedId = a.id"
          >
            <div class="ai-title">{{ a.title }}</div>
            <div class="ai-meta">
              <span class="ai-cat">{{ a.category }}</span>
              <span v-if="a.views !== undefined" class="ai-views">{{ a.views }} views</span>
            </div>
            <div v-if="isAdmin" class="ai-admin">
              <button class="mini-btn" @click.stop="editArticle(a)">Edit</button>
              <button class="mini-btn" @click.stop="togglePublish(a)">{{ a.is_published ? 'Unpublish' : 'Publish' }}</button>
            </div>
          </div>
          <div v-if="!filteredArticles.length" class="no-articles">No articles found</div>
        </div>
      </div>

      <!-- Right pane -->
      <div class="right-pane">
        <div v-if="!selectedArticle" class="welcome-card">
          <div class="welcome-icon">
            <svg width="32" height="32" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>
          </div>
          <h3 class="welcome-title">Browse HR policies, FAQs and guides</h3>
          <p class="welcome-sub">Select an article from the left to read its content.</p>
        </div>
        <div v-else class="article-view">
          <button class="back-btn" @click="selectedId = null">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
            Back
          </button>
          <div class="av-header">
            <h2 class="av-title">{{ selectedArticle.title }}</h2>
            <div class="av-meta">
              <span class="av-cat-badge">{{ selectedArticle.category }}</span>
              <span v-if="selectedArticle.views !== undefined" class="av-views">{{ selectedArticle.views }} views</span>
              <span class="av-date">{{ formatDate(selectedArticle.published_at || selectedArticle.created_at) }}</span>
            </div>
          </div>
          <div class="av-content" v-html="selectedArticle.content"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); margin: 0; }
.page-sub { font-size: 13px; color: var(--muted); margin-top: 4px; }

.btn-primary { background: var(--accent); color: #fff; border: none; border-radius: var(--rs); padding: 9px 18px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all .15s; }
.btn-primary:hover { background: #3d6ee8; transform: translateY(-1px); }
.btn-primary:disabled { opacity: .5; cursor: default; transform: none; }
.btn-ghost { background: var(--surface2); color: var(--muted); border: 1px solid var(--border); border-radius: var(--rs); padding: 9px 16px; font-size: 13px; cursor: pointer; font-family: inherit; }
.btn-ghost:hover { border-color: var(--border-hi); color: var(--text); }

.form-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 20px; }
.form-heading { font-size: 14px; font-weight: 600; color: var(--text); margin: 0 0 14px; }
.form-stack { display: flex; flex-direction: column; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 11px; color: var(--muted); font-weight: 500; }
.field input, .field textarea {
  background: var(--surface2); border: 1px solid var(--border); border-radius: var(--rs);
  padding: 9px 12px; color: var(--text); font-size: 13px; font-family: inherit;
  outline: none; transition: border-color .15s; resize: vertical;
}
.field input:focus, .field textarea:focus { border-color: var(--accent); }
.check-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: var(--muted); }
.check-label input { accent-color: var(--accent); width: 14px; height: 14px; }
.form-actions { display: flex; gap: 10px; margin-top: 14px; }

.loading-row { padding: 40px; text-align: center; color: var(--muted); font-size: 13px; }

.kb-layout { display: grid; grid-template-columns: 300px 1fr; gap: 16px; min-height: 500px; }
@media (max-width: 768px) {
  .kb-layout { grid-template-columns: 1fr; }
  .back-btn { display: inline-flex; }
}

.left-pane { display: flex; flex-direction: column; gap: 10px; }
.search-input {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs);
  padding: 9px 12px; color: var(--text); font-size: 13px; font-family: inherit;
  outline: none; width: 100%; box-sizing: border-box;
}
.search-input:focus { border-color: var(--accent); }
.search-input::placeholder { color: var(--muted); }

.cat-list { display: flex; flex-direction: column; gap: 2px; }
.cat-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: var(--rs); background: transparent; border: none; color: var(--muted); font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; text-align: left; transition: all .12s; text-transform: capitalize; }
.cat-item:hover { background: var(--surface); color: var(--text); }
.cat-item.active { background: rgba(79,126,255,.1); color: var(--accent); }
.cat-count { background: var(--surface2); border-radius: 10px; padding: 1px 7px; font-size: 10px; font-weight: 700; }
.cat-item.active .cat-count { background: rgba(79,126,255,.2); }

.article-list { display: flex; flex-direction: column; gap: 4px; overflow-y: auto; max-height: 500px; }
.article-item { padding: 10px 12px; border-radius: var(--rs); background: var(--surface); border: 1px solid var(--border); cursor: pointer; transition: all .12s; }
.article-item:hover { border-color: var(--border-hi); }
.article-item.active { border-color: var(--accent); background: rgba(79,126,255,.04); }
.ai-title { font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 4px; }
.ai-meta { display: flex; gap: 8px; font-size: 10px; color: var(--muted); }
.ai-cat { text-transform: capitalize; background: var(--surface2); padding: 1px 6px; border-radius: 8px; }
.ai-admin { display: flex; gap: 6px; margin-top: 6px; }
.mini-btn { background: var(--surface2); border: 1px solid var(--border); border-radius: 5px; padding: 3px 8px; font-size: 10px; color: var(--muted); cursor: pointer; font-family: inherit; transition: all .1s; }
.mini-btn:hover { border-color: var(--accent); color: var(--accent); }
.no-articles { padding: 20px; text-align: center; color: var(--muted); font-size: 12px; }

.right-pane { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 24px; min-height: 400px; }

.welcome-card { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 40px; }
.welcome-icon { color: var(--accent); margin-bottom: 16px; opacity: .6; }
.welcome-title { font-size: 16px; font-weight: 600; color: var(--text); margin: 0 0 8px; }
.welcome-sub { font-size: 13px; color: var(--muted); margin: 0; }

.back-btn { display: none; align-items: center; gap: 6px; background: none; border: none; color: var(--accent); font-size: 12px; cursor: pointer; font-family: inherit; padding: 0; margin-bottom: 12px; }
.av-header { margin-bottom: 20px; }
.av-title { font-size: 22px; font-weight: 700; color: var(--text); margin: 0 0 10px; line-height: 1.3; }
.av-meta { display: flex; gap: 12px; align-items: center; }
.av-cat-badge { background: rgba(79,126,255,.1); color: var(--accent); padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
.av-views { font-size: 11px; color: var(--muted); }
.av-date { font-size: 11px; color: var(--muted); }

.av-content { font-size: 14px; color: var(--text); line-height: 1.8; }
.av-content :deep(h1),
.av-content :deep(h2),
.av-content :deep(h3) { color: var(--text); margin-top: 20px; margin-bottom: 8px; }
.av-content :deep(p) { margin-bottom: 12px; }
.av-content :deep(ul),
.av-content :deep(ol) { padding-left: 20px; margin-bottom: 12px; }
.av-content :deep(a) { color: var(--accent); text-decoration: underline; }
.av-content :deep(code) { background: var(--surface2); padding: 2px 6px; border-radius: 4px; font-size: 12px; }
</style>
