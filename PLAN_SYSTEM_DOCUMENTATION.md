# Plan System Documentation

## Overview

This comprehensive plan management system allows super admins to create, configure, and manage subscription plans for tenants. During tenant registration, users can select from available plans or request custom modules.

## Key Features

### 1. **Plan Management**
- Create unlimited plans with customizable:
  - Name and description
  - Price and billing cycle (monthly, yearly, one-time)
  - Duration and trial period
  - Maximum users (with unlimited option)
  - Active/Inactive status
  - "Most Popular" badge for marketing

### 2. **Module Management**
- Assign modules to plans
- Control which modules are included in each plan
- Set additional pricing for add-on modules
- Track enabled modules per tenant subscription

### 3. **Feature Configuration**
- Define plan features with custom values:
  - max_users: Maximum users allowed
  - concurrent_logins: Max simultaneous sessions
  - storage_gb: Storage quota
  - api_rate_limit: API request limits
  - support_level: Support tier (basic, standard, premium)
  - Custom features as needed

### 4. **Subscription Tracking**
- Track active subscriptions per tenant
- Monitor subscription status (active, trial, suspended, expired, cancelled)
- Store feature overrides for individual tenants
- Track usage (active users count, enabled modules)
- Support trial periods with automatic conversion

### 5. **Access Control**
- Enforce module access based on subscription
- Limit user creation based on plan limits
- Validate feature availability before usage
- Support feature overrides for specific tenants

## Database Schema

### Tables

#### `plans`
Core plan configuration table.

```sql
- id: Primary key
- name: Plan name (unique)
- description: Plan description
- price: Price amount
- duration: Duration value
- durationtype: Duration unit (day, week, month, year)
- billing_cycle: Billing frequency (monthly, yearly, one-time)
- trial_days: Free trial days (0 = no trial)
- max_users: Max users allowed (-1 = unlimited)
- is_active: Availability status
- is_popular: Marketing badge
- stripe_price_id: Stripe integration
- stripe_product_id: Stripe integration
- meta: JSON metadata
- timestamps
```

#### `plan_features`
Features and limits per plan.

```sql
- id: Primary key
- plan_id: Foreign key to plans
- name: Feature name
- slug: Feature identifier (max_users, api_rate_limit, etc)
- value: Feature value
- description: Feature description
- is_active: Availability
- timestamps
```

#### `plan_modules`
Module inclusion mapping for plans.

```sql
- id: Primary key
- plan_id: Foreign key to plans
- module_id: Foreign key to modules
- additional_price: Extra cost for this module
- is_included: Whether module is included
- description: Module description for this plan
- is_active: Status
- timestamps
```

#### `tenants` (Extended)
Added columns for plan assignment:
```sql
- plan_id: Current plan (foreign key)
- custom_module_enabled: Allow custom modules
- status: Tenant status (active, suspended, expired, cancelled)
```

#### `tenant_subscriptions` (New)
Subscription instance tracking for each tenant.

```sql
- id: Primary key
- tenant_id: Foreign key to tenants
- plan_id: Foreign key to plans
- started_at: Subscription start date
- expires_at: Subscription expiration date
- cancelled_at: Cancellation date
- status: Subscription status
- trial_days_used: Days used in trial
- active_users_count: Current active users
- enabled_modules: JSON array of module IDs
- feature_overrides: JSON object with custom feature values
- billing_cycle: Billing frequency
- price_at_subscription: Locked-in price
- stripe_subscription_id: Stripe subscription ID
- renewal_status: Renewal outcome (upcoming, success, failed)
- next_billing_date: Next billing date
- timestamps
```

#### `tenant_plan_features` (New)
Feature value overrides per tenant.

```sql
- id: Primary key
- tenant_id: Foreign key to tenants
- plan_feature_id: Foreign key to plan_features
- value: Overridden value
- is_overridden: Whether this is customized
- override_reason: Reason for override
- timestamps
```

## API Endpoints

### Admin Plan Management (Super Admin Only)

