Act as a Senior QA Engineer, Test Architect, and Business Analyst.

I need to test a complete application thoroughly. Generate a full QA test suite that covers **Verification + Validation**, functional and non-functional testing, positive/negative scenarios, edge cases, UI/UX, API, database, security, performance, accessibility, compatibility, regression, and business logic.

Generate output in the following structure:

## 1. Test Strategy

* Scope
* In scope / Out of scope
* Risks
* Dependencies
* Entry / Exit Criteria
* Test Types Required

## 2. Requirement Verification Checklist

Validate whether requirements are correctly implemented:

* UI matches design
* Fields, validations, workflows
* API contracts
* Error messages
* Business rules
* Permissions / RBAC
* Data consistency
* Compliance requirements

## 3. Validation Testing (Real User Behavior)

Create scenarios proving the product meets user needs:

* End-to-end user journeys
* Ease of use
* Real-world workflows
* Error recovery
* Multi-role interaction
* Mobile behavior
* Localization behavior

## 4. Detailed Test Cases Table

Columns:
Test Case ID | Module | Scenario | Preconditions | Steps | Test Data | Expected Result | Priority | Severity | Type

Include:

* Positive cases
* Negative cases
* Boundary value analysis
* Equivalence partitioning
* State transition testing
* Decision table cases
* Exploratory scenarios

## 5. Module-wise Coverage

For each module generate complete scenarios:

## Below Refrences but do as per project modules
### Authentication

* Registration
* Login
* Logout
* Forgot password
* MFA / OTP
* Session timeout
* Account lock
* Social login

### Dashboard

* Widgets
* Filters
* Navigation
* Permissions
* Data accuracy

### CRUD Modules

* Create / Read / Update / Delete
* Search / Sort / Filter
* Pagination
* Bulk actions
* Import / Export

### Payments (if applicable)

* Success / Failure / Retry
* Refund
* Coupon
* Tax
* Duplicate payment prevention

### Notifications

* Email / SMS / Push / In-app

### Reports

* Accuracy
* Export
* Large data handling

### Settings

* Profile
* Preferences
* Security settings

## 6. Non-Functional Testing

* Performance
* Load
* Stress
* Scalability
* Security (OWASP Top 10)
* Accessibility (WCAG)
* Usability
* Reliability
* Recovery testing

## 7. API Testing

For each API:

* Method
* Auth
* Request validation
* Response validation
* Error codes
* Schema validation
* Latency
* Rate limits
* Retry handling

## 8. Database Testing

* CRUD validation
* Constraints
* Indexes
* Data integrity
* Audit logs
* Soft delete
* Data migration

## 9. Browser / Device Compatibility Matrix

Generate coverage matrix.

## 10. Regression Suite

Mention must-run smoke and sanity cases for every release.

## 11. Automation Candidate Cases

Identify which test cases should be automated first.

## 12. Risk Based Priority Matrix

High risk modules first.

## 13. Defect Reporting Format

Bug Title | Steps | Actual | Expected | Severity | Priority | Root Cause Suspected

## 14. Final Traceability Matrix

Requirement ID mapped to test cases.

Important Instructions:

* Do not miss any module.
* Think like a real QA doing production-grade testing.
* Include hidden edge cases.
* Include security abuse scenarios.
* Include mobile/responsive cases.
* Include admin vs user role scenarios.
* Include data validation cases.
* Include concurrency/multiple user scenarios.
* Include flaky network/offline scenarios.
* Include screenshots/log recommendations where useful.
* Output should be detailed and practical.
























Steps to Reproduce:

Open the application: http://localhost:8080/login

Log in with valid credentials.

Navigate to Users > User Invitation and click the + (Plus) icon.

Click on the User Type dropdown.

Select "CSR" from the list.

Observe the form for the appearance of the "Tenant" and "Role" fields.

 

Actual Result: The form does not update. The Tenant and Role fields remain hidden, and the layout stays the same as it was for other user types.

 

Expected Result: Upon selecting "CSR", the form should dynamically display the Tenant and Role dropdown fields below the User Type, matching the Vue 2 baseline behavior.