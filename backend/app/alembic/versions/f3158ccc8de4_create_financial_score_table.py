"""create_financial_score_table

Revision ID: f3158ccc8de4
Revises: 61cde23f7228
Create Date: 2026-05-30 20:07:24.881167

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision = 'f3158ccc8de4'
down_revision = '61cde23f7228'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "financial_score",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('user.id'), nullable=False),
        sa.Column('month', sa.Integer, nullable=False),
        sa.Column('year', sa.Integer, nullable=False),
        sa.Column('score', sa.NUMERIC(5, 2), nullable=False),
        sa.Column('expense_income_ratio', sa.NUMERIC(5, 4), nullable=True),
        sa.Column('emergency_reserve', sa.NUMERIC(10, 2), nullable=True),
        sa.Column('components', JSON, nullable=True),
        sa.Column('calculated_at', sa.DateTime, nullable=False),
    )
 
 
def downgrade():
    op.drop_table('financial_score')