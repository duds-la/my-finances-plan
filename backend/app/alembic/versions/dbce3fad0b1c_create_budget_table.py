"""create_budget_table

Revision ID: dbce3fad0b1c
Revises: 71016e53792a
Create Date: 2026-05-30 19:52:51.051340

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'dbce3fad0b1c'
down_revision = '71016e53792a'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "budget",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('user.id'), nullable=False),
        sa.Column('category_id', sa.Integer, sa.ForeignKey('transaction_category.id'), nullable=False),
        sa.Column('month', sa.Integer, nullable=False),
        sa.Column('year', sa.Integer, nullable=False),
        sa.Column('limit_value', sa.NUMERIC(10, 2), nullable=False),
        sa.Column('current_spent', sa.NUMERIC(10, 2), nullable=False, server_default='0'),
        sa.Column('consumed_percentage', sa.NUMERIC(5, 2), nullable=False, server_default='0'),
    )
 
 
def downgrade():
    op.drop_table('budget')