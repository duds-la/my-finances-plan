"""update user table - additing password

Revision ID: 5e78bb71bc22
Revises: 89f64823fac4
Create Date: 2026-02-21 17:22:49.805262

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '5e78bb71bc22'
down_revision = '89f64823fac4'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user', sa.Column('password', sa.VARCHAR(255), nullable=False))


def downgrade():
    op.drop_column('user', 'password'),

