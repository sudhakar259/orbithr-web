# Module System - Quick Reference Card

## 📋 Quick Start

```bash
# 1. Run migrations
php artisan migrate

# 2. Seed core modules
php artisan db:seed --class=CoreModulesSeeder

# 3. Configure .env
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# 4. Set webhook in Stripe dashboard
# https://dashboard.stripe.com/webhooks

# 5. Test marketplace
# Navigate to /marketplace in frontend
```

## 📁 Key Files Location

**Backend**:
- Services: `backend/app/Services/{ModuleService,BillingService}.php`
- Controllers: `backend/app/Http/Controllers/{AdminModule,Marketplace,Webhook}Controller.php`
- Models: `backend/app/Models/{Module,TenantModule,ModulePackage,ModuleEventsLog}.php`
- Routes: `backend/routes/api.php` (lines ~160-185)
- Config: `backend/config/modules.php`
- Migrations: `backend/database/migrations/2025_01_21_*`

**Frontend**:
- Components: `src/components/marketplace/*.vue`
- Store: `src/stores/modules.ts`

## 🔑 Core Classes

### ModuleService
```php
use App\Services\ModuleService;

$service = app(ModuleService::class);
$service->activateModule($tenant, 'payroll', auth()->id());
$service->tenantHasModule($tenant, 'payroll'); // true/false
$service->getTenantModules($tenant);
```

### Module Model
```php
$module = Module::where('slug', 'payroll')->first();
$module->is_core;              // Boolean
$module->is_restricted;        // Boolean
$module->features;             // Array
$module->meta;                 // Array: price, billing_type, icon, etc.
$module->isFree();             // Helper
$module->isRecurring();        // Helper
```

### TenantModule Model
```php
$tm = TenantModule::where('tenant_id', $tenantId)
    ->whereHas('module', fn($q) => $q->where('slug', 'payroll'))
    ->first();

$tm->status;                   // active|inactive|pending|suspended
$tm->billing_reference;        // Stripe subscription/payment ID
$tm->activated_at;             // DateTime
$tm->expires_at;               // DateTime
$tm->isActive();               // Boolean
$tm->hasExpired();             // Boolean
$tm->daysUntilExpiry();        // Integer|null
```

## 🌐 API Endpoints

### Marketplace (Tenant)
```
GET  /api/marketplace              List modules
GET  /api/marketplace/{slug}       Module details
GET  /api/tenant/modules           Tenant modules
POST /api/tenant/modules/{slug}/purchase    Start checkout
POST /api/tenant/modules/{slug}/enable      Enable free module
POST /api/tenant/modules/{slug}/disable     Disable module
```

### Admin (Super-Admin)
```
GET  /api/admin/modules            All modules
POST /api/admin/modules/install-package    Register package
POST /api/admin/modules/{id}/mark-core     Mark as core
```

### Webhooks
```
POST /api/webhooks/billing         Stripe events
```

## 🎫 Payment States

```
Pending → Paid → Active
              ↓
        Failed → Suspended
                  ↓ (grace period)
               Inactive
```

## 🧪 Testing

```php
// Test module activation
$moduleService->activateModule($tenant, 'payroll', 1);

// Test tenant has module
assert($moduleService->tenantHasModule($tenant, 'payroll'));

// Test marketplace data
$data = $moduleService->getModuleMarketplaceData($tenant);

// Test webhook
POST /api/webhooks/billing with Stripe event
```

## 🛡️ Security Checks

```php
// Check in controller
$this->authorize('isAdmin');  // Gate

// Check in middleware
->middleware('ensure.tenant.has.module:payroll');

// Check in policy
public function view(User $user, Employee $employee): bool {
    // Authorization logic
}

// Check in service
if (!$moduleService->tenantHasModule($tenant, 'payroll')) {
    abort(403, 'Module not available');
}
```

## 📊 Events

```php
// Listen for activation
event(new TenantModuleActivated(
    tenantId: 'tenant-123',
    moduleSlug: 'payroll',
    activatedByUserId: 1,
    billingReference: 'sub_123'
));

// Listen for deactivation
event(new TenantModuleDeactivated(
    tenantId: 'tenant-123',
    moduleSlug: 'payroll',
    deactivatedByUserId: 1,
    reason: 'User request'
));
```

## 🎨 Vue Components

```vue
<script setup>
import { useModuleStore } from '@/stores/modules'
import Marketplace from '@/components/marketplace/Marketplace.vue'
import ModuleStatus from '@/components/marketplace/ModuleStatus.vue'

const moduleStore = useModuleStore()
await moduleStore.loadMarketplaceModules()
await moduleStore.loadTenantModules()

// Check if tenant has module
const hasPayroll = moduleStore.hasModule('payroll')

// Get module status
const payroll = moduleStore.getModule('payroll')
</script>

<template>
  <Marketplace />
  <ModuleStatus v-for="m in moduleStore.tenantModules" :key="m.id" :tenant-module="m" />
</template>
```

