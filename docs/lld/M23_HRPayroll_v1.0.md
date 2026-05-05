# ULP M23: HR & Payroll LLD

**Version:** 1.0 · **Status:** Drafted · **Phase:** 4

**Sources:** HLD §9.2 (Tier-B with country plugins) · DBD §4 — **M23 = 21 tables, +country_code; payroll plugins** · M20 (US Payroll plugin) · IN payroll: PF/ESI/TDS/Form 24Q/Form 16

> Tier-B core. India payroll specifics + US payroll specifics live in plugins. Core covers employee master, attendance, leave, payslip, performance, HR ops.

## 1. Database — 21 tables (matches DBD §4)
```sql
-- Employee master + structure
CREATE TABLE m23_employee          (id, tenant_id, country_code CHAR(2), employee_code, party_id BIGINT, status ENUM('Active','OnLeave','Suspended','Resigned','Terminated'), hire_date, termination_date, …);
CREATE TABLE m23_department        (id, tenant_id, code, name, parent_department_id, manager_employee_id);
CREATE TABLE m23_designation       (id, tenant_id, code, name, level, salary_band_min, salary_band_max, currency);
CREATE TABLE m23_reporting_line    (employee_id, manager_employee_id, effective_from, effective_to, PRIMARY KEY (employee_id, effective_from));

-- Attendance + leave
CREATE TABLE m23_shift             (id, tenant_id, code, name, start_time, end_time, days_of_week);
CREATE TABLE m23_attendance        (id, tenant_id, employee_id, attendance_date, shift_id, in_time, out_time, hours_worked, source ENUM('BIOMETRIC','MANUAL','GEO_FENCE'), status ENUM('Present','Absent','HalfDay','Leave','Holiday','WeekOff'));
CREATE TABLE m23_leave_type        (id, tenant_id, country_code CHAR(2), code, name, paid TINYINT, accrual_per_year DECIMAL(5,2), max_carry_forward DECIMAL(5,2));
CREATE TABLE m23_leave_balance     (id, tenant_id, employee_id, leave_type_id, balance_days, year);
CREATE TABLE m23_leave_application (id, tenant_id, employee_id, leave_type_id, from_date, to_date, days, status ENUM('Pending','Approved','Rejected','Cancelled'), approved_by);
CREATE TABLE m23_holiday_calendar  (id, tenant_id, country_code CHAR(2), state_code, holiday_date, name); -- mirrors m1_holiday but per tenant

-- Payroll
CREATE TABLE m23_pay_component     (id, tenant_id, country_code CHAR(2), code, name, component_type ENUM('Earning','Deduction','Reimbursement'), is_taxable, formula_json, statutory_code);
CREATE TABLE m23_salary_structure  (id, tenant_id, employee_id, effective_from, effective_to, gross_amount, currency);
CREATE TABLE m23_salary_component  (id, salary_structure_id, pay_component_id, amount, currency);
CREATE TABLE m23_payroll_run       (id, tenant_id, country_code CHAR(2), run_number, period_year, period_month, status ENUM('Draft','Processing','Approved','Posted','Reversed'));
CREATE TABLE m23_payslip           (id, payroll_run_id, employee_id, gross_amount, gross_currency, net_amount, net_currency, document_id);
CREATE TABLE m23_payslip_component (id, payslip_id, pay_component_id, amount, currency);
CREATE TABLE m23_statutory_filing  (id, tenant_id, country_code CHAR(2), filing_type, period, status, document_id, filed_at_utc); -- IN: PF, ESI, TDS Form 24Q; US flows via M20

-- Performance + others
CREATE TABLE m23_performance_review (id, tenant_id, employee_id, period_start, period_end, rating, reviewer_employee_id, review_doc_id);
CREATE TABLE m23_goal              (id, tenant_id, employee_id, period, description, target, achievement, weight_pct);
CREATE TABLE m23_separation        (id, tenant_id, employee_id, separation_type ENUM('Resignation','Termination','Retirement'), notice_date, last_working_date, exit_interview_doc_id, full_final_settled TINYINT);
CREATE TABLE m23_audit             (id, tenant_id, entity_type, entity_id, action, performed_by, performed_at_utc, details);
```

**Total: 21 tables** ✅ matches DBD §4.

## 2. Sign-off
| 1.0 | 2026-05-XX | Initial draft. 21 tables matching DBD §4. |
