"""create transaction_category table

Revision ID: c0ba328dcc96
Revises: 4a4e3cdb0346
Create Date: 2026-02-03 23:20:08.486690

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'c0ba328dcc96'
down_revision = '4a4e3cdb0346'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "transaction_category",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('acronym', sa.CHAR(4), nullable=False),
        sa.Column('description', sa.VARCHAR(120), nullable=True),

    )


def downgrade():
    op.drop_table('transaction_category')
