"""create_investment_type_table

Revision ID: 53ef001f776c
Revises: 8cc27ca659a5
Create Date: 2026-05-30 17:48:48.517567

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '53ef001f776c'
down_revision = '8cc27ca659a5'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "investment_type",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('acronym', sa.VARCHAR(10), nullable=False),
        sa.Column('description', sa.VARCHAR(120), nullable=True),
        sa.Column('daily_liquidity', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('fixed_income', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('ir_discount', sa.NUMERIC(5, 2), nullable=True),
    )
 
 
def downgrade():
    op.drop_table('investment_type')
 
