# Module System Documentation

## Overview

This document describes the complete module system implementation for the OrbitHR multi-tenant SaaS platform. The system enables:

- **Core Modules**: Automatically enabled for all tenants (employee management, attendance)
- **Optional Paid Modules**: Available for purchase via marketplace (payroll, leave, projects, etc.)
- **Billing Integration**: Stripe checkout and subscription management
- **Event-Driven Architecture**: Lifecycle events for module activation/deactivation
- **Multi-tenant Isolation**: Per-tenant module activation and settings

## Architecture

### Database Schema

#### `modules` Table
```sql
- id: bigint (primary key)
- name: string (module display name)
- slug: string (unique identifier, e.g., 'payroll')
- description: string
- is_core: boolean (true for core modules, auto-enabled for all tenants)
- is_restricted: boolean (true for super-admin only modules)
- features: json (array of feature slugs)
- meta: json (pricing, billing_type, icon, category, docs_url)
- timestamps
```

#### `tenant_modules` Table (Pivot)
```sql
- id: bigint (primary key)
- tenant_id: string (references tenants.id)
- module_id: bigint (references modules.id)
- enabled: boolean
- status: string (active | inactive | pending | suspended)
- billing_reference: string (Stripe subscription/payment ID)
- activated_at: timestamp
- expires_at: timestamp (subscription expiry date)
- settings: json (tenant-specific module configuration)
- activated_by_user_id: unsigned bigint (user who activated)
- deactivated_by_user_id: unsigned bigint (user who deactivated)
- deactivated_at: timestamp
- timestamps
```

#### `module_packages` Table
```sql
- id: bigint
- package_name: string (unique, composer package name)
- module_slug: string (references modules.slug)
- version: string
- manifest: json (package metadata)
- installed_at: timestamp
- uninstalled_at: timestamp
- timestamps
```

#### `module_events_log` Table
```sql
- id: bigint
- tenant_id: string (nullable, references tenants.id)
- event_type: string (TenantModuleActivated, TenantModuleDeactivated, etc.)
- module_slug: string
- billing_reference: string
- payload: json (event data)
- status: string (completed | failed | pending)
- error_message: text
- gateway_response: json (webhook/billing response)
- processed_at: timestamp
- timestamps
```

### Key Services

#### ModuleService (`app/Services/ModuleService.php`)

Core service for module lifecycle management:

```php
// Activate a module for a tenant
$moduleService->activateModule($tenant, 'payroll', $userId, settings: [...]);

// Deactivate a module (except core modules)
$moduleService->deactivateModule($tenant, 'payroll', $userId);

// Suspend a module (e.g., due to payment failure)
$moduleService->suspendModule($tenant, 'payroll', 'Payment failed');

// Check if tenant has module
$hasModule = $moduleService->tenantHasModule($tenantId, 'payroll');

// Initialize core modules for new tenant
$moduleService->initializeTenantModules($tenant);

// Get tenant's active modules
$modules = $moduleService->getTenantModules($tenant);

// Get module with tenant data
$tenantModule = $moduleService->getTenantModule($tenant, 'payroll');

// Get marketplace data for frontend
$marketplaceData = $moduleService->getModuleMarketplaceData($tenant);
```

#### BillingService (`app/Services/BillingService.php`)

Stripe billing integration:

```php
// Create one-time purchase checkout session
$billing->createCheckoutSession($tenant, 'payroll', $priceId, $successUrl, $cancelUrl);

// Create recurring subscription checkout
$billing->createSubscription($tenant, 'payroll', $priceId, $successUrl, $cancelUrl);

// Verify webhook signature
$billing->verifyWebhookSignature($payload, $signature);

// Handle checkout events
$billing->handleCheckoutCompleted($sessionId);

// Handle subscription events
$billing->handleSubscriptionEvent($subscriptionId);
```

### Models

#### Module Model
```php
$module->permissions();           // Permissions for this module
$module->tenantModules();         // All tenant activations
$module->packages();              // Installed packages
$module->isFree();                // Check if module is free
$module->getBillingType();        // 'one_time' or 'recurring'
$module->getPrice();              // Module price
$module->isRecurring();           // Check if recurring billing
```

#### TenantModule Model
```php
$tm->module;                      // Related Module
$tm->tenant;                      // Related Tenant
$tm->activatedByUser;             // User who activated
$tm->deactivatedByUser;           // User who deactivated
$tm->isActive();                  // Status is 'active' and enabled
$tm->isSuspended();               // Status is 'suspended'
$tm->isPending();                 // Status is 'pending'
$tm->hasExpired();                // Expiry date is past
$tm->daysUntilExpiry();           // Days until expiration
$tm->updateStatus($status, $userId);  // Update with audit
```

## API Endpoints

### Marketplace Endpoints (Tenant)

