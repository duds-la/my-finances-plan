"""create_simulation_table

Revision ID: d96563556a9f
Revises: 41a2dab75e45
Create Date: 2026-05-30 19:53:07.224600

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision = 'd96563556a9f'
down_revision = '41a2dab75e45'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "simulation",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('user.id'), nullable=False),
        sa.Column('simulation_type', sa.VARCHAR(60), nullable=False),
        sa.Column('parameters', JSON, nullable=False),
        sa.Column('result', JSON, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
 
 
def downgrade():
    op.drop_table('simulation')