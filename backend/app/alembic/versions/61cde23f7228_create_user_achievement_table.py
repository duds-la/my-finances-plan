"""create_user_achievement_table

Revision ID: 61cde23f7228
Revises: a2f183be0502
Create Date: 2026-05-30 19:53:19.129252

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '61cde23f7228'
down_revision = 'a2f183be0502'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user_achievement",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('user.id'), nullable=False),
        sa.Column('achievement_id', sa.Integer, sa.ForeignKey('achievement.id'), nullable=False),
        sa.Column('unlocked_at', sa.DateTime, nullable=False),
    )
 
 
def downgrade():
    op.drop_table('user_achievement')