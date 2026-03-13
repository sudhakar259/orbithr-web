# Payroll Module Setup Guide

## Prerequisites
- Laravel 10+ installed
- PHP 8.1+
- Composer
- MySQL/PostgreSQL database
- Multi-tenancy (Stancl/Tenancy) configured
- Spatie Permission package installed
- JWT authentication configured

## Installation Steps

### Step 1: Install Required Packages

```bash
cd backend
composer require barryvdh/laravel-dompdf
```

### Step 2: Publish DomPDF Configuration (Optional)

```bash
php artisan vendor:publish --provider="Barryvdh\DomPDF\ServiceProvider"
```

### Step 3: Run Migrations

```bash
# Run payroll migrations
php artisan migrate

# If you need to run specific migrations:
php artisan migrate --path=/database/migrations/2025_01_15_000001_create_payroll_settings_table.php
php artisan migrate --path=/database/migrations/2025_01_15_000002_create_salary_structures_table.php
php artisan migrate --path=/database/migrations/2025_01_15_000003_create_payroll_cycles_table.php
php artisan migrate --path=/database/migrations/2025_01_15_000004_create_payroll_items_table.php
php artisan migrate --path=/database/migrations/2025_01_15_000005_create_salary_advances_table.php
php artisan migrate --path=/database/migrations/2025_01_15_000006_create_salary_deposits_table.php
php artisan migrate --path=/database/migrations/2025_01_15_000007_create_payslips_table.php
```

### Step 4: Run Seeders

```bash
# Seed payroll permissions
php artisan db:seed --class=PayrollPermissionsSeeder

# Seed default payroll settings for all tenants
php artisan db:seed --class=PayrollSettingsSeeder
```

### Step 5: Clear Cache

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```

### Step 6: Create Storage Directories

```bash
# Create directories for payslips and bank transfer files
mkdir -p storage/app/payslips
mkdir -p storage/app/bank_transfers
chmod -R 775 storage/app/payslips
chmod -R 775 storage/app/bank_transfers
```

### Step 7: Configure Environment (Optional)

Add to your `.env` file if needed:

```env
# Payroll Configuration
PAYROLL_DEFAULT_CURRENCY=USD
PAYROLL_DEFAULT_CURRENCY_SYMBOL=$
PAYROLL_AUTO_GENERATE_PAYSLIPS=true

# PDF Configuration
DOMPDF_ENABLE_REMOTE=true
DOMPDF_ENABLE_CSS_FLOAT=true
```

## Verification

### Test Database Tables

```bash
php artisan tinker
```

```php
// Check if tables exist
DB::table('payroll_settings')->count();
DB::table('salary_structures')->count();
DB::table('payroll_cycles')->count();
DB::table('payroll_items')->count();
DB::table('salary_advances')->count();
DB::table('salary_deposits')->count();
DB::table('payslips')->count();
```

### Test Permissions

```php
// Check if permissions are created
use Spatie\Permission\Models\Permission;
Permission::where('name', 'like', '%payroll%')->get();
Permission::where('name', 'like', '%advance%')->get();
Permission::where('name', 'like', '%payslip%')->get();
```

### Test Policies

```php
// Check if policies are registered
use App\Models\PayrollCycle;
use App\Models\SalaryAdvance;
use App\Models\Payslip;

Gate::getPolicyFor(PayrollCycle::class);
Gate::getPolicyFor(SalaryAdvance::class);
Gate::getPolicyFor(Payslip::class);
```

## API Endpoints

### Payroll Management

```
GET    /api/payroll/settings                    - Get payroll settings
PUT    /api/payroll/settings                    - Update payroll settings
GET    /api/payroll/cycles                      - List payroll cycles
POST   /api/payroll/cycles                      - Create payroll cycle
GET    /api/payroll/cycles/{id}                 - Get payroll cycle
DELETE /api/payroll/cycles/{id}                 - Delete payroll cycle
POST   /api/payroll/cycles/{id}/process         - Process payroll
POST   /api/payroll/cycles/{id}/approve         - Approve payroll
POST   /api/payroll/cycles/{id}/mark-paid       - Mark as paid
GET    /api/payroll/cycles/{id}/items           - Get payroll items
GET    /api/payroll/salary-structures           - List salary structures
POST   /api/payroll/salary-structures           - Create salary structure
PUT    /api/payroll/salary-structures/{id}      - Update salary structure
DELETE /api/payroll/salary-structures/{id}      - Delete salary structure
GET    /api/payroll/dashboard/stats             - Get dashboard stats
```

### Salary Advances

```
GET    /api/advances                            - List advances
POST   /api/advances                            - Request advance
GET    /api/advances/{id}                       - Get advance
PUT    /api/advances/{id}                       - Update advance
DELETE /api/advances/{id}                       - Delete advance
POST   /api/advances/{id}/approve               - Approve advance
POST   /api/advances/{id}/reject                - Reject advance
POST   /api/advances/{id}/disburse              - Disburse advance
POST   /api/advances/{id}/cancel                - Cancel advance
GET    /api/advances/{id}/deductions            - Get deduction history
GET    /api/advances/statistics/summary         - Get statistics
```

### Payslips

```
GET    /api/payslips                            - List payslips
GET    /api/payslips/{id}                       - Get payslip
POST   /api/payslips/generate                   - Generate payslip
POST   /api/payslips/cycles/{id}/generate       - Generate for cycle
GET    /api/payslips/{id}/download              - Download PDF
GET    /api/payslips/{id}/view                  - View PDF
POST   /api/payslips/{id}/regenerate            - Regenerate payslip
POST   /api/payslips/{id}/email                 - Email payslip
POST   /api/payslips/cycles/{id}/bulk-email     - Bulk email
DELETE /api/payslips/{id}                       - Delete payslip
GET    /api/payslips/cycles/{id}/bank-transfer  - Export bank transfer
GET    /api/payslips/statistics/summary         - Get statistics
```

## Testing the Implementation

### 1. Create a Salary Structure

```bash
curl -X POST http://your-domain/api/payroll/salary-structures \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": 1,
    "basic_salary": 50000,
    "hra": 10000,
    "transport_allowance": 2000,
    "payment_frequency": "monthly",
    "payment_method": "bank_transfer",
    "effective_from": "2025-01-01",
    "status": "active"
  }'
