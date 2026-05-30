"""create_anomaly_table

Revision ID: 450c69315e12
Revises: f3158ccc8de4
Create Date: 2026-05-30 20:07:30.485280

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '450c69315e12'
down_revision = 'f3158ccc8de4'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "anomaly",
        sa.Column('id', sa.Integer, primary_key=True, nullable=False, autoincrement=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('user.id'), nullable=False),
        sa.Column('transaction_id', sa.Integer, sa.ForeignKey('transaction.id'), nullable=True),
        sa.Column('category_id', sa.Integer, sa.ForeignKey('transaction_category.id'), nullable=True),
        sa.Column('expected_value', sa.NUMERIC(10, 2), nullable=True),
        sa.Column('actual_value', sa.NUMERIC(10, 2), nullable=False),
        sa.Column('deviation_percentage', sa.NUMERIC(5, 2), nullable=True),
        sa.Column('status', sa.VARCHAR(30), nullable=False, server_default='pendente'),
        sa.Column('detected_at', sa.DateTime, nullable=False),
    )
 
 
def downgrade():
    op.drop_table('anomaly')
