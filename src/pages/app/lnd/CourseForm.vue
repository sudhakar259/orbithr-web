<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import lndService from '@/services/lndService'
import type { CourseCategory } from '@/services/lndService'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => route.name === 'lnd.courses.edit')
const courseId = computed(() => (isEdit.value ? Number(route.params.id) : null))

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const categories = ref<CourseCategory[]>([])

const form = ref({
  title: '',
  description: '',
  short_description: '',
  category_id: '' as string | number,
  difficulty_level: 'beginner',
  duration_minutes: 0,
  content_type: 'mixed',
  course_type: 'internal',
  is_mandatory: false,
  passing_score: 70,
  external_url: '',
  tags: [] as string[],
})

const tagInput = ref('')

function addTag() {
  const tag = tagInput.value.trim()
  if (tag && !form.value.tags.includes(tag)) {
    form.value.tags.push(tag)
  }
  tagInput.value = ''
}

function removeTag(idx: number) {
  form.value.tags.splice(idx, 1)
}

async function loadCourse() {
  if (!courseId.value) return
  loading.value = true
  try {
    const res = await lndService.getCourse(courseId.value)
    const c = res.data.data
    form.value = {
      title: c.title,
      description: c.description || '',
      short_description: c.short_description || '',
      category_id: c.category_id || '',
      difficulty_level: c.difficulty_level,
      duration_minutes: c.duration_minutes,
      content_type: c.content_type,
      course_type: c.course_type,
      is_mandatory: c.is_mandatory,
      passing_score: c.passing_score,
      external_url: c.external_url || '',
      tags: c.tags || [],
    }
  } catch {
    error.value = 'Failed to load course.'
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const res = await lndService.getCategories()
    categories.value = res.data.data
  } catch {
    // silent
  }
}

async function handleSubmit() {
  saving.value = true
  error.value = ''
  try {
    const payload = {
      ...form.value,
      category_id: form.value.category_id || null,
    }
    if (isEdit.value && courseId.value) {
      await lndService.updateCourse(courseId.value, payload)
      router.push({ name: 'lnd.courses.show', params: { id: courseId.value } })
    } else {
      const res = await lndService.createCourse(payload)
      router.push({ name: 'lnd.courses.show', params: { id: res.data.data.id } })
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'Failed to save course.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadCategories()
  if (isEdit.value) loadCourse()
})
</script>

<template>
  <div class="cf-page">
    <RouterLink :to="{ name: 'lnd.courses' }" class="cf-back-link">&larr; Back to Courses</RouterLink>

    <div class="cf-form-card">
      <h2 class="cf-form-title">{{ isEdit ? 'Edit Course' : 'New Course' }}</h2>

      <div v-if="error" class="cf-error">{{ error }}</div>

      <div v-if="loading" class="cf-loading">
        <div v-for="i in 4" :key="i" class="cf-skeleton"></div>
      </div>

      <form v-else class="cf-form" @submit.prevent="handleSubmit">
        <div class="cf-field">
          <label class="cf-label">Title *</label>
          <input v-model="form.title" type="text" required class="cf-input" />
        </div>

        <div class="cf-field">
          <label class="cf-label">Short Description</label>
          <input v-model="form.short_description" type="text" class="cf-input" />
        </div>

        <div class="cf-field">
          <label class="cf-label">Description</label>
          <textarea v-model="form.description" rows="4" class="cf-input cf-textarea" />
        </div>

        <div class="cf-grid-2">
          <div class="cf-field">
            <label class="cf-label">Category</label>
            <select v-model="form.category_id" class="cf-input">
              <option value="">None</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <div class="cf-field">
            <label class="cf-label">Difficulty</label>
            <select v-model="form.difficulty_level" class="cf-input">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div class="cf-grid-3">
          <div class="cf-field">
            <label class="cf-label">Duration (min)</label>
            <input v-model.number="form.duration_minutes" type="number" min="0" class="cf-input" />
          </div>
          <div class="cf-field">
            <label class="cf-label">Content Type</label>
            <select v-model="form.content_type" class="cf-input">
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="link">Link</option>
              <option value="mixed">Mixed</option>
              <option value="scorm">SCORM</option>
            </select>
          </div>
          <div class="cf-field">
            <label class="cf-label">Passing Score</label>
            <input v-model.number="form.passing_score" type="number" min="0" max="100" class="cf-input" />
          </div>
        </div>

        <div class="cf-grid-2">
          <div class="cf-field">
            <label class="cf-label">Course Type</label>
            <select v-model="form.course_type" class="cf-input">
              <option value="internal">Internal</option>
              <option value="external">External</option>
            </select>
          </div>
          <div v-if="form.course_type === 'external'" class="cf-field">
            <label class="cf-label">External URL</label>
            <input v-model="form.external_url" type="url" class="cf-input" />
          </div>
        </div>

        <label class="cf-checkbox-row">
          <input id="mandatory" v-model="form.is_mandatory" type="checkbox" class="cf-checkbox" />
          <span>Mandatory course</span>
        </label>

        <div class="cf-field">
          <label class="cf-label">Tags</label>
          <div class="cf-tags-row">
            <span v-for="(tag, idx) in form.tags" :key="idx" class="cf-tag">
              {{ tag }}
              <button type="button" class="cf-tag-rm" @click="removeTag(idx)">&times;</button>
            </span>
          </div>
          <div class="cf-tag-input-row">
            <input v-model="tagInput" type="text" placeholder="Add tag…" class="cf-input cf-tag-input" @keydown.enter.prevent="addTag" />
            <button type="button" class="cf-btn-ghost" @click="addTag">Add</button>
          </div>
        </div>

        <div class="cf-form-footer">
          <RouterLink :to="{ name: 'lnd.courses' }" class="cf-btn-ghost">Cancel</RouterLink>
          <button type="submit" :disabled="saving" class="cf-btn-primary">{{ saving ? 'Saving…' : isEdit ? 'Update' : 'Create' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.cf-page { display: flex; flex-direction: column; gap: 16px; }
.cf-back-link { font-size: 13px; color: #7A8299; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
.cf-back-link:hover { color: #EEF0F4; }
.cf-form-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 24px; max-width: 760px; display: flex; flex-direction: column; gap: 0; }
.cf-form-title { font-size: 16px; font-weight: 700; color: #EEF0F4; margin: 0 0 20px; }
.cf-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; margin-bottom: 16px; }
.cf-loading { display: flex; flex-direction: column; gap: 8px; }
.cf-skeleton { height: 36px; background: #232936; border-radius: 6px; animation: cf-pulse 1.2s ease-in-out infinite; }
@keyframes cf-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.cf-form { display: flex; flex-direction: column; gap: 16px; }
.cf-field { display: flex; flex-direction: column; gap: 5px; }
.cf-label { font-size: 12px; font-weight: 500; color: #B6BED0; }
.cf-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 8px 11px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.cf-input:focus { border-color: #6B5BFF; }
.cf-textarea { resize: vertical; min-height: 90px; }
.cf-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.cf-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.cf-checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #B6BED0; cursor: pointer; }
.cf-checkbox { accent-color: #6B5BFF; }
.cf-tags-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.cf-tag { background: #232936; color: #B6BED0; border-radius: 4px; padding: 3px 8px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; }
.cf-tag-rm { background: none; border: none; color: #7A8299; cursor: pointer; font-size: 14px; line-height: 1; padding: 0; }
.cf-tag-rm:hover { color: #F38288; }
.cf-tag-input-row { display: flex; gap: 8px; }
.cf-tag-input { flex: 1; }
.cf-form-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 14px; border-top: 1px solid #232936; margin-top: 4px; }
.cf-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 20px; font-size: 13px; font-weight: 500; cursor: pointer; }
.cf-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.cf-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.cf-btn-ghost { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 7px; padding: 8px 16px; font-size: 13px; text-decoration: none; cursor: pointer; }
.cf-btn-ghost:hover { color: #EEF0F4; }
</style>
