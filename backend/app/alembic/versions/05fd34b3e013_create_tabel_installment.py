"""create_tabel_installment

Revision ID: 05fd34b3e013
Revises: a1b2c3d4e5f6
Create Date: 2026-06-05 16:47:53.628959

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '05fd34b3e013'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # ── Plano de parcelamento ─────────────────────────────────────────────────
    op.create_table(
        "installment_plan",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("user.id"), nullable=False),
        sa.Column("category_id", sa.Integer, sa.ForeignKey("transaction_category.id"), nullable=False),
        sa.Column("description", sa.VARCHAR(255), nullable=False),
        sa.Column("total_value", sa.NUMERIC(10, 2), nullable=False),
        sa.Column("installment_value", sa.NUMERIC(10, 2), nullable=False),
        sa.Column("total_installments", sa.Integer, nullable=False),
        sa.Column("paid_installments", sa.Integer, nullable=False, server_default="0"),
        sa.Column("first_due_date", sa.Date, nullable=False),
        sa.Column("status", sa.VARCHAR(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_installment_plan_user_id", "installment_plan", ["user_id"])
 
    # ── Parcela individual ────────────────────────────────────────────────────
    op.create_table(
        "installment",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True, nullable=False),
        sa.Column("plan_id", sa.Integer, sa.ForeignKey("installment_plan.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("user.id"), nullable=False),
        sa.Column("installment_number", sa.Integer, nullable=False),
        sa.Column("due_date", sa.Date, nullable=False),
        sa.Column("value", sa.NUMERIC(10, 2), nullable=False),
        sa.Column("transaction_id", sa.Integer, sa.ForeignKey("transaction.id"), nullable=True),
        sa.Column("status", sa.VARCHAR(20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_installment_plan_id", "installment", ["plan_id"])
    op.create_index("ix_installment_user_id", "installment", ["user_id"])
    op.create_index("ix_installment_due_date", "installment", ["due_date"])
 
 
def downgrade():
    op.drop_index("ix_installment_due_date", "installment")
    op.drop_index("ix_installment_user_id", "installment")
    op.drop_index("ix_installment_plan_id", "installment")
    op.drop_table("installment")
    op.drop_index("ix_installment_plan_user_id", "installment_plan")
    op.drop_table("installment_plan")