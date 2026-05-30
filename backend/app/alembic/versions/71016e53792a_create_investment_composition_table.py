"""create_investment_composition_table

Revision ID: 71016e53792a
Revises: 0085f40e1687
Create Date: 2026-05-30 17:50:18.491128

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '71016e53792a'
down_revision = '0085f40e1687'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "investment_composition",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('investment_id', sa.Integer, sa.ForeignKey('investment.id'), nullable=False),
        sa.Column('transaction_id', sa.Integer, sa.ForeignKey('transaction.id'), nullable=False),
        sa.Column('percentage', sa.NUMERIC(5, 2), nullable=False),
        sa.Column('observation', sa.VARCHAR(255), nullable=True),
    )
 
 
def downgrade():
    op.drop_table('investment_composition')