```
GET    /api/marketplace                    - List all marketplace modules
GET    /api/marketplace/{slug}             - Get module details
GET    /api/tenant/modules                 - Get tenant's active modules
POST   /api/tenant/modules/{slug}/enable   - Enable free module
POST   /api/tenant/modules/{slug}/purchase - Initiate checkout
POST   /api/tenant/modules/{slug}/disable  - Disable module
GET    /api/tenant/modules/{slug}/status   - Get module status
PUT    /api/tenant/modules/{slug}/settings - Update settings
```

### Admin Endpoints (Super-Admin Only)

```
GET    /api/admin/modules                           - List all modules
GET    /api/admin/modules/{id}                      - Get module details
POST   /api/admin/modules/install-package          - Install package
DELETE /api/admin/modules/packages/{id}            - Uninstall package
POST   /api/admin/modules/{id}/mark-core           - Mark as core
POST   /api/admin/modules/{id}/unmark-core         - Unmark as core
POST   /api/admin/modules/{id}/toggle-restricted   - Toggle restricted
PUT    /api/admin/modules/{id}                     - Update module
GET    /api/admin/modules/{id}/stats               - Get usage stats
POST   /api/admin/tenants/{tenantId}/modules/{id}/assign   - Assign to tenant
DELETE /api/admin/tenants/{tenantId}/modules/{id}         - Remove from tenant
```

### Webhook Endpoints

```
POST   /api/webhooks/billing              - Stripe billing webhooks
```

Handles events:
- `checkout.session.completed` - Activate module on successful payment
- `invoice.payment_succeeded` - Reactivate module on subscription payment
- `invoice.payment_failed` - Suspend module on failed payment
- `customer.subscription.deleted` - Deactivate module on subscription cancellation
- `customer.subscription.updated` - Update expiry date on subscription change

## Middleware & Authorization

### Middleware: EnsureTenantHasModule

Verify tenant has access to module:

```php
// Single module
Route::get('/payroll', ...)->middleware('ensure.tenant.has.module:payroll');

// Multiple modules
Route::post('/payroll/process', ...)
    ->middleware('ensure.tenant.has.module:payroll,employee');
```

Returns 403 if tenant lacks required modules.

### Policies

Resource policies check module availability:

```php
$this->authorize('view', $employee);    // Checks employee module access
$this->authorize('create', Leave::class); // Checks leave module access
```

## Events

### TenantModuleActivated

Fired when module is activated. Packages can listen to initialize resources:

```php
event(new TenantModuleActivated(
    tenantId: 'tenant-123',
    moduleSlug: 'payroll',
    activatedByUserId: 1,
    billingReference: 'sub_123',
    activatedAt: now()
));
```

### TenantModuleDeactivated

Fired when module is deactivated for cleanup:

```php
event(new TenantModuleDeactivated(
    tenantId: 'tenant-123',
    moduleSlug: 'payroll',
    deactivatedByUserId: 1,
    deactivatedAt: now(),
    reason: 'User request'
));
```

## Configuration

### Core Modules (`config/modules.php`)

Define module metadata:

```php
'employee' => [
    'name' => 'Employee Management',
    'slug' => 'employee',
    'description' => '...',
    'is_core' => true,
    'is_restricted' => false,
    'features' => ['employee-directory', 'org-chart', ...],
    'meta' => [
        'icon' => 'users',
        'category' => 'core',
        'price' => 0,
        'billing_type' => 'one_time',
    ],
],
'payroll' => [
    'name' => 'Payroll Management',
    'slug' => 'payroll',
    'description' => '...',
    'is_core' => false,
    'features' => ['payroll-cycles', 'salary-structures', ...],
    'meta' => [
        'price' => 99.99,
        'billing_type' => 'recurring',
    ],
],
```

## Seeding Core Modules

Run the seeder to initialize modules:

```bash
php artisan db:seed --class=CoreModulesSeeder
```

This populates the `modules` table with all configured core modules.

## Frontend Integration

### Marketplace Page

Display available modules with purchase option:

```vue
<template>
  <Marketplace />
</template>

<script setup>
import Marketplace from '@/components/marketplace/Marketplace.vue'
</script>
```

### Module Status

Show tenant's active modules and management options:

```vue
<template>
  <ModuleStatus v-for="module in tenantModules" :key="module.id" :tenant-module="module" />
</template>

<script setup>
import ModuleStatus from '@/components/marketplace/ModuleStatus.vue'
import { useModuleStore } from '@/stores/modules'

const moduleStore = useModuleStore()
const tenantModules = moduleStore.tenantModules
</script>
```

### Module Store (Pinia)

```typescript
import { useModuleStore } from '@/stores/modules'

const moduleStore = useModuleStore()

// Load data
await moduleStore.loadMarketplaceModules()
await moduleStore.loadTenantModules()

// Check access
const hasPayroll = moduleStore.hasModule('payroll')

// Activate/Deactivate
await moduleStore.activateModule('payroll')
await moduleStore.deactivateModule('payroll')

// Get status
const status = await moduleStore.getModuleStatus('payroll')

// Update settings
await moduleStore.updateModuleSettings('payroll', { currency: 'USD' })

// Initiate purchase
const checkout = await moduleStore.initiateCheckout('payroll', priceId, successUrl, cancelUrl)
```

## Tenant Creation & Initialization

When a tenant is created:

1. **Tenant record** is created
2. **Core modules** are automatically attached and activated
3. **Events** are fired to allow packages to initialize tenant resources
4. **Default roles and permissions** are set up

Flow in `RequestDomainController@approve()`:

```php
// Create tenant
$tenant = Tenant::create([...]);

// Initialize core modules
$moduleService->initializeTenantModules($tenant);

// Packages listen for TenantModuleActivated and set up:
// - Tenant-specific tables
// - Default settings
// - Default permissions/roles
// - Storage folders
```

## Multi-Tenant Strategy

### Current: Shared Database with Tenant ID

All tables have `tenant_id` column. Models use global scope:

```php
class Employee extends Model
{
    protected static function boot()
    {
        parent::boot();
        
        static::addGlobalScope(new TenantScope);
    }
}
```

**Module migrations** are run globally once (at installation).

### Future: Per-Tenant Database

When activating a module for tenant with separate DB:

1. Switch to tenant's database connection
2. Run module's migrations
3. Seed default data
4. Fire activation event

## Billing Flows

### One-Time Purchase

1. Tenant clicks "Purchase" for module
2. Backend creates Stripe checkout session with metadata
3. Frontend redirects to Stripe hosted checkout
4. Customer completes payment
5. Stripe sends `checkout.session.completed` webhook
6. Backend activates module, stores billing reference
7. Frontend redirects to success page

### Recurring Subscription

Similar flow but creates subscription instead.

**Webhook handlers** ensure idempotent processing with event ID tracking.

## Billing States

```
Payment Pending → Payment Succeeded → Active
                                    ↓
                            Payment Failed → Suspended
                                    ↓
                        Grace Period (email notification)
                                    ↓
                              Inactive
```

## Troubleshooting

### Module Not Appearing in Marketplace

1. Check `modules` table: `is_restricted = false`
2. Run `CoreModulesSeeder`: `php artisan db:seed --class=CoreModulesSeeder`
3. Clear module cache (if caching implemented)

### Tenant Cannot Access Module

1. Check `tenant_modules.status = 'active'` and `enabled = true`
2. Verify middleware is applied to route
3. Check `ModuleEventsLog` for activation errors

### Payment Webhook Not Processing

1. Verify webhook secret in `.env` is correct
2. Check `module_events_log` table for webhook records
3. Verify Stripe event signature
4. Check Laravel logs for webhook handler errors

### Module Suspension on Failed Payment

1. Check `invoice.payment_failed` webhook was received
2. Verify `tenant_modules.status = 'suspended'`
3. Module should reactivate on next successful payment
4. Customer receives email notification

## Performance Optimization

### Caching

Consider caching for high-frequency checks:

```php
// Cache tenant module map
Cache::remember("tenant:{$tenantId}:modules", 3600, function() {
    return $moduleService->getTenantModules($tenantId);
});

// Invalidate on changes
Cache::forget("tenant:{$tenantId}:modules");
```

### Database Indexes

Key indexes for performance:

```sql
INDEX (tenant_id) ON tenant_modules
INDEX (module_id) ON tenant_modules
INDEX (status) ON tenant_modules
INDEX (tenant_id, module_id) ON tenant_modules -- composite
```

## Security

### Authorization Checks

- All module endpoints require authentication
- Marketplace is tenant-specific (no cross-tenant access)
- Super-admin endpoints have role check
- Middleware ensures module access before processing

### Webhook Security

- Signature verification required
- Idempotency via event ID deduplication
- Tenant context isolation
- Logging for audit trail

### Data Isolation

- `TenantScope` global scope on models
- Tenant ID in queries
- Middleware verification

## Future Enhancements

1. **Module Dependencies**: Modules can require other modules
2. **Module Tiers**: Multiple pricing tiers per module
3. **Trial Periods**: Free trial before purchase
4. **Usage-Based Billing**: Charge based on usage metrics
5. **Module Data Cleanup**: Automatic cleanup on deactivation
6. **Custom Modules**: Third-party package support
7. **Module Analytics**: Usage tracking and reporting
8. **Bulk Assignment**: Admin assigns modules to multiple tenants

## References

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Laravel Authorization](https://laravel.com/docs/authorization)
- [Pinia Store Documentation](https://pinia.vuejs.org/)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
