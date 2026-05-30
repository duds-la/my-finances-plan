"""create_achievement_table

Revision ID: a2f183be0502
Revises: d96563556a9f
Create Date: 2026-05-30 19:53:12.659160

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'a2f183be0502'
down_revision = 'd96563556a9f'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "achievement",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('code', sa.VARCHAR(30), nullable=False, unique=True),
        sa.Column('title', sa.VARCHAR(80), nullable=False),
        sa.Column('description', sa.VARCHAR(255), nullable=True),
        sa.Column('icon', sa.VARCHAR(80), nullable=True),
        sa.Column('points', sa.Integer, nullable=False, server_default='0'),
    )
 
 
def downgrade():
    op.drop_table('achievement')