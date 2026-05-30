"""create_income_table

Revision ID: 0085f40e1687
Revises: 0f943fb31fdc
Create Date: 2026-05-30 17:50:03.545825

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '0085f40e1687'
down_revision = '0f943fb31fdc'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "income",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('investment_id', sa.Integer, sa.ForeignKey('investment.id'), nullable=False),
        sa.Column('income_type_id', sa.Integer, sa.ForeignKey('income_type.id'), nullable=False),
        sa.Column('income_date', sa.Date, nullable=False),
        sa.Column('income_value', sa.NUMERIC(10, 2), nullable=False),
        sa.Column('ir_withheld', sa.NUMERIC(10, 2), nullable=True, server_default='0'),
    )
 
 
def downgrade():
    op.drop_table('income')
