@echo off
REM Push migrations to Supabase Cloud

set PGPASSWORD=AbvxHKk8DQMK44u3
set PGHOST=db.fjgwenrebdwssquebfay.supabase.co
set PGPORT=5432
set PGUSER=postgres
set PGDATABASE=postgres

echo Running migrations...

for %%f in (supabase\migrations\*.sql) do (
    echo Running %%f...
    psql -f %%f || echo ERROR in %%f
)

echo Done!
pause