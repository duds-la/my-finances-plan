"""create_investment_table

Revision ID: 0f943fb31fdc
Revises: 7146d5d99d81
Create Date: 2026-05-30 17:49:50.495487

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '0f943fb31fdc'
down_revision = '7146d5d99d81'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "investment",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('user.id'), nullable=False),
        sa.Column('investment_type_id', sa.Integer, sa.ForeignKey('investment_type.id'), nullable=False),
        sa.Column('transaction_id', sa.Integer, sa.ForeignKey('transaction.id'), nullable=True),
        sa.Column('invested_value', sa.NUMERIC(10, 2), nullable=False),
        sa.Column('interest_rate', sa.NUMERIC(5, 4), nullable=True),
        sa.Column('maturity_date', sa.Date, nullable=True),
        sa.Column('application_date', sa.Date, nullable=False),
        sa.Column('status', sa.VARCHAR(30), nullable=False, server_default='ativo'),
    )
 
 
def downgrade():
    op.drop_table('investment')