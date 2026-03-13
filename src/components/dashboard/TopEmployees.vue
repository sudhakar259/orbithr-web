<template>
  <ExpandableCard title="Top Attendance" description="Employees with best attendance">
    <template #default>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left text-slate-500">
              <th class="py-2 pr-4">Employee</th>
              <th class="py-2 pr-4">Dept</th>
              <th class="py-2 pr-4 text-right">Attendance</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in rows" :key="e.id" class="border-t border-gray-100">
              <td class="py-2 pr-4">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs" :class="avatarColor(e.name)">{{ initials(e.name) }}</div>
                  <div class="text-slate-800">{{ e.name }}</div>
                </div>
              </td>
              <td class="py-2 pr-4 text-slate-600">{{ e.dept }}</td>
              <td class="py-2 pr-0 text-right font-semibold">{{ e.att }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </ExpandableCard>
</template>

<script setup lang="ts">
import ExpandableCard from './ExpandableCard.vue'

interface Row { id: number; name: string; dept: string; att: number }
const rows: Row[] = [
  { id: 1, name: 'Aditi Sharma', dept: 'Engineering', att: 99 },
  { id: 2, name: 'Rahul Verma', dept: 'Finance', att: 98 },
  { id: 3, name: 'Neha Gupta', dept: 'Support', att: 97 },
  { id: 4, name: 'Vikram Mehta', dept: 'Design', att: 96 },
]
const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase()
const avatarColors = ['bg-rose-500','bg-emerald-500','bg-indigo-500','bg-amber-500','bg-sky-500']
const avatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length]
</script>
