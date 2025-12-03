# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

"""Add tc columns

Revision ID: ad2ba130a4af
Revises: x2s8ocx6rto6
Create Date: 2025-11-13 11:11:40.581865
"""

from alembic import op
import sqlalchemy as sa


# Alembic identifiers
revision = "ad2ba130a4af"
down_revision = "a9c01ec10479"


# ----------------------
# DB-safe helper methods
# ----------------------

def column_exists(connection, table, column):
    """Check if a column exists (SQLite + MySQL + Postgres compatible)."""
    dialect = connection.engine.name

    # SQLite
    if dialect == "sqlite":
        res = connection.execute(f"PRAGMA table_info({table});").fetchall()
        cols = [r[1] for r in res]     # name is 2nd index
        return column in cols

    # MySQL / Postgres
    query = sa.text("""
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = :table
          AND COLUMN_NAME = :column
    """)
    result = connection.execute(query, {"table": table, "column": column})
    return result.scalar() > 0


def constraint_exists(connection, table, constraint):
    """Check if a constraint exists (NOT supported in SQLite)."""
    dialect = connection.engine.name

    # SQLite does not maintain named constraints → skip
    if dialect == "sqlite":
        return False

    query = sa.text("""
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_NAME = :table
          AND CONSTRAINT_NAME = :constraint
    """)
    result = connection.execute(query, {"table": table, "constraint": constraint})
    return result.scalar() > 0


# ----------------------
# Upgrade (Apply changes)
# ----------------------

def upgrade():
    conn = op.get_bind()
    dialect = conn.engine.name

    # Add tc_company_id
    if not column_exists(conn, "ab_user", "tc_company_id"):
        op.add_column(
            "ab_user",
            sa.Column("tc_company_id", sa.String(64), nullable=True),
        )

    # Add tc_user_id
    if not column_exists(conn, "ab_user", "tc_user_id"):
        op.add_column(
            "ab_user",
            sa.Column("tc_user_id", sa.String(64), nullable=True),
        )

    # Add unique constraint (skip for SQLite)
    if dialect != "sqlite":
        if not constraint_exists(conn, "ab_user", "uq_ab_user_tc_user_id"):
            op.create_unique_constraint(
                "uq_ab_user_tc_user_id",
                "ab_user",
                ["tc_user_id"],
            )


# ------------------------
# Downgrade (Rollback)
# ------------------------

def downgrade():
    conn = op.get_bind()
    dialect = conn.engine.name

    # Drop unique constraint only if not SQLite
    if dialect != "sqlite":
        if constraint_exists(conn, "ab_user", "uq_ab_user_tc_user_id"):
            op.drop_constraint(
                "uq_ab_user_tc_user_id",
                "ab_user",
                type_="unique",
            )

    # Drop tc_user_id
    if column_exists(conn, "ab_user", "tc_user_id"):
        op.drop_column("ab_user", "tc_user_id")

    # Drop tc_company_id
    if column_exists(conn, "ab_user", "tc_company_id"):
        op.drop_column("ab_user", "tc_company_id")
