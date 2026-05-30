"""create_goal_contribution_table

Revision ID: 41a2dab75e45
Revises: 499952b7677a
Create Date: 2026-05-30 19:53:02.326205

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '41a2dab75e45'
down_revision = '499952b7677a'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "goal_contribution",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('goal_id', sa.Integer, sa.ForeignKey('financial_goal.id'), nullable=False),
        sa.Column('transaction_id', sa.Integer, sa.ForeignKey('transaction.id'), nullable=True),
        sa.Column('value', sa.NUMERIC(10, 2), nullable=False),
        sa.Column('contribution_date', sa.DateTime, nullable=False),
    )
 
 
def downgrade():
    op.drop_table('goal_contribution')
 
