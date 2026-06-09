"""add_guest_access_and_is_guest_to_user

Revision ID: 5facc2354112
Revises: 72c33fac2d4f
Create Date: 2026-06-09 01:00:57.397147

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '5facc2354112'
down_revision = '72c33fac2d4f'
branch_labels = None
depends_on = None


def upgrade():
    # ── user: is_guest ────────────────────────────────────────────────────
    op.add_column('user',
        sa.Column('is_guest', sa.Boolean(), nullable=False, server_default='false'))
 
    # ── guest_access ──────────────────────────────────────────────────────
    op.create_table(
        'guest_access',
        sa.Column('id',       sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('user.id', ondelete='CASCADE'), nullable=False),
        sa.Column('guest_id', sa.Integer(), sa.ForeignKey('user.id', ondelete='CASCADE'), nullable=False),
        sa.Column('allowed_modules',       postgresql.JSON(), nullable=False, server_default='[]'),
        sa.Column('shared_goal_ids',       postgresql.JSON(), nullable=False, server_default='[]'),
        sa.Column('shared_investment_ids', postgresql.JSON(), nullable=False, server_default='[]'),
        sa.Column('is_active',  sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_guest_access_owner_id', 'guest_access', ['owner_id'])
    op.create_index('ix_guest_access_guest_id', 'guest_access', ['guest_id'])
 
 
def downgrade():
    op.drop_table('guest_access')
    op.drop_column('user', 'is_guest')
