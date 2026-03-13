<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="$emit('close')"></div>

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
        <form @submit.prevent="handleSubmit">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Set Work Status & Punch In
                </h3>
                <p class="text-sm text-gray-500 mt-1">
                  Select your current work status and location before punching in
                </p>

                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Work Status Selection -->
                  <div class="space-y-4">
                    <h4 class="text-md font-medium text-gray-900">Work Status</h4>
                    <div class="grid grid-cols-2 gap-3">
                      <button
                        v-for="status in workStatuses"
                        :key="status.id"
                        type="button"
                        @click="selectedStatus = status"
                        :class="[
                          'p-4 border rounded-lg text-left transition-all',
                          selectedStatus?.id === status.id
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300'
                        ]"
                      >
                        <div class="flex items-center space-x-3">
                          <div :class="['w-3 h-3 rounded-full', status.color]"></div>
                          <div>
                            <div class="font-medium text-sm">{{ status.name }}</div>
                            <div class="text-xs text-gray-500">{{ status.description }}</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <!-- Location & Details -->
                  <div class="space-y-4">
                    <h4 class="text-md font-medium text-gray-900">Location & Details</h4>

                    <!-- Location -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700">Current Location</label>
                      <select
                        v-model="form.location"
                        required
                        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="">Select location</option>
                        <option value="office">Office</option>
                        <option value="home">Work from Home</option>
                        <option value="client_site">Client Site</option>
                        <option value="field_work">Field Work</option>
                        <option value="remote">Remote Location</option>
                      </select>
                    </div>

                    <!-- GPS Coordinates (if available) -->
                    <div v-if="currentLocation" class="bg-gray-50 p-3 rounded-md">
                      <div class="text-xs text-gray-500 mb-1">GPS Location</div>
                      <div class="text-sm font-mono">
                        {{ currentLocation.lat.toFixed(6) }}, {{ currentLocation.lng.toFixed(6) }}
                      </div>
                    </div>

                    <!-- Project/Task -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700">Current Project/Task</label>
                      <input
                        v-model="form.project"
                        type="text"
                        placeholder="What are you working on?"
                        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <!-- Notes -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                      <textarea
                        v-model="form.notes"
                        rows="3"
                        placeholder="Any additional notes..."
                        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      ></textarea>
                    </div>
                  </div>
                </div>

                <!-- Status Preview -->
                <div v-if="selectedStatus" class="mt-6 bg-gray-50 p-4 rounded-lg">
                  <h5 class="text-sm font-medium text-gray-900 mb-2">Status Preview</h5>
                  <div class="flex items-center space-x-3">
                    <div :class="['w-4 h-4 rounded-full', selectedStatus.color]"></div>
                    <div>
                      <div class="font-medium">{{ selectedStatus.name }}</div>
                      <div class="text-sm text-gray-600">{{ selectedStatus.description }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal footer -->
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              :disabled="loading || !selectedStatus"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              <span v-if="loading">Punching In...</span>
              <span v-else>Punch In & Set Status</span>
            </button>
            <button
              type="button"
              @click="$emit('close')"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

interface WorkStatus {
  id: string
  name: string
  description: string
  color: string
  icon: string
}

interface PunchData {
  punch_type: 'check_in'
  attendance_date: string
  timestamp: string
  method: string
  location: string
  work_status: string
  project?: string
  notes?: string
  gps_coordinates?: {
    lat: number
    lng: number
  }
}

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
  punch: [data: PunchData]
}>()

const loading = ref(false)
const selectedStatus = ref<WorkStatus | null>(null)
const currentLocation = ref<{lat: number, lng: number} | null>(null)

// Work status options with 100+ variations
const workStatuses = ref<WorkStatus[]>([
  // Office Work
  { id: 'office_desk', name: 'Office Desk Work', description: 'Working at assigned desk', color: 'bg-blue-500', icon: 'desk' },
  { id: 'office_meeting', name: 'In Meeting', description: 'Attending scheduled meetings', color: 'bg-purple-500', icon: 'meeting' },
  { id: 'office_training', name: 'Training Session', description: 'Participating in training', color: 'bg-indigo-500', icon: 'training' },
  { id: 'office_presentation', name: 'Presentation', description: 'Delivering presentation', color: 'bg-pink-500', icon: 'presentation' },

  // Remote Work
  { id: 'wfh_desk', name: 'Work from Home', description: 'Working from home office', color: 'bg-green-500', icon: 'home' },
  { id: 'wfh_focus', name: 'Deep Focus Work', description: 'Intensive concentration work', color: 'bg-teal-500', icon: 'focus' },
  { id: 'wfh_flexible', name: 'Flexible Hours', description: 'Flexible work schedule', color: 'bg-cyan-500', icon: 'flexible' },

  // Field Work
  { id: 'field_client_visit', name: 'Client Visit', description: 'Visiting client location', color: 'bg-orange-500', icon: 'client' },
  { id: 'field_site_inspection', name: 'Site Inspection', description: 'Inspecting work site', color: 'bg-yellow-500', icon: 'inspection' },
  { id: 'field_survey', name: 'Field Survey', description: 'Conducting field surveys', color: 'bg-amber-500', icon: 'survey' },
  { id: 'field_installation', name: 'Installation Work', description: 'Installing equipment/systems', color: 'bg-lime-500', icon: 'installation' },

  // Project Work
  { id: 'project_development', name: 'Project Development', description: 'Developing project deliverables', color: 'bg-emerald-500', icon: 'development' },
  { id: 'project_planning', name: 'Project Planning', description: 'Planning project activities', color: 'bg-sky-500', icon: 'planning' },
  { id: 'project_research', name: 'Research Work', description: 'Conducting research', color: 'bg-violet-500', icon: 'research' },
  { id: 'project_testing', name: 'Testing & QA', description: 'Testing and quality assurance', color: 'bg-rose-500', icon: 'testing' },

  // Support & Admin
  { id: 'support_helpdesk', name: 'Help Desk Support', description: 'Providing technical support', color: 'bg-red-500', icon: 'support' },
  { id: 'admin_documentation', name: 'Documentation', description: 'Creating documentation', color: 'bg-stone-500', icon: 'documentation' },
  { id: 'admin_reporting', name: 'Report Preparation', description: 'Preparing reports', color: 'bg-neutral-500', icon: 'reporting' },
  { id: 'admin_coordination', name: 'Coordination Work', description: 'Coordinating activities', color: 'bg-gray-500', icon: 'coordination' },

  // Specialized Work
  { id: 'special_design', name: 'Design Work', description: 'Graphic/UI/UX design', color: 'bg-fuchsia-500', icon: 'design' },
  { id: 'special_analysis', name: 'Data Analysis', description: 'Analyzing data and metrics', color: 'bg-slate-500', icon: 'analysis' },
  { id: 'special_training', name: 'Training Others', description: 'Training team members', color: 'bg-zinc-500', icon: 'training' },
  { id: 'special_maintenance', name: 'System Maintenance', description: 'Maintaining systems', color: 'bg-gray-600', icon: 'maintenance' },

  // Travel & Business
  { id: 'travel_business', name: 'Business Travel', description: 'Traveling for business', color: 'bg-blue-600', icon: 'travel' },
  { id: 'travel_commute', name: 'Commuting', description: 'Traveling to/from work', color: 'bg-indigo-600', icon: 'commute' },
  { id: 'travel_conference', name: 'Conference', description: 'Attending conference', color: 'bg-purple-600', icon: 'conference' },

  // Health & Wellness
  { id: 'health_break', name: 'Break Time', description: 'Taking a scheduled break', color: 'bg-green-600', icon: 'break' },
  { id: 'health_medical', name: 'Medical Leave', description: 'Medical appointment/leave', color: 'bg-red-600', icon: 'medical' },
  { id: 'health_wellness', name: 'Wellness Activity', description: 'Health and wellness activities', color: 'bg-pink-600', icon: 'wellness' },

  // Additional statuses to reach 100+
  { id: 'creative_brainstorming', name: 'Brainstorming', description: 'Creative brainstorming session', color: 'bg-yellow-400', icon: 'brainstorm' },
  { id: 'creative_innovation', name: 'Innovation Work', description: 'Working on innovative solutions', color: 'bg-orange-400', icon: 'innovation' },
  { id: 'leadership_team_lead', name: 'Team Leadership', description: 'Leading team activities', color: 'bg-red-400', icon: 'leadership' },
  { id: 'leadership_coaching', name: 'Coaching', description: 'Coaching team members', color: 'bg-pink-400', icon: 'coaching' },
  { id: 'leadership_strategy', name: 'Strategic Planning', description: 'Strategic planning work', color: 'bg-purple-400', icon: 'strategy' },

  // Continue adding more statuses...
  { id: 'communication_client_calls', name: 'Client Communication', description: 'Communicating with clients', color: 'bg-blue-400', icon: 'communication' },
  { id: 'communication_internal', name: 'Internal Communication', description: 'Internal team communication', color: 'bg-indigo-400', icon: 'internal' },
  { id: 'communication_stakeholder', name: 'Stakeholder Management', description: 'Managing stakeholders', color: 'bg-violet-400', icon: 'stakeholder' },

  { id: 'technical_coding', name: 'Software Development', description: 'Writing code', color: 'bg-green-400', icon: 'coding' },
  { id: 'technical_debugging', name: 'Debugging', description: 'Fixing bugs and issues', color: 'bg-teal-400', icon: 'debugging' },
  { id: 'technical_deployment', name: 'Deployment', description: 'Deploying applications', color: 'bg-cyan-400', icon: 'deployment' },
  { id: 'technical_monitoring', name: 'System Monitoring', description: 'Monitoring system performance', color: 'bg-sky-400', icon: 'monitoring' },

  { id: 'sales_prospecting', name: 'Lead Generation', description: 'Generating sales leads', color: 'bg-emerald-400', icon: 'sales' },
  { id: 'sales_negotiation', name: 'Sales Negotiation', description: 'Negotiating deals', color: 'bg-lime-400', icon: 'negotiation' },
  { id: 'sales_closing', name: 'Deal Closing', description: 'Closing sales deals', color: 'bg-yellow-300', icon: 'closing' },
  { id: 'sales_followup', name: 'Sales Follow-up', description: 'Following up on leads', color: 'bg-amber-400', icon: 'followup' },

  { id: 'marketing_content', name: 'Content Creation', description: 'Creating marketing content', color: 'bg-orange-300', icon: 'content' },
  { id: 'marketing_campaign', name: 'Campaign Management', description: 'Managing marketing campaigns', color: 'bg-red-300', icon: 'campaign' },
  { id: 'marketing_analytics', name: 'Marketing Analytics', description: 'Analyzing marketing data', color: 'bg-pink-300', icon: 'analytics' },
  { id: 'marketing_social', name: 'Social Media', description: 'Managing social media', color: 'bg-purple-300', icon: 'social' },

  { id: 'finance_budgeting', name: 'Budget Planning', description: 'Planning budgets', color: 'bg-indigo-300', icon: 'budget' },
  { id: 'finance_reporting', name: 'Financial Reporting', description: 'Creating financial reports', color: 'bg-blue-300', icon: 'reporting' },
  { id: 'finance_audit', name: 'Financial Audit', description: 'Conducting financial audits', color: 'bg-violet-300', icon: 'audit' },
  { id: 'finance_investment', name: 'Investment Analysis', description: 'Analyzing investments', color: 'bg-purple-200', icon: 'investment' },

  { id: 'hr_recruitment', name: 'Recruitment', description: 'Recruiting new employees', color: 'bg-pink-200', icon: 'recruitment' },
  { id: 'hr_onboarding', name: 'Employee Onboarding', description: 'Onboarding new employees', color: 'bg-rose-200', icon: 'onboarding' },
  { id: 'hr_performance', name: 'Performance Review', description: 'Conducting performance reviews', color: 'bg-red-200', icon: 'performance' },
  { id: 'hr_policy', name: 'Policy Development', description: 'Developing HR policies', color: 'bg-orange-200', icon: 'policy' },

  // Add more to reach 100+ statuses
  { id: 'quality_assurance', name: 'Quality Assurance', description: 'Ensuring quality standards', color: 'bg-yellow-200', icon: 'qa' },
  { id: 'quality_control', name: 'Quality Control', description: 'Controlling product quality', color: 'bg-amber-200', icon: 'qc' },
  { id: 'quality_improvement', name: 'Quality Improvement', description: 'Improving quality processes', color: 'bg-lime-200', icon: 'improvement' },

  { id: 'logistics_planning', name: 'Logistics Planning', description: 'Planning logistics operations', color: 'bg-emerald-200', icon: 'logistics' },
  { id: 'logistics_shipping', name: 'Shipping Coordination', description: 'Coordinating shipments', color: 'bg-teal-200', icon: 'shipping' },
  { id: 'logistics_inventory', name: 'Inventory Management', description: 'Managing inventory', color: 'bg-cyan-200', icon: 'inventory' },

  { id: 'legal_research', name: 'Legal Research', description: 'Conducting legal research', color: 'bg-sky-200', icon: 'legal' },
  { id: 'legal_compliance', name: 'Compliance Review', description: 'Reviewing compliance', color: 'bg-blue-200', icon: 'compliance' },
  { id: 'legal_contracts', name: 'Contract Management', description: 'Managing contracts', color: 'bg-indigo-200', icon: 'contracts' },

  { id: 'procurement_sourcing', name: 'Vendor Sourcing', description: 'Sourcing vendors/suppliers', color: 'bg-violet-200', icon: 'sourcing' },
  { id: 'procurement_negotiation', name: 'Procurement Negotiation', description: 'Negotiating procurement', color: 'bg-purple-100', icon: 'procurement' },
  { id: 'procurement_orders', name: 'Purchase Orders', description: 'Processing purchase orders', color: 'bg-pink-100', icon: 'orders' },

  { id: 'facilities_maintenance', name: 'Facilities Maintenance', description: 'Maintaining facilities', color: 'bg-rose-100', icon: 'facilities' },
  { id: 'facilities_security', name: 'Security Management', description: 'Managing security', color: 'bg-red-100', icon: 'security' },
  { id: 'facilities_safety', name: 'Safety Compliance', description: 'Ensuring safety compliance', color: 'bg-orange-100', icon: 'safety' },

  { id: 'it_infrastructure', name: 'IT Infrastructure', description: 'Managing IT infrastructure', color: 'bg-yellow-100', icon: 'infrastructure' },
  { id: 'it_networking', name: 'Network Administration', description: 'Administering networks', color: 'bg-amber-100', icon: 'networking' },
  { id: 'it_databases', name: 'Database Management', description: 'Managing databases', color: 'bg-lime-100', icon: 'databases' },

  { id: 'customer_service', name: 'Customer Service', description: 'Providing customer service', color: 'bg-emerald-100', icon: 'customer' },
  { id: 'customer_support', name: 'Technical Support', description: 'Providing technical support', color: 'bg-teal-100', icon: 'support' },
  { id: 'customer_feedback', name: 'Feedback Analysis', description: 'Analyzing customer feedback', color: 'bg-cyan-100', icon: 'feedback' },

  { id: 'product_design', name: 'Product Design', description: 'Designing products', color: 'bg-sky-100', icon: 'design' },
  { id: 'product_development', name: 'Product Development', description: 'Developing products', color: 'bg-blue-100', icon: 'development' },
  { id: 'product_testing', name: 'Product Testing', description: 'Testing products', color: 'bg-indigo-100', icon: 'testing' },

  { id: 'research_development', name: 'R&D Work', description: 'Research and development', color: 'bg-violet-100', icon: 'research' },
  { id: 'research_analysis', name: 'Research Analysis', description: 'Analyzing research data', color: 'bg-purple-50', icon: 'analysis' },
  { id: 'research_publication', name: 'Research Publication', description: 'Publishing research', color: 'bg-pink-50', icon: 'publication' },

  { id: 'consulting_advisory', name: 'Consulting Work', description: 'Providing consulting services', color: 'bg-rose-50', icon: 'consulting' },
  { id: 'consulting_strategy', name: 'Strategic Consulting', description: 'Strategic consulting', color: 'bg-red-50', icon: 'strategy' },
  { id: 'consulting_implementation', name: 'Implementation Consulting', description: 'Implementation consulting', color: 'bg-orange-50', icon: 'implementation' },

  { id: 'education_teaching', name: 'Teaching', description: 'Teaching/training others', color: 'bg-yellow-50', icon: 'teaching' },
  { id: 'education_curriculum', name: 'Curriculum Development', description: 'Developing curriculum', color: 'bg-amber-50', icon: 'curriculum' },
  { id: 'education_assessment', name: 'Assessment', description: 'Conducting assessments', color: 'bg-lime-50', icon: 'assessment' },

  { id: 'healthcare_patient_care', name: 'Patient Care', description: 'Providing patient care', color: 'bg-emerald-50', icon: 'care' },
  { id: 'healthcare_administration', name: 'Healthcare Administration', description: 'Healthcare administration', color: 'bg-teal-50', icon: 'administration' },
  { id: 'healthcare_research', name: 'Medical Research', description: 'Conducting medical research', color: 'bg-cyan-50', icon: 'medical' },

  { id: 'construction_planning', name: 'Construction Planning', description: 'Planning construction projects', color: 'bg-sky-50', icon: 'construction' },
  { id: 'construction_supervision', name: 'Site Supervision', description: 'Supervising construction sites', color: 'bg-blue-50', icon: 'supervision' },
  { id: 'construction_safety', name: 'Construction Safety', description: 'Ensuring construction safety', color: 'bg-indigo-50', icon: 'safety' },

  { id: 'manufacturing_production', name: 'Production Work', description: 'Manufacturing/production work', color: 'bg-violet-50', icon: 'production' },
  { id: 'manufacturing_quality', name: 'Manufacturing Quality', description: 'Quality control in manufacturing', color: 'bg-purple-25', icon: 'quality' },
  { id: 'manufacturing_maintenance', name: 'Equipment Maintenance', description: 'Maintaining manufacturing equipment', color: 'bg-pink-25', icon: 'maintenance' },

  { id: 'retail_customer_service', name: 'Retail Service', description: 'Providing retail customer service', color: 'bg-rose-25', icon: 'retail' },
  { id: 'retail_inventory', name: 'Retail Inventory', description: 'Managing retail inventory', color: 'bg-red-25', icon: 'inventory' },
  { id: 'retail_sales', name: 'Retail Sales', description: 'Making retail sales', color: 'bg-orange-25', icon: 'sales' },

  { id: 'hospitality_service', name: 'Hospitality Service', description: 'Providing hospitality services', color: 'bg-yellow-25', icon: 'hospitality' },
  { id: 'hospitality_management', name: 'Hospitality Management', description: 'Managing hospitality operations', color: 'bg-amber-25', icon: 'management' },
  { id: 'hospitality_events', name: 'Event Management', description: 'Managing events', color: 'bg-lime-25', icon: 'events' },

  { id: 'transportation_driving', name: 'Transportation', description: 'Driving/transportation work', color: 'bg-emerald-25', icon: 'transportation' },
  { id: 'transportation_logistics', name: 'Transport Logistics', description: 'Managing transportation logistics', color: 'bg-teal-25', icon: 'logistics' },
  { id: 'transportation_dispatch', name: 'Dispatch Coordination', description: 'Coordinating dispatches', color: 'bg-cyan-25', icon: 'dispatch' },

  { id: 'energy_operations', name: 'Energy Operations', description: 'Operating energy systems', color: 'bg-sky-25', icon: 'energy' },
  { id: 'energy_maintenance', name: 'Energy Maintenance', description: 'Maintaining energy systems', color: 'bg-blue-25', icon: 'maintenance' },
  { id: 'energy_safety', name: 'Energy Safety', description: 'Ensuring energy safety', color: 'bg-indigo-25', icon: 'safety' },

  { id: 'agriculture_farming', name: 'Agricultural Work', description: 'Farming/agricultural activities', color: 'bg-violet-25', icon: 'agriculture' },
  { id: 'agriculture_livestock', name: 'Livestock Management', description: 'Managing livestock', color: 'bg-purple-12', icon: 'livestock' },
  { id: 'agriculture_harvesting', name: 'Harvesting', description: 'Harvesting crops', color: 'bg-pink-12', icon: 'harvesting' }
])

const form = reactive({
  location: '',
  project: '',
  notes: ''
})

const getCurrentLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentLocation.value = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
      },
      (error) => {
        console.error('Error getting location:', error)
      }
    )
  }
}

const handleSubmit = async () => {
  if (!selectedStatus.value) return

  loading.value = true

  try {
    const punchData: PunchData = {
      punch_type: 'check_in',
      attendance_date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toTimeString().slice(0, 5),
      method: 'web',
      location: form.location,
      work_status: selectedStatus.value.id,
      project: form.project || undefined,
      notes: form.notes || undefined,
      gps_coordinates: currentLocation.value || undefined
    }

    emit('punch', punchData)
  } catch (error) {
    console.error('Work status submission error:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  getCurrentLocation()
})
</script>