## ⚙️ Configuration

### config/modules.php Structure
```php
'payroll' => [
    'name' => 'Payroll Management',
    'slug' => 'payroll',
    'description' => '...',
    'is_core' => false,              // false = optional, true = core
    'is_restricted' => false,        // false = public, true = super-admin only
    'features' => [                  // Feature list for UI
        'payroll-cycles',
        'salary-structures',
    ],
    'meta' => [                      // Metadata
        'price' => 99.99,
        'billing_type' => 'recurring',  // or 'one_time'
        'icon' => 'banknote',
        'category' => 'business',
        'docs_url' => 'https://...',
    ],
],
```

## 📱 Middleware Usage

```php
// Single module
Route::post('/payroll/process', ...)
    ->middleware('ensure.tenant.has.module:payroll');

// Multiple modules
Route::post('/api/report', ...)
    ->middleware('ensure.tenant.has.module:payroll,attendance');

// Returns 403 if tenant doesn't have module
```

## 🔐 Authorization

```php
// Register in AuthServiceProvider
Gate::policy(Employee::class, EmployeePolicy::class);

// Check in controller
$this->authorize('view', $employee);

// The policy checks module access
public function view(User $user, Employee $employee): bool {
    return $user->hasRole('admin|hr_manager|manager');
}
```

## 🌍 Environment Variables

```env
# Stripe
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Module System
MODULE_SYSTEM_ENABLED=true
MODULE_CACHE_ENABLED=false
MODULE_CACHE_TTL=3600
```

## 🐛 Debugging

```bash
# Check migrations ran
php artisan migrate:status

# Check modules were seeded
php artisan tinker
>>> App\Models\Module::count()
>>> App\Models\Module::pluck('slug')

# Test Stripe connection
>>> Stripe\Stripe::setApiKey(config('services.stripe.secret'))

# Check webhook events
# Stripe Dashboard > Events

# Check logs
tail -f storage/logs/laravel.log
```

## 📝 Database Queries

```php
// Get all core modules
Module::where('is_core', true)->get();

// Get tenant's active modules
TenantModule::where('tenant_id', $tenantId)
    ->where('status', 'active')
    ->with('module')
    ->get();

// Get modules expiring soon
TenantModule::where('expires_at', '<=', now()->addDays(7))
    ->where('expires_at', '>', now())
    ->get();

// Get suspended modules
TenantModule::where('status', 'suspended')->get();

// Get webhook logs
ModuleEventsLog::where('event_type', 'TenantModuleActivated')
    ->where('status', 'completed')
    ->get();
```

## 💰 Pricing Examples

### Free (Core Module)
```php
'employee' => [
    'is_core' => true,
    'meta' => ['price' => 0, 'billing_type' => 'one_time'],
]
```

### One-Time Purchase
```php
'analytics' => [
    'meta' => ['price' => 299.99, 'billing_type' => 'one_time'],
]
```

### Monthly Subscription
```php
'payroll' => [
    'meta' => ['price' => 99.99, 'billing_type' => 'recurring'],
]
```

### Free Trial
```php
// Activate with future expiry
$moduleService->activateModule(
    $tenant,
    'payroll',
    auth()->id(),
    expiresAt: now()->addDays(14)
);
```

## 🚀 Deployment Checklist

- [ ] Migrations run: `php artisan migrate`
- [ ] Seeded modules: `php artisan db:seed --class=CoreModulesSeeder`
- [ ] Stripe production keys in `.env`
- [ ] Webhook URL in Stripe dashboard
- [ ] Cache cleared: `php artisan cache:clear`
- [ ] Config cached: `php artisan config:cache`
- [ ] Routes optimized: `php artisan route:cache`
- [ ] Tested payment flow
- [ ] Monitored webhook delivery
- [ ] Set up error alerts

## 📚 Documentation Files

1. **MODULE_SYSTEM.md** - Complete technical documentation
2. **MODULE_SYSTEM_SETUP.md** - Installation and deployment guide
3. **MODULE_SYSTEM_IMPLEMENTATION.md** - Implementation summary
4. **MODULE_SYSTEM_QUICK_REFERENCE.md** - This file

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Migration failed | Check database permissions, run `php artisan migrate:status` |
| Modules not appearing | Run `CoreModulesSeeder`, check `is_restricted` flag |
| Webhook not firing | Verify webhook URL and secret in Stripe |
| Payment not activating | Check `module_events_log` table, verify webhook handler |
| Module not accessible | Check `tenant_modules.status = 'active'` and middleware |

---

**Last Updated**: January 21, 2025  
**Status**: Production Ready  
**Version**: 1.0
