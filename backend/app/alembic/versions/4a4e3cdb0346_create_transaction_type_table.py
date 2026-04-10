"""create transaction_type table

Revision ID: 4a4e3cdb0346
Revises: 355c0e845206
Create Date: 2026-01-30 00:15:26.972210

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '4a4e3cdb0346'
down_revision = '355c0e845206'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "transaction_type",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('description', sa.VARCHAR(120), nullable=False)
    )


def downgrade():
    op.drop_table('transaction_type')
    
