"""add_description_to_transaction_table

Revision ID: 2717314aa693
Revises: 05fd34b3e013
Create Date: 2026-06-07 19:43:54.196664

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '2717314aa693'
down_revision = '05fd34b3e013'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('transaction', sa.Column('description', sa.VARCHAR(255), nullable=True))
 
 
def downgrade():
    op.drop_column('transaction', 'description')
 