All endpoints require `auth:api` and `role:Super Admin` middleware.

#### Plan CRUD
```
GET    /api/admin/plans                      # List plans (paginated)
POST   /api/admin/plans                      # Create new plan
GET    /api/admin/plans/{id}                 # Get plan details
PUT    /api/admin/plans/{id}                 # Update plan
DELETE /api/admin/plans/{id}                 # Delete plan
```

#### Plan Features
```
POST   /api/admin/plans/{id}/features                  # Add feature
PUT    /api/admin/plans/{id}/features/{featureId}     # Update feature
DELETE /api/admin/plans/{id}/features/{featureId}     # Delete feature
```

#### Plan Modules
```
POST   /api/admin/plans/{id}/modules                  # Add module to plan
PUT    /api/admin/plans/{id}/modules/{moduleId}       # Update module config
DELETE /api/admin/plans/{id}/modules/{moduleId}       # Remove module
```

#### Helpers
```
GET    /api/admin/plans/modules/available             # Available modules
GET    /api/admin/plans/features/template             # Feature templates
```

### Registration & Public Endpoints

```
GET    /api/auth/plans/available            # Get active plans for registration
POST   /api/auth/register-with-otp           # Register with plan selection
POST   /api/auth/otp/send                    # Send OTP
POST   /api/auth/otp/verify                  # Verify OTP
```

## Models

### Plan Model
```php
// Relationships
$plan->features()        // PlanFeature models
$plan->modules()         // Module models (many-to-many)
$plan->planModules()     // PlanModule models
$plan->orders()          // Order models

// Helper Methods
$plan->getFeature(slug)                   // Get feature by slug
$plan->getFeatureValue(slug, default)     // Get feature value
$plan->getActiveFeatures()                // Get all active features
$plan->hasFeature(slug)                   // Check feature existence
$plan->includesModule(slug)               // Check module inclusion
$plan->getIncludedModules()               // Get included modules
$plan->hasTrialPeriod()                   // Check trial availability
$plan->allowsUnlimitedUsers()             // Check unlimited users
$plan->getSummary()                       // Get plan summary for display
$plan->getFormattedPrice()                // Format price
$plan->getDurationText()                  // Get human-readable duration
```

### Tenant Model (Extended)
```php
// Relationships
$tenant->plan()                   // Current plan
$tenant->activeSubscription()     // Current active subscription (has one)
$tenant->subscriptions()          // All subscriptions (has many)
$tenant->latestSubscription()     // Most recent subscription
$tenant->tenantPlanFeatures()     // Feature overrides

// Helper Methods
$tenant->getCurrentSubscription()         // Get active subscription
$tenant->hasActiveSubscription()          // Check if active
$tenant->isOnTrial()                      // Check trial status
$tenant->hasExpiredSubscription()         // Check expiration
$tenant->getSubscriptionStatus()          // Get status string
$tenant->canAddMoreUsers()                // Check user limit
$tenant->getAvailableUserSlots()          // Get available slots
$tenant->getMaxUsers()                    // Get max users
$tenant->isModuleEnabled(moduleId)        // Check module access
$tenant->getEnabledModules()              // Get enabled modules
$tenant->getFeatureValue(slug, default)   // Get feature value
$tenant->upgradePlan(plan)                // Upgrade to new plan

// Scopes
Tenant::active()                  // Active tenants
Tenant::suspended()               // Suspended tenants
Tenant::expired()                 // Expired tenants
Tenant::withActiveSubscription()  // Tenants with active subscriptions
```

