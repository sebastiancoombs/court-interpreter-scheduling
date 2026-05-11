"""
Generate the bcgov schema as a single SQL script directly from SQLAlchemy
ORM models — bypasses the brittle alembic migration chain entirely.

Output: writes CREATE TABLE statements to stdout in dependency order so
the script can be piped into a Supabase migration file.

Usage:
    python scripts/dump_schema.py > ../supabase/migrations/<timestamp>_bcgov_schema.sql
"""
import sys

# Import every model module so SQLAlchemy registers the tables on
# DeclarativeBase.metadata. Add new bcgov models here when they appear.
import models.role_model
import models.user_model
import models.court_location_model
import models.language_model
import models.interpreter_model
import models.rate_model
import models.booking_model
import models.pdf_model
import models.geo_status_model
import models.oidc_model

from sqlalchemy.schema import CreateTable, CreateIndex
from core.multi_database_middleware import DeclarativeBase

print("-- Auto-generated from bcgov SQLAlchemy ORM models.", file=sys.stderr)
print(f"-- {len(DeclarativeBase.metadata.tables)} tables", file=sys.stderr)

print("-- Auto-generated from bcgov SQLAlchemy ORM models. Do not edit by hand;")
print("-- regenerate via `python api/scripts/dump_schema.py`.")
print()

# Emit CREATE TABLE in dependency order; SQLAlchemy figures out FK ordering.
for table in DeclarativeBase.metadata.sorted_tables:
    print(f"-- Table: {table.name}")
    print(str(CreateTable(table).compile()).strip() + ";")
    print()

# Emit CREATE INDEX after all tables exist.
for table in DeclarativeBase.metadata.sorted_tables:
    for index in table.indexes:
        print(str(CreateIndex(index).compile()).strip() + ";")
