"""create_balance_projection_table

Revision ID: 98109f71394b
Revises: 450c69315e12
Create Date: 2026-05-30 20:07:37.298505

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision = '98109f71394b'
down_revision = '450c69315e12'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "balance_projection",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('user.id'), nullable=False),
        sa.Column('period_days', sa.Integer, nullable=False),
        sa.Column('current_balance', sa.NUMERIC(10, 2), nullable=False),
        sa.Column('projected_balance', sa.NUMERIC(10, 2), nullable=False),
        sa.Column('expected_inflows', JSON, nullable=True),
        sa.Column('expected_outflows', JSON, nullable=True),
        sa.Column('generated_at', sa.DateTime, nullable=False),
    )
 
 
def downgrade():
    op.drop_table('balance_projection')
