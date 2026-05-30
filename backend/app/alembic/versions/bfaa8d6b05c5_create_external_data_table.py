"""create_external_data_table

Revision ID: bfaa8d6b05c5
Revises: 98109f71394b
Create Date: 2026-05-30 20:07:43.145220

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'bfaa8d6b05c5'
down_revision = '98109f71394b'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "external_data",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('source', sa.VARCHAR(80), nullable=False),
        sa.Column('indicator', sa.VARCHAR(80), nullable=False),
        sa.Column('value', sa.NUMERIC(15, 6), nullable=False),
        sa.Column('reference_date', sa.Date, nullable=False),
        sa.Column('collected_at', sa.DateTime, nullable=False),
    )
 
 
def downgrade():
    op.drop_table('external_data')
