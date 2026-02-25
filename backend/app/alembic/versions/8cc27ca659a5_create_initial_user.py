"""create initial user

Revision ID: 8cc27ca659a5
Revises: 5e78bb71bc22
Create Date: 2026-02-25 00:02:31.923393

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from app.core.security import get_password_hash


# revision identifiers, used by Alembic.
revision = '8cc27ca659a5'
down_revision = '5e78bb71bc22'
branch_labels = None
depends_on = None


def upgrade():
    password_hash = get_password_hash('123456')

    query = sa.text("""
        INSERT INTO "user" (name, password)
        VALUES (:name, :password)
    """).bindparams(
        name="eduardo",
        password=password_hash,
    )

    op.execute(query)


def downgrade():
    op.execute(
        sa.text("""
            DELETE FROM user WHERE email='admin@email.com'
        """)
    )
