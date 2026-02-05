"""update transaction table

Revision ID: 193824428816
Revises: be7c9cdfd76c
Create Date: 2026-02-05 23:13:08.325948

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '193824428816'
down_revision = 'be7c9cdfd76c'
branch_labels = None
depends_on = None


def upgrade():
    # Foreign Keys
    op.add_column('transaction', sa.Column('user_id', sa.Integer, sa.ForeignKey('user.id'), nullable=False)),
    op.add_column('transaction', sa.Column('transaction_type_id', sa.Integer, sa.ForeignKey('transaction_type.id'), nullable=False)),
    op.add_column('transaction', sa.Column('transaction_category_id', sa.Integer, sa.ForeignKey('transaction_category.id'), nullable=False))       

def downgrade():
     op.drop_column('transaction', 'user_id'),
     op.drop_column('transaction', 'transaction_type_id'),
     op.drop_column('transaction', 'transaction_category_id')
