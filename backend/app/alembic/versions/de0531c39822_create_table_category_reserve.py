"""create_table_category_reserve

Revision ID: de0531c39822
Revises: dc8bf3bd097b
Create Date: 2026-06-02 00:38:43.175349

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'de0531c39822'
down_revision = 'dc8bf3bd097b'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "category_reserve",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('user.id'), nullable=False),
        sa.Column('category_id', sa.Integer, sa.ForeignKey('transaction_category.id'), nullable=False),
        sa.Column('reserved_value', sa.NUMERIC(10, 2), nullable=False),
        sa.Column('note', sa.VARCHAR(255), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'category_id', name='uq_user_category_reserve'),
    )
 
 
def downgrade():
    op.drop_table('category_reserve')
