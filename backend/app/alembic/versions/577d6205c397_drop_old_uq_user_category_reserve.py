"""drop_old_uq_user_category_reserve

Revision ID: 577d6205c397
Revises: 5facc2354112
Create Date: 2026-06-13 14:01:34.803129

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '577d6205c397'
down_revision = '5facc2354112'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint('uq_user_category_reserve', 'category_reserve', type_='unique')


def downgrade():
    op.create_unique_constraint(
        'uq_user_category_reserve',
        'category_reserve',
        ['user_id', 'category_id'],
    )
