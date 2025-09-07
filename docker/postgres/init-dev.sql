-- Initialize role and databases for Moneyger development mode

-- Create development database owned by moneyger
CREATE DATABASE moneyger_development OWNER CURRENT_USER;
CREATE DATABASE moneyger_test OWNER CURRENT_USER;

GRANT ALL PRIVILEGES ON DATABASE moneyger_development TO CURRENT_USER;
GRANT ALL PRIVILEGES ON DATABASE moneyger_test TO CURRENT_USER;
