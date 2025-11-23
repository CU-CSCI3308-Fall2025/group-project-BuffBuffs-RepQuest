#!/bin/bash

# DO NOT PUSH THIS FILE TO GITHUB
# This file contains sensitive information and should be kept private

# TODO: Set your PostgreSQL URI - Use the External Database URL from the Render dashboard
PG_URI="postgresql://users_db_8gyr_user:5avJX011heXz0FUzQVzRBKFvSro2Jaa3@dpg-d4hlssh5pdvs739ase5g-a.oregon-postgres.render.com/users_db_8gyr"

# Execute each .sql file in the directory
for file in ProjectSourceCode/src/init_data/*.sql; do
    echo "Executing $file..."
    psql "$PG_URI" -f "$file"
done
