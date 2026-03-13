# Module System Setup & Implementation Guide

## Pre-Implementation Checklist

- [ ] Backup existing database
- [ ] Ensure Stripe account is configured
- [ ] Set up Stripe API keys (test and production)
- [ ] Configure webhook URL in Stripe dashboard
- [ ] Review database schema documentation

## Step 1: Database Setup

### Run Migrations

```bash
# Create the enhanced tables
php artisan migrate

# This will execute:
# - 2025_01_21_000001_update_modules_table_add_is_core_meta
# - 2025_01_21_000002_update_tenant_modules_table_add_billing_status
# - 2025_01_21_000003_create_module_packages_table
# - 2025_01_21_000004_create_module_events_log_table
```

### Seed Core Modules

```bash
php artisan db:seed --class=CoreModulesSeeder
```

This populates the `modules` table with:
- Employee Management (core)
- Attendance & Timesheets (core)
- Leave Management
- Payroll Management
- Projects & Tasks
- Team Chat
- Performance Management

## Step 2: Configuration

### Set Environment Variables

Update `.env`:

```env
# Stripe Configuration
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Module System
MODULE_SYSTEM_ENABLED=true
MODULE_CACHE_ENABLED=false  # Enable for production
MODULE_CACHE_TTL=3600
```

### Configure Stripe Webhook

In Stripe Dashboard:

1. Go to Developers > Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/billing`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. Copy webhook signing secret to `.env`

### Update config/modules.php

Customize module metadata:

```php
return [
    'core_modules' => [
        'payroll' => [
            'name' => 'Payroll Management',
            'slug' => 'payroll',
            'meta' => [
                'price' => 99.99,
                'billing_type' => 'recurring',
                'icon' => 'banknote',
                'category' => 'business',
            ],
        ],
        // ... other modules
    ],
];
```

## Step 3: Backend Integration

### Update Service Providers

Register services in `AppServiceProvider` or create a `ModuleServiceProvider`:

```php
// app/Providers/AppServiceProvider.php
public function register(): void
{
    $this->app->singleton(\App\Services\ModuleService::class);
    $this->app->singleton(\App\Services\BillingService::class);
}
```

### Register Event Listeners

Listen for module events (create listeners/observers):

```php
// app/Listeners/InitializeModuleData.php
public function handle(TenantModuleActivated $event)
{
    // Initialize module-specific data for tenant
    // Examples:
    // - Create default payroll settings
    // - Create default leave types
    // - Set up default permissions
    tenancy()->initialize(Tenant::find($event->tenantId));
    // ... setup code ...
    tenancy()->end();
}
```

Register in `EventServiceProvider`:

```php
protected $listen = [
    \App\Events\TenantModuleActivated::class => [
        \App\Listeners\InitializeModuleData::class,
    ],
    \App\Events\TenantModuleDeactivated::class => [
        \App\Listeners\CleanupModuleData::class,
    ],
];
```

### Update Authorization

Update `AuthServiceProvider` to register policies:

```php
public function boot(): void
{
    Gate::policy(Employee::class, EmployeePolicy::class);
    Gate::policy(LeaveRequest::class, LeavePolicy::class);
    Gate::policy(PayrollCycle::class, PayrollPolicy::class);
}
```

Add custom gates for admin checks:

```php
Gate::define('isAdmin', function (User $user) {
    return $user->hasRole('Super Admin');
});

Gate::define('assignRestrictedModules', function (User $user) {
    return $user->hasRole('Super Admin');
});
```

## Step 4: Frontend Integration

### Install Dependencies

```bash
npm install pinia  # If not already installed
```

### Register Module Store

In `src/main.ts`:

```typescript
import { createPinia } from 'pinia'
import { useModuleStore } from '@/stores/modules'

const pinia = createPinia()
app.use(pinia)

