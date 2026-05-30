"""create_financial_goal_table

Revision ID: 499952b7677a
Revises: dbce3fad0b1c
Create Date: 2026-05-30 19:52:56.950432

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '499952b7677a'
down_revision = 'dbce3fad0b1c'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "financial_goal",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('user.id'), nullable=False),
        sa.Column('title', sa.VARCHAR(120), nullable=False),
        sa.Column('target_value', sa.NUMERIC(10, 2), nullable=False),
        sa.Column('current_value', sa.NUMERIC(10, 2), nullable=False, server_default='0'),
        sa.Column('deadline', sa.Date, nullable=True),
        sa.Column('status', sa.VARCHAR(30), nullable=False, server_default='em_andamento'),
        sa.Column('suggested_contribution', sa.NUMERIC(10, 2), nullable=True),
    )
 
 
def downgrade():
    op.drop_table('financial_goal')
 