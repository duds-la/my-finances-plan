"""create_income_type_table

Revision ID: 7146d5d99d81
Revises: 53ef001f776c
Create Date: 2026-05-30 17:49:39.667042

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '7146d5d99d81'
down_revision = '53ef001f776c'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "income_type",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('description', sa.VARCHAR(120), nullable=False),
    )
 
 
def downgrade():
    op.drop_table('income_type')