// Initialize module store on app load
const moduleStore = useModuleStore()
moduleStore.loadMarketplaceModules()
moduleStore.loadTenantModules()
```

### Add Routes

In `src/router/index.ts`:

```typescript
{
  path: '/marketplace',
  component: () => import('@/pages/app/Marketplace.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/modules/status',
  component: () => import('@/pages/app/ModuleStatus.vue'),
  meta: { requiresAuth: true }
},
```

### Add Navigation

Update sidebar/navigation to include:

```vue
<router-link to="/marketplace">Marketplace</router-link>
<router-link to="/modules/status">Modules</router-link>
```

### Create Pages

Create wrapper pages that use components:

```vue
<!-- src/pages/app/Marketplace.vue -->
<template>
  <Marketplace />
</template>

<script setup>
import Marketplace from '@/components/marketplace/Marketplace.vue'
</script>
```

## Step 5: Testing

### Unit Tests

Test ModuleService:

```bash
php artisan test --filter=ModuleServiceTest
```

### Integration Tests

Test API endpoints:

```bash
php artisan test --filter=MarketplaceControllerTest
```

### Webhook Testing

Use Stripe CLI to test webhooks locally:

```bash
# Install Stripe CLI
# Then forward webhooks
stripe listen --forward-to http://localhost:8000/api/webhooks/billing

# Trigger test event
stripe trigger checkout.session.completed
```

### E2E Testing

Test full purchase flow:

```bash
npm run test:e2e  # If configured
```

## Step 6: Validation Checklist

- [ ] All migrations run successfully
- [ ] CoreModulesSeeder populates modules table
- [ ] `config/modules.php` is customized for your modules
- [ ] Stripe keys are configured in `.env`
- [ ] Webhook URL is added to Stripe dashboard
- [ ] Module store is initialized in Vue app
- [ ] Routes are added for marketplace/status pages
- [ ] Event listeners are registered for module lifecycle
- [ ] Policies are registered for resources
- [ ] Middleware is registered in kernel
- [ ] Authorization checks work on protected routes
- [ ] Webhook handler receives and processes events
- [ ] Payment flow works end-to-end
- [ ] Module activation triggers events correctly

## Step 7: Production Deployment

### Before Going Live

1. **Stripe Setup**:
   - Switch to production keys
   - Update webhook URL to production domain
   - Test full payment flow with real payment method

2. **Database**:
   - Run migrations on production database
   - Run CoreModulesSeeder
   - Backup database before and after

3. **Security**:
   - Ensure webhook secret is stored securely
   - Verify all sensitive data is not logged
   - Test authorization on all endpoints
   - Enable HTTPS requirement

4. **Performance**:
   - Enable module caching
   - Add database indexes (see MODULE_SYSTEM.md)
   - Monitor webhook processing times
   - Set up error monitoring (Sentry, etc.)

5. **Monitoring**:
   - Set up alerts for failed webhooks
   - Monitor payment failures
   - Track module activation rates
   - Monitor API response times

### Deployment Commands

```bash
# Run migrations
php artisan migrate --force

# Seed core modules
php artisan db:seed --class=CoreModulesSeeder --force

# Clear caches
php artisan cache:clear
php artisan config:cache

# Optimize
php artisan optimize

# Monitor webhook queue (if using)
php artisan queue:work
```

## Common Configuration Scenarios

### Scenario 1: All Modules are Core (No Billing)

```php
// config/modules.php
'payroll' => [
    'is_core' => true,  // Enable for all tenants
    'meta' => [
        'price' => 0,   // Free
    ],
],
```

### Scenario 2: Free Trial Period

```php
// When initiating checkout, set expires_at to trial end date
$moduleService->activateModule(
    $tenant,
    'payroll',
    expiresAt: now()->addDays(14),  // 14-day trial
);
```

### Scenario 3: Tiered Pricing

Create separate modules for different tiers:

```php
'payroll-basic' => [
    'name' => 'Payroll - Basic',
    'slug' => 'payroll-basic',
    'meta' => ['price' => 49.99],
],
'payroll-pro' => [
    'name' => 'Payroll - Pro',
    'slug' => 'payroll-pro',
    'meta' => ['price' => 99.99],
],
```

### Scenario 4: One-Time Payment (License)

```php
'analytics' => [
    'meta' => [
        'price' => 299.99,
        'billing_type' => 'one_time',  // One-time purchase
    ],
],
```

## Troubleshooting

### Migration Errors

```bash
# Check migration status
php artisan migrate:status

# Rollback to specific migration
php artisan migrate:rollback --step=4

# Refresh and reseed
php artisan migrate:fresh --seed
```

### Seeding Issues

```bash
# Run with verbose output
php artisan db:seed --class=CoreModulesSeeder --verbose

# Check if modules were created
php artisan tinker
>>> App\Models\Module::count()
```

### Stripe Integration Issues

```bash
# Test Stripe connection
php artisan tinker
>>> Stripe\Stripe::setApiKey(config('services.stripe.secret'))
>>> Stripe\Customer::retrieve('cus_test')

# Check webhook events
# Go to Stripe Dashboard > Events
```

### Module Not Accessible

```bash
# Check tenant module record
php artisan tinker
>>> App\Models\TenantModule::where('tenant_id', 'tenant-123')->get()

# Check middleware is applied
>>> php artisan route:list | grep -i module
```

## Support & Resources

- **Documentation**: See `MODULE_SYSTEM.md`
- **API Reference**: See API endpoint sections
- **Stripe Docs**: https://stripe.com/docs
- **Laravel Docs**: https://laravel.com/docs
- **Vue 3 Docs**: https://vuejs.org

## Next Steps After Setup

1. **Customize Core Modules**: Update `config/modules.php` with your specific modules
2. **Create Event Listeners**: Listen to `TenantModuleActivated` events to initialize module data
3. **Update UI**: Customize marketplace components with your branding
4. **Configure Pricing**: Set up Stripe products and prices
5. **Test Flows**: Test purchase and activation workflows
6. **Monitor**: Set up logging and monitoring for production

## Rollback Plan

If issues arise:

```bash
# Rollback all module migrations
php artisan migrate:rollback --step=4

# OR rollback to specific migration date
php artisan migrate:rollback --path=database/migrations/2025_01_21_*

# Restore database from backup
```

This will:
- Remove all module-related tables
- Restore original schema
- Allow you to troubleshoot and redeploy