### TenantSubscription Model
```php
// Relationships
$subscription->tenant()           // Associated tenant
$subscription->plan()             // Associated plan
$subscription->tenantPlanFeatures() // Feature overrides

// Status Checks
$subscription->isActive()         // Active status
$subscription->isOnTrial()        // On trial
$subscription->isExpired()        // Expired
$subscription->isCancelled()      // Cancelled
$subscription->isSuspended()      // Suspended

// Features & Limits
$subscription->getDaysRemaining()       // Days until expiration
$subscription->getTrialDaysRemaining()  // Trial days left
$subscription->getTrialProgressPercentage() // Trial progress %
$subscription->isModuleEnabled(moduleId)    // Check module
$subscription->getFeatureValue(slug, default) // Get feature value
$subscription->getMaxUsers()            // Get user limit
$subscription->canAddMoreUsers()        // Check capacity
$subscription->getAvailableUserSlots()  // Available slots

// Management
$subscription->upgradeToPlan(plan)      // Upgrade plan
$subscription->cancel()                 // Cancel subscription
$subscription->resume()                 // Resume cancelled
$subscription->suspend()                // Suspend
$subscription->markAsExpired()          // Mark expired
$subscription->incrementTrialDaysUsed() // Increment trial

// Scopes
TenantSubscription::active()            // Active subscriptions
TenantSubscription::trial()             // Trial subscriptions
TenantSubscription::expiringSoon(days)  // Expiring soon
TenantSubscription::expired()           // Expired subscriptions
```

## Middleware

### `ensure-plan-feature:{feature}`
Validates that the plan has the specified feature.

```php
Route::get('/api/reports', [...])
    ->middleware('auth:tenant-api', 'ensure-plan-feature:advanced_reporting');
```

### `enforce-user-limit`
Prevents user creation if plan limit is reached.

```php
Route::post('/api/employees', [...])
    ->middleware('auth:tenant-api', 'enforce-user-limit');
```

### `ensure-module-access:{module}`
Validates module access based on subscription.

```php
Route::group(['middleware' => ['auth:tenant-api', 'ensure-module-access:payroll']], function () {
    Route::get('/payroll/...');
    Route::post('/payroll/...');
});
```

## Usage Examples

### Creating a Plan (Admin)

```php
$plan = Plan::create([
    'name' => 'Professional',
    'description' => 'Perfect for growing teams',
    'price' => 99.99,
    'duration' => 1,
    'durationtype' => 'month',
    'billing_cycle' => 'monthly',
    'trial_days' => 14,
    'max_users' => 50,
    'is_active' => true,
    'is_popular' => true,
]);

// Add features
$plan->features()->create([
    'name' => 'Max Users',
    'slug' => 'max_users',
    'value' => '50',
    'is_active' => true,
]);

// Add modules
$plan->planModules()->create([
    'module_id' => 1,
    'is_included' => true,
]);
```

### Registering with Plan Selection

```javascript
// Frontend - Register.vue
const response = await authApi.registerWithOtp({
    email: 'user@example.com',
    code: '123456',
    password: 'secure_password',
    password_confirmation: 'secure_password',
    organization: 'Acme Corp',
    plan_id: '1',  // Select plan by ID
    selected_modules: ['module-slug-1', 'module-slug-2'],
    name: 'John Doe'
});
```

Backend creates:
1. New tenant with assigned plan
2. Tenant domain
3. Tenant subscription tracking trial/active status
4. Admin user in tenant database
5. Returns JWT token and user info

### Checking Subscription Status

```php
$tenant = Tenant::find($tenantId);
$subscription = $tenant->getCurrentSubscription();

if (!$subscription->isActive()) {
    return response()->json(['message' => 'Subscription not active'], 403);
}

// Check user limit
if (!$subscription->canAddMoreUsers()) {
    return response()->json([
        'message' => 'User limit reached',
        'limit' => $subscription->getMaxUsers(),
        'current' => $subscription->active_users_count,
    ], 422);
}

// Check module access
if (!$subscription->isModuleEnabled('payroll')) {
    return response()->json(['message' => 'Payroll module not available'], 403);
}

// Get feature value
$maxStorage = $subscription->getFeatureValue('storage_gb', 100);
```

### Trial to Active Conversion

