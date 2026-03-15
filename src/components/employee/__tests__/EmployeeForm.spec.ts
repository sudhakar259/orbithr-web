import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import EmployeeForm from '../EmployeeForm.vue'

// ─── mock employee service ────────────────────────────────────────────────────

vi.mock('@/services/employee', () => ({
  listEmployees:   vi.fn().mockResolvedValue({ data: [] }),
  createEmployee:  vi.fn().mockResolvedValue({ data: { id: 1 } }),
  updateEmployee:  vi.fn().mockResolvedValue({ data: { id: 99 } }),
}))

import { listEmployees, createEmployee, updateEmployee } from '@/services/employee'
const mockCreate = vi.mocked(createEmployee)
const mockUpdate = vi.mocked(updateEmployee)
const mockList   = vi.mocked(listEmployees)

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeEmployee(overrides = {}) {
  return {
    id: 99,
    first_name: 'Alice',
    last_name: 'Smith',
    email: 'alice@company.com',
    phone: '9876543210',
    employee_id: 'EMP099',
    role: 'employee',
    designation: 'Engineer',
    department: 'Engineering',
    status: 'Active',
    hire_date: '2023-01-15',
    employment_type: 'Full-time',
    working_days: [1, 2, 3, 4, 5],
    ...overrides,
  }
}

function mountCreate() {
  return mount(EmployeeForm, {
    props: {},
    global: { stubs: { teleport: true } },
  })
}

function mountEdit(initialData = makeEmployee()) {
  return mount(EmployeeForm, {
    props: { employeeId: 99, initialData },
    global: { stubs: { teleport: true } },
  })
}

// ─── rendering ───────────────────────────────────────────────────────────────

describe('EmployeeForm – rendering', () => {
  it('renders Basic Information section', () => {
    const wrapper = mountCreate()
    expect(wrapper.text()).toContain('Basic Information')
  })

  it('renders Employment Details section', () => {
    const wrapper = mountCreate()
    expect(wrapper.text()).toContain('Employment Details')
  })

  it('renders Personal Information section', () => {
    const wrapper = mountCreate()
    expect(wrapper.text()).toContain('Personal Information')
  })

  it('renders Banking Information section', () => {
    const wrapper = mountCreate()
    expect(wrapper.text()).toContain('Banking Information')
  })

  it('renders Emergency Contact section', () => {
    const wrapper = mountCreate()
    expect(wrapper.text()).toContain('Emergency Contact')
  })

  it('shows "Create Employee" submit button in create mode', () => {
    const wrapper = mountCreate()
    expect(wrapper.text()).toContain('Create Employee')
  })

  it('shows "Update Employee" submit button in edit mode', () => {
    const wrapper = mountEdit()
    expect(wrapper.text()).toContain('Update Employee')
  })

  it('renders working day chips for all 7 days', () => {
    const wrapper = mountCreate()
    const chips = wrapper.findAll('.day-chip')
    expect(chips.length).toBe(7)
  })

  it('defaults Mon–Fri chips to active state', () => {
    const wrapper = mountCreate()
    const onChips = wrapper.findAll('.day-chip--on')
    expect(onChips.length).toBe(5)
  })

  it('renders role select with employee option', () => {
    const wrapper = mountCreate()
    expect(wrapper.html()).toContain('employee')
    expect(wrapper.html()).toContain('manager')
  })
})

// ─── locked fields in edit mode ───────────────────────────────────────────────

describe('EmployeeForm – locked fields in edit mode', () => {
  it('email field is disabled in edit mode', () => {
    const wrapper = mountEdit()
    const emailInput = wrapper.find('input[type="email"]')
    expect(emailInput.attributes('disabled')).toBeDefined()
  })

  it('employee_id field is disabled in edit mode', () => {
    const wrapper = mountEdit()
    // Find all text inputs and locate the employee_id one via value
    const allInputs = wrapper.findAll('input')
    const empIdInput = allInputs.find(i => i.element.value === 'EMP099')
    expect(empIdInput).toBeDefined()
    expect(empIdInput!.attributes('disabled')).toBeDefined()
  })

  it('shows "Email cannot be changed" hint in edit mode', () => {
    const wrapper = mountEdit()
    expect(wrapper.text()).toContain('Email cannot be changed after creation.')
  })

  it('shows "Employee code is immutable" hint in edit mode', () => {
    const wrapper = mountEdit()
    expect(wrapper.text()).toContain('Employee code is immutable.')
  })

  it('email field is NOT disabled in create mode', () => {
    const wrapper = mountCreate()
    const emailInput = wrapper.find('input[type="email"]')
    expect(emailInput.attributes('disabled')).toBeUndefined()
  })

  it('email hint is NOT shown in create mode', () => {
    const wrapper = mountCreate()
    expect(wrapper.text()).not.toContain('Email cannot be changed after creation.')
  })
})

