"""add_investment_finalidade_and_goal_link

Revision ID: a1b2c3d4e5f6
Revises: 8cc27ca659a5
Create Date: 2026-06-05

Alterações:
  - investment: adiciona `finalidade` (VARCHAR 50) e `current_value` (NUMERIC 10,2)
  - investment: adiciona CASCADE no DELETE da FK para income
  - financial_goal: adiciona `investment_id` FK → investment(id)
  - income_type: garante tipos aporte/rendimento/resgate existem
"""
from alembic import op
import sqlalchemy as sa

revision      = 'a1b2c3d4e5f6'
down_revision = 'de0531c39822'
branch_labels = None
depends_on    = None


def upgrade():
    # ── investment: finalidade + current_value ────────────────────────────
    op.add_column('investment',
        sa.Column('finalidade', sa.VARCHAR(50), nullable=True))

    op.add_column('investment',
        sa.Column('current_value', sa.NUMERIC(10, 2), nullable=True))

    # Inicializa current_value = invested_value para registros existentes
    op.execute(sa.text(
        "UPDATE investment SET current_value = invested_value WHERE current_value IS NULL"
    ))

    # ── financial_goal: investment_id ─────────────────────────────────────
    op.add_column('financial_goal',
        sa.Column('investment_id', sa.Integer,
                  sa.ForeignKey('investment.id', ondelete='SET NULL'),
                  nullable=True))

    # ── income: recriar FK com ON DELETE CASCADE ──────────────────────────
    # Descobre o nome da constraint atual
    op.execute(sa.text("""
        DO $$
        DECLARE
            constraint_name TEXT;
        BEGIN
            SELECT tc.constraint_name INTO constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'income'
              AND tc.constraint_type = 'FOREIGN KEY'
              AND kcu.column_name = 'investment_id'
            LIMIT 1;

            IF constraint_name IS NOT NULL THEN
                EXECUTE 'ALTER TABLE income DROP CONSTRAINT ' || quote_ident(constraint_name);
            END IF;
        END $$;
    """))

    op.create_foreign_key(
        'fk_income_investment_cascade',
        'income', 'investment',
        ['investment_id'], ['id'],
        ondelete='CASCADE'
    )

    # ── income_type: garante tipos necessários existem ────────────────────
    # Insere tipos necessários (só description, sem acronym)
    op.execute(sa.text("""
        INSERT INTO income_type (description)
        SELECT 'Aporte'
        WHERE NOT EXISTS (
            SELECT 1 FROM income_type WHERE LOWER(description) LIKE '%aporte%'
        );
    """))

    op.execute(sa.text("""
        INSERT INTO income_type (description)
        SELECT 'Rendimento'
        WHERE NOT EXISTS (
            SELECT 1 FROM income_type WHERE LOWER(description) LIKE '%rendimento%'
        );
    """))

    op.execute(sa.text("""
        INSERT INTO income_type (description)
        SELECT 'Resgate'
        WHERE NOT EXISTS (
            SELECT 1 FROM income_type WHERE LOWER(description) LIKE '%resgate%'
        );
    """))


def downgrade():
    op.drop_constraint('fk_income_investment_cascade', 'income', type_='foreignkey')
    op.create_foreign_key(None, 'income', 'investment', ['investment_id'], ['id'])
    op.drop_column('financial_goal', 'investment_id')
    op.drop_column('investment', 'current_value')
    op.drop_column('investment', 'finalidade')