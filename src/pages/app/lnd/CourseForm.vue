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
  <div>
    <RouterLink
      :to="{ name: 'lnd.courses' }"
      class="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1"
    >
      &larr; Back to Courses
    </RouterLink>

    <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-3xl">
      <h2 class="text-lg font-bold text-white mb-6">
        {{ isEdit ? 'Edit Course' : 'New Course' }}
      </h2>

      <div
        v-if="error"
        class="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4"
      >
        {{ error }}
      </div>

      <form class="space-y-5" @submit.prevent="handleSubmit">
        <div>
          <label class="block text-gray-300 text-sm mb-1">Title *</label>
          <input
            v-model="form.title"
            type="text"
            required
            class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label class="block text-gray-300 text-sm mb-1">Short Description</label>
          <input
            v-model="form.short_description"
            type="text"
            class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label class="block text-gray-300 text-sm mb-1">Description</label>
          <textarea
            v-model="form.description"
            rows="4"
            class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-300 text-sm mb-1">Category</label>
            <select
              v-model="form.category_id"
              class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="">None</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-gray-300 text-sm mb-1">Difficulty</label>
            <select
              v-model="form.difficulty_level"
              class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-gray-300 text-sm mb-1">Duration (min)</label>
            <input
              v-model.number="form.duration_minutes"
              type="number"
              min="0"
              class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-gray-300 text-sm mb-1">Content Type</label>
            <select
              v-model="form.content_type"
              class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="link">Link</option>
              <option value="mixed">Mixed</option>
              <option value="scorm">SCORM</option>
            </select>
          </div>
          <div>
            <label class="block text-gray-300 text-sm mb-1">Passing Score</label>
            <input
              v-model.number="form.passing_score"
              type="number"
              min="0"
              max="100"
              class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-300 text-sm mb-1">Course Type</label>
            <select
              v-model="form.course_type"
              class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="internal">Internal</option>
              <option value="external">External</option>
            </select>
          </div>
          <div v-if="form.course_type === 'external'">
            <label class="block text-gray-300 text-sm mb-1">External URL</label>
            <input
              v-model="form.external_url"
              type="url"
              class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input
            id="mandatory"
            v-model="form.is_mandatory"
            type="checkbox"
            class="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <label for="mandatory" class="text-gray-300 text-sm">Mandatory course</label>
        </div>

        <div>
          <label class="block text-gray-300 text-sm mb-1">Tags</label>
          <div class="flex gap-2 mb-2 flex-wrap">
            <span
              v-for="(tag, idx) in form.tags"
              :key="idx"
              class="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded flex items-center gap-1"
            >
              {{ tag }}
              <button type="button" class="text-gray-500 hover:text-white" @click="removeTag(idx)">
                &times;
              </button>
            </span>
          </div>
          <div class="flex gap-2">
            <input
              v-model="tagInput"
              type="text"
              placeholder="Add tag..."
              class="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              @keydown.enter.prevent="addTag"
            />
            <button
              type="button"
              class="bg-gray-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-gray-500"
              @click="addTag"
            >
              Add
            </button>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <RouterLink
            :to="{ name: 'lnd.courses' }"
            class="bg-gray-700 border border-gray-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Cancel
          </RouterLink>
          <button
            type="submit"
            :disabled="saving"
            class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {{ saving ? 'Saving...' : isEdit ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