```

### 2. Create a Payroll Cycle

```bash
curl -X POST http://your-domain/api/payroll/cycles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "frequency": "monthly",
    "period_start": "2025-01-01",
    "period_end": "2025-01-31",
    "payment_date": "2025-02-01"
  }'
```

### 3. Process Payroll

```bash
curl -X POST http://your-domain/api/payroll/cycles/1/process \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "attendance_data": {
      "1": {
        "working_days": 22,
        "present_days": 20,
        "absent_days": 2,
        "overtime_hours": 5
      }
    }
  }'
```

### 4. Request Salary Advance

```bash
curl -X POST http://your-domain/api/advances \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": 1,
    "amount": 10000,
    "reason": "Medical emergency",
    "installments": 3
  }'
```

### 5. Generate Payslips

```bash
curl -X POST http://your-domain/api/payslips/cycles/1/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Issue: Migrations fail

**Solution:**
```bash
# Check database connection
php artisan migrate:status

# Rollback and retry
php artisan migrate:rollback
php artisan migrate
```

### Issue: Permissions not working

**Solution:**
```bash
# Clear permission cache
php artisan permission:cache-reset

# Re-run seeder
php artisan db:seed --class=PayrollPermissionsSeeder
```

### Issue: PDF generation fails

**Solution:**
```bash
# Install required PHP extensions
# For Ubuntu/Debian:
sudo apt-get install php-gd php-mbstring

# Clear config cache
php artisan config:clear

# Check storage permissions
chmod -R 775 storage/
```

### Issue: Policies not working

**Solution:**
```bash
# Clear cache
php artisan cache:clear
php artisan config:clear

# Verify policies are registered
php artisan tinker
Gate::getPolicyFor(App\Models\PayrollCycle::class);
```

## Role-Based Access

### Admin
- Full access to all payroll features
- Can create, edit, delete payroll cycles
- Can process and approve payroll
- Can manage salary structures
- Can approve/reject advances
- Can generate and email payslips

### HR Manager
- Most access except deletion
- Can create and edit payroll cycles
- Can process and approve payroll
- Can manage salary structures
- Can approve/reject advances
- Can generate and email payslips

### Manager
- View-only access
- Can view payroll cycles and items
- Can view salary structures
- Can view advances
- Can view and download payslips

### Employee
- Self-service only
- Can view own payslips
- Can download own payslips
- Can request salary advances
- Can view own advances
- Can cancel own pending advances

## Next Steps

1. **Frontend Implementation**: Create Vue.js components for the payroll UI
2. **Email Configuration**: Set up email templates for payslip delivery
3. **Attendance Integration**: Connect with attendance module
4. **Reports**: Create additional payroll reports
5. **Compliance**: Add tax calculation rules based on your region
6. **Bank Integration**: Add direct bank transfer integration

## Support

For issues or questions:
1. Check the PAYROLL_IMPLEMENTATION_SUMMARY.md for detailed documentation
2. Review the code comments in models, services, and controllers
3. Check Laravel logs: `storage/logs/laravel.log`
4. Enable debug mode in `.env`: `APP_DEBUG=true`

## Security Considerations

1. **Multi-tenancy**: All queries are tenant-scoped
2. **Authorization**: Policies enforce role-based access
3. **Validation**: All inputs are validated
4. **Audit Trail**: All actions are logged with user IDs
5. **PDF Security**: Payslips are stored in private storage
6. **JWT Authentication**: All endpoints require valid JWT tokens

## Performance Optimization

1. **Eager Loading**: Relationships are eager-loaded to prevent N+1 queries
2. **Indexes**: Database indexes on tenant_id, status, dates
3. **Caching**: Consider caching payroll settings
4. **Queue Jobs**: For bulk operations, consider using Laravel queues
5. **Pagination**: All list endpoints support pagination

## Maintenance

### Regular Tasks
- Backup payslip PDFs regularly
- Archive old payroll cycles
- Clean up cancelled advances
- Monitor storage usage
- Review and update tax rates

### Monthly Tasks
- Generate payroll reports
- Verify bank transfer files
- Audit payroll processing
- Update salary structures as needed

## Conclusion

Your payroll module is now ready to use! Follow the testing steps to verify everything works correctly, then proceed with the frontend implementation.
