"""update log_transaction table

Revision ID: 89f64823fac4
Revises: 09d7ed6a4be7
Create Date: 2026-02-10 23:34:57.359632

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '89f64823fac4'
down_revision = '09d7ed6a4be7'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_column('log_transaction', 'description'),
    op.add_column('log_transaction', sa.Column('log_date', sa.DATE(), nullable=False))


def downgrade():
    pass
