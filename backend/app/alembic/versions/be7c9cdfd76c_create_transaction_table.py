"""create transaction table

Revision ID: be7c9cdfd76c
Revises: c0ba328dcc96
Create Date: 2026-02-03 23:30:07.551145

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'be7c9cdfd76c'
down_revision = 'c0ba328dcc96'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "transaction",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('transaction_date', sa.DATE(), nullable=False),
        sa.Column('transaction_value', sa.NUMERIC(10,2), nullable=False),
    )


def downgrade():
    op.drop_table('transaction')
