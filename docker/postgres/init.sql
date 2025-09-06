-- Initialize role and databases for Moneyger production mode

-- Note: The official Postgres image will create the role specified by
-- POSTGRES_USER with the password from POSTGRES_PASSWORD during first init.
-- We do not create any roles here to avoid committing secrets.

-- Create databases owned by moneyger
CREATE DATABASE moneyger_production OWNER CURRENT_USER;
CREATE DATABASE moneyger_production_cache OWNER CURRENT_USER;
CREATE DATABASE moneyger_production_queue OWNER CURRENT_USER;
CREATE DATABASE moneyger_production_cable OWNER CURRENT_USER;

GRANT ALL PRIVILEGES ON DATABASE moneyger_production TO CURRENT_USER;
GRANT ALL PRIVILEGES ON DATABASE moneyger_production_cache TO CURRENT_USER;
GRANT ALL PRIVILEGES ON DATABASE moneyger_production_queue TO CURRENT_USER;
GRANT ALL PRIVILEGES ON DATABASE moneyger_production_cable TO CURRENT_USER;


