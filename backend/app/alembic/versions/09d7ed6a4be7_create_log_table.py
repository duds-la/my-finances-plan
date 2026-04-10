"""create log table

Revision ID: 09d7ed6a4be7
Revises: 193824428816
Create Date: 2026-02-05 23:17:57.873518

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '09d7ed6a4be7'
down_revision = '193824428816'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "log_transaction",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('transaction_id', sa.Integer, sa.ForeignKey('transaction.id'), nullable=False),
        sa.Column('description', sa.DATE(), nullable=False)

    )


def downgrade():
    op.drop_table('log_transaction')
