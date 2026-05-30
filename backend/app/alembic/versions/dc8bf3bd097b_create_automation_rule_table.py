"""create_automation_rule_table

Revision ID: dc8bf3bd097b
Revises: bfaa8d6b05c5
Create Date: 2026-05-30 20:07:48.794999

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'dc8bf3bd097b'
down_revision = 'bfaa8d6b05c5'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "automation_rule",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('user.id'), nullable=False),
        sa.Column('trigger', sa.VARCHAR(120), nullable=False),
        sa.Column('condition', sa.VARCHAR(255), nullable=True),
        sa.Column('action', sa.VARCHAR(255), nullable=False),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('last_execution', sa.DateTime, nullable=True),
    )
 
 
def downgrade():
    op.drop_table('automation_rule')