// ─── working day toggle ───────────────────────────────────────────────────────

describe('EmployeeForm – working day toggle', () => {
  beforeEach(() => vi.clearAllMocks())

  it('toggling Saturday (index 5) adds it to working_days', async () => {
    const wrapper = mountCreate()
    const chips = wrapper.findAll('.day-chip')
    const satChip = chips[5] // Saturday is index 5 in workDays array (Mon=0, ..., Sat=5, Sun=6)
    await satChip.find('input[type="checkbox"]').trigger('change')
    expect(satChip.classes()).toContain('day-chip--on')
  })

  it('toggling Monday (index 0) removes it from working_days', async () => {
    const wrapper = mountCreate()
    const chips = wrapper.findAll('.day-chip')
    const monChip = chips[0] // Monday is index 0
    await monChip.find('input[type="checkbox"]').trigger('change')
    expect(monChip.classes()).not.toContain('day-chip--on')
  })
})

// ─── initial data population ─────────────────────────────────────────────────

describe('EmployeeForm – initialData population', () => {
  it('populates first_name from initialData', () => {
    const wrapper = mountEdit(makeEmployee({ first_name: 'Alice' }))
    const input = wrapper.find('input[placeholder="John"]')
    expect((input.element as HTMLInputElement).value).toBe('Alice')
  })

  it('populates phone from initialData', () => {
    const wrapper = mountEdit(makeEmployee({ phone: '9999888877' }))
    const input = wrapper.find('input[type="tel"]')
    expect((input.element as HTMLInputElement).value).toBe('9999888877')
  })

  it('marks active working days from initialData', () => {
    const wrapper = mountEdit(makeEmployee({ working_days: [1, 2] }))
    // Only Mon and Tue should be active (index 0 and 1 in 0-based array)
    const onChips = wrapper.findAll('.day-chip--on')
    expect(onChips.length).toBe(2)
  })
})

// ─── form submission ──────────────────────────────────────────────────────────

describe('EmployeeForm – form submission', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls createEmployee when submitting in create mode', async () => {
    mockCreate.mockResolvedValueOnce({ data: { id: 1 } } as any)
    const wrapper = mountCreate()
    await wrapper.find('form').trigger('submit')
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('calls updateEmployee when submitting in edit mode', async () => {
    mockUpdate.mockResolvedValueOnce({ data: { id: 99 } } as any)
    const wrapper = mountEdit()
    await wrapper.find('form').trigger('submit')
    expect(mockUpdate).toHaveBeenCalledWith(99, expect.any(Object))
  })

  it('emits submit event on success', async () => {
    mockCreate.mockResolvedValueOnce({ data: { id: 1 } } as any)
    const wrapper = mountCreate()
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('submit')).toBeTruthy()
  })

  it('emits cancel event when Cancel is clicked', async () => {
    const wrapper = mountCreate()
    await wrapper.find('button.ef-btn--ghost').trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('displays general error message on API failure', async () => {
    mockCreate.mockRejectedValueOnce({
      response: { data: { message: 'Server Error' } },
    })
    const wrapper = mountCreate()
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Server Error')
  })

  it('displays field-level validation errors from API', async () => {
    mockCreate.mockRejectedValueOnce({
      response: { data: { errors: { first_name: 'First name is required.' } } },
    })
    const wrapper = mountCreate()
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('First name is required.')
  })
})

// ─── managers list ────────────────────────────────────────────────────────────

describe('EmployeeForm – managers list', () => {
  beforeEach(() => vi.clearAllMocks())

  it('populates manager dropdown from listEmployees', async () => {
    const managers = [
      { id: 10, first_name: 'Bob', last_name: 'Manager', role: 'manager', designation: 'VP' },
    ]
    mockList.mockResolvedValueOnce({ data: managers } as any)
    const wrapper = mountCreate()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Bob')
  })

  it('team lead dropdown only includes manager/team_lead/admin roles', async () => {
    const employees = [
      { id: 1, first_name: 'Lead', last_name: 'One', role: 'team_lead', designation: 'TL' },
      { id: 2, first_name: 'Emp', last_name: 'Two', role: 'employee', designation: null },
    ]
    mockList.mockResolvedValueOnce({ data: employees } as any)
    const wrapper = mountCreate()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    // Team Lead dropdown should only show Lead One, not Emp Two
    const selects = wrapper.findAll('select')
    const teamLeadSelect = selects.find(s => s.text().includes('No Team Lead'))
    expect(teamLeadSelect?.text()).toContain('Lead One')
    expect(teamLeadSelect?.text()).not.toContain('Emp Two')
  })
})
