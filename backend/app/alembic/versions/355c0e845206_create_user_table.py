"""create user table

Revision ID: 355c0e845206
Revises: 
Create Date: 2026-01-28 00:04:10.253596

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '355c0e845206'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user",
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(60), nullable=False)
    )


def downgrade():
    op.drop_table('user')