```php
$subscription = $tenant->getCurrentSubscription();

// Check trial progress
$daysRemaining = $subscription->getTrialDaysRemaining();
$progress = $subscription->getTrialProgressPercentage();

// When trial ends (manual or automatic)
if ($subscription->isOnTrial() && $daysRemaining <= 0) {
    $subscription->incrementTrialDaysUsed();
    // If trial days >= plan trial_days, status changes to 'active'
}
```

### Upgrading Plans

```php
$tenant = Tenant::find($tenantId);
$newPlan = Plan::find($newPlanId);

$subscription = $tenant->upgradePlan($newPlan);
// Updates: plan_id, enabled_modules, pricing
```

## Frontend Integration

### Plan Selection in Registration

The registration flow now includes plan selection:

1. **Choose Step** - Enter email
2. **OTP Step** - Verify with code
3. **Confirm Step** - Enter password & name
4. **Organization Step** - Organization name & optional modules
5. **Plan Step** - Select from available plans

Plans are dynamically fetched from `/api/auth/plans/available`:

```vue
<script setup>
const plans = ref([])

onMounted(async () => {
    const res = await api.get('/auth/plans/available')
    plans.value = res.data.plans
})
</script>
```

### Admin Plan Management UI

Access at `/app/admin/plans` (Super Admin only):

- **Plans Tab**: View, create, edit, delete plans
- **Features Tab**: Manage feature templates
- **Modules Modal**: Assign modules and features to plans

## Security Considerations

1. **Authentication**: All admin endpoints require super-admin role
2. **Tenant Isolation**: Plans are global, subscriptions are per-tenant
3. **Feature Validation**: Middleware validates feature access on each request
4. **Trial Protection**: Trial conversion prevents abuse
5. **User Limits**: Hard limits prevent overuse

## Migration Instructions

To apply migrations:

```bash
cd backend
php artisan migrate
```

Migrations included:
- `2025_09_17_000001_add_plan_to_tenants_table.php`
- `2025_09_17_000002_create_tenant_subscriptions_table.php`
- `2025_09_17_000003_create_tenant_plan_features_table.php`

## Testing the System

### 1. Create Test Plans

```bash
# Using API
POST /api/admin/plans
{
    "name": "Starter",
    "description": "Up to 10 users",
    "price": 29.99,
    "duration": 1,
    "durationtype": "month",
    "billing_cycle": "monthly",
    "trial_days": 14,
    "max_users": 10,
    "is_active": true
}
```

### 2. Register with Plan

1. Go to registration page
2. Complete steps through organization
3. Select a plan
4. Complete registration
5. Check tenant_subscriptions table for active subscription

### 3. Test Access Control

Try accessing a module endpoint without proper subscription:
```bash
GET /api/payroll/cycles
# Should return 403 if payroll module not in subscription
```

## Future Enhancements

1. **Webhook Support**: Stripe payment webhooks for billing
2. **Feature Metrics**: Track usage of features per tenant
3. **Upgrade/Downgrade Workflow**: More flexible plan changes
4. **Bulk User Import**: With automatic limit validation
5. **Usage Alerts**: Warn when approaching limits
6. **Custom Plans**: Admin-created custom plans per tenant
7. **Annual Billing**: Better pricing for yearly plans
8. **Overage Support**: Allow going over limit with overage charges

## Troubleshooting

### Issue: Registration fails with plan selection
- Ensure plans exist in database with `is_active = true`
- Check `/api/auth/plans/available` returns plans
- Verify `registerWithOtp` endpoint is accessible

### Issue: Middleware not working
- Check middleware aliases in `Kernel.php`
- Verify routes have correct middleware applied
- Check subscription is active before access

### Issue: User limit not enforced
- Verify `active_users_count` is being tracked
- Check tenant subscription exists and is active
- Ensure `enforce-user-limit` middleware is applied

### Issue: Trial not converting to active
- Check `trial_days` in plan
- Verify `incrementTrialDaysUsed()` is called daily (add scheduled job)
- Check subscription expires_at date

## Support

For issues or questions about the plan system, refer to this documentation or contact the development team.
