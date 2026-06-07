"""add_month_year-category_reserve

Revision ID: 72c33fac2d4f
Revises: 2717314aa693
Create Date: 2026-06-07 21:35:15.062096

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '72c33fac2d4f'
down_revision = '2717314aa693'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Adiciona as colunas como nullable primeiro
    op.add_column('category_reserve', sa.Column('month', sa.Integer(), nullable=True))
    op.add_column('category_reserve', sa.Column('year',  sa.Integer(), nullable=True))
 
    # 2. Preenche registros existentes com o mês/ano atual
    op.execute("""
        UPDATE category_reserve
        SET month = EXTRACT(MONTH FROM NOW()),
            year  = EXTRACT(YEAR  FROM NOW())
        WHERE month IS NULL
    """)
 
    # 3. Torna as colunas NOT NULL
    op.alter_column('category_reserve', 'month', nullable=False)
    op.alter_column('category_reserve', 'year',  nullable=False)
 
    # 4. Unique constraint: uma caixinha por (user, category, month, year)
    op.create_unique_constraint(
        'uq_category_reserve_user_cat_month_year',
        'category_reserve',
        ['user_id', 'category_id', 'month', 'year'],
    )
 
 
def downgrade():
    op.drop_constraint('uq_category_reserve_user_cat_month_year', 'category_reserve', type_='unique')
    op.drop_column('category_reserve', 'year')
    op.drop_column('category_reserve', 'month')