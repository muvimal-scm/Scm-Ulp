-- =====================================================================
-- ULP local MySQL initialisation
-- Runs once on first MySQL container boot (mysql_data volume empty).
-- Ensures the conventions in ULP_DBD_v2.0_DatabaseDesign.docx are met.
-- =====================================================================

-- Primary dev database (matches MYSQL_DATABASE in .env)
CREATE DATABASE IF NOT EXISTS ulp_dev
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

-- Test DB used by integration tests so they don't clobber dev data
CREATE DATABASE IF NOT EXISTS ulp_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

-- Keycloak runs against Postgres in this stack, so no Keycloak DB here.

-- Grant ulp user access to both databases
GRANT ALL PRIVILEGES ON ulp_dev.*  TO 'ulp'@'%';
GRANT ALL PRIVILEGES ON ulp_test.* TO 'ulp'@'%';
FLUSH PRIVILEGES;

-- Sanity check: MySQL session must be UTC for ULP DateTime conventions
SET GLOBAL time_zone = '+00:00';
