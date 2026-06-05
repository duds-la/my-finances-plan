"""
reset_and_seed.py — Reset e seed dos dados financeiros do Eduardo
docker compose exec backend python reset_and_seed.py --email eduardo
"""

import argparse
import sys
from datetime import date, datetime

sys.path.insert(0, ".")
from app.database.session import SessionLocal
from sqlalchemy import text

from app.models.user                 import User
from app.models.transaction_type     import Transaction_Type
from app.models.transaction_category import Transaction_Category
from app.models.investment_type      import Investment_Type
from app.models.transaction          import Transaction
from app.models.investment           import Investment
from app.models.category_reserve     import Category_Reserve
from app.models.budget               import Budget
from app.models.financial_goal       import Financial_Goal
from app.models.financial_score      import Financial_Score
from app.models.anomaly              import Anomaly
from app.models.balance_projection   import Balance_Projection

try:
    from app.models.income_type import Income_Type
except ImportError:
    pass
try:
    from app.models.income import Income
except ImportError:
    pass

# ── Dados reais (siglas conforme banco listado no log) ────────────────────────

RECEITAS = [
    {"descricao": "Salário Líquido",  "valor": 6000.00, "cat_sigla": "SAL"},
    {"descricao": "FGTS Aniversário", "valor": 1750.00, "cat_sigla": "FGTS"},
]

CDBS = [
    {"nome": "CDB - NU (R.E)",         "valor": 4274.71, "data": date(2026, 5, 31)},
    {"nome": "CDB - NU (CARRO)",       "valor": 1200.00, "data": date(2026, 6,  1)},
    {"nome": "CDB - NU (APARTAMENTO)", "valor":  600.00, "data": date(2026, 6,  1)},
]

# Siglas ajustadas com base no banco real
CAIXINHAS = [
    {"sigla": "TRN",  "valor":  500.00, "nota": "Reserva Uber/Transporte"},
    {"sigla": "CCNU", "valor": 1000.00, "nota": "Cartão de Crédito - NU"},
    {"sigla": "TERP", "valor":  240.00, "nota": "Terapia"},
    {"sigla": "VIGM", "valor":  500.00, "nota": "Viagens e Passeios"},
    {"sigla": "EVSC", "valor":  433.00, "nota": "Eventos Sociais"},
    {"sigla": "ESTD", "valor":  808.78, "nota": "Estudo"},
    {"sigla": "GYMP", "valor":  225.01, "nota": "Academia/Gympass"},
    {"sigla": "DSJS", "valor":  600.00, "nota": "Desejos"},
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_user(db, name):
    user = db.query(User).filter(User.name == name).first()
    if not user:
        print(f"[ERRO] Usuário '{name}' não encontrado.")
        for u in db.query(User).all():
            print(f"  id={u.id}  name={u.name}")
        sys.exit(1)
    return user

def get_type(db, keyword):
    for t in db.query(Transaction_Type).all():
        if keyword.lower() in t.description.lower():
            return t
    all_t = db.query(Transaction_Type).all()
    print(f"[AVISO] Tipo '{keyword}' não encontrado: {[(t.id, t.description) for t in all_t]}")
    return all_t[0]

def get_cat(db, sigla):
    cat = db.query(Transaction_Category).filter(
        Transaction_Category.acronym.ilike(sigla.strip())
    ).first()
    if not cat:
        # tenta com espaço (algumas siglas têm padding)
        cat = db.query(Transaction_Category).filter(
            Transaction_Category.acronym.ilike(f"{sigla}%")
        ).first()
    if not cat:
        print(f"[AVISO] Categoria '{sigla}' não encontrada — pulando.")
    return cat

def get_inv_type_cdb(db):
    for t in db.query(Investment_Type).all():
        if "cdb" in t.description.lower() or "cdb" in t.acronym.lower():
            return t
    types = db.query(Investment_Type).all()
    print(f"[AVISO] CDB não encontrado: {[(t.id, t.acronym, t.description) for t in types]}")
    return types[0]

# ── Limpeza com SAVEPOINT por statement ───────────────────────────────────────

def safe_exec(db, sql, params):
    """Executa um DELETE com savepoint — se falhar, faz rollback só desse statement."""
    try:
        db.execute(text("SAVEPOINT sp"))
        db.execute(text(sql), params)
        db.execute(text("RELEASE SAVEPOINT sp"))
        return True
    except Exception as e:
        db.execute(text("ROLLBACK TO SAVEPOINT sp"))
        print(f"  [ignorado] {sql[:55]}... → {type(e).__name__}")
        return False

def limpar(db, user_id):
    print(f"\n[LIMPEZA] Removendo dados do user_id={user_id}...")
    p = {"uid": user_id}

    stmts = [
        "DELETE FROM log_transaction WHERE transaction_id IN (SELECT id FROM transaction WHERE user_id = :uid)",
        "DELETE FROM goal_contribution WHERE goal_id IN (SELECT id FROM financial_goal WHERE user_id = :uid)",
        "DELETE FROM aporte_meta WHERE meta_id IN (SELECT id FROM financial_goal WHERE user_id = :uid)",
        "DELETE FROM income WHERE investment_id IN (SELECT id FROM investment WHERE user_id = :uid)",
        "DELETE FROM investment_composition WHERE investment_id IN (SELECT id FROM investment WHERE user_id = :uid)",
        "DELETE FROM investment WHERE user_id = :uid",
        "DELETE FROM transaction WHERE user_id = :uid",
        "DELETE FROM category_reserve WHERE user_id = :uid",
        "DELETE FROM budget WHERE user_id = :uid",
        "DELETE FROM financial_goal WHERE user_id = :uid",
        "DELETE FROM financial_score WHERE user_id = :uid",
        "DELETE FROM anomaly WHERE user_id = :uid",
        "DELETE FROM balance_projection WHERE user_id = :uid",
        "DELETE FROM simulation WHERE user_id = :uid",
        "DELETE FROM user_achievement WHERE user_id = :uid",
    ]

    for sql in stmts:
        safe_exec(db, sql, p)

    db.commit()
    print("[LIMPEZA] Concluída.")

# ── Seed ──────────────────────────────────────────────────────────────────────

def seed(db, user_id):
    print("\n[SEED] Inserindo dados reais...")

    tipo_entrada = get_type(db, "entrada")
    tipo_cdb     = get_inv_type_cdb(db)

    # Receitas
    print("\n  Receitas de junho/2026:")
    for r in RECEITAS:
        cat = get_cat(db, r["cat_sigla"])
        if not cat:
            cat = db.query(Transaction_Category).first()
        tx = Transaction(
            user_id                 = user_id,
            transaction_type_id     = tipo_entrada.id,
            transaction_category_id = cat.id,
            transaction_value       = r["valor"],
            transaction_date        = datetime(2026, 6, 1, 9, 0),
        )
        db.add(tx)
        print(f"    + R$ {r['valor']:>10.2f}  {r['descricao']}  [{cat.acronym.strip()}]")

    db.flush()

    # CDBs
    print("\n  Investimentos CDB Nubank:")
    for cdb in CDBS:
        inv = Investment(
            user_id            = user_id,
            investment_type_id = tipo_cdb.id,
            invested_value     = cdb["valor"],
            application_date   = cdb["data"],
            interest_rate      = 0.1350,
            status             = "ativo",
            transaction_id     = None,
        )
        db.add(inv)
        print(f"    + R$ {cdb['valor']:>10.2f}  {cdb['nome']}")

    db.flush()

    # Caixinhas
    print("\n  Caixinhas:")
    ok = 0
    for cx in CAIXINHAS:
        cat = get_cat(db, cx["sigla"])
        if not cat:
            continue
        reserve = Category_Reserve(
            user_id        = user_id,
            category_id    = cat.id,
            reserved_value = cx["valor"],
            note           = cx["nota"],
        )
        db.add(reserve)
        print(f"    + R$ {cx['valor']:>10.2f}  [{cat.acronym.strip()}] {cx['nota']}")
        ok += 1

    db.commit()

    total_inv = sum(c["valor"] for c in CDBS)
    total_cx  = sum(c["valor"] for c in CAIXINHAS)
    total_rec = sum(r["valor"] for r in RECEITAS)

    print(f"""
[SEED] Concluído!
  Receitas    : R$ {total_rec:>10,.2f}
  Investido   : R$ {total_inv:>10,.2f}
  Caixinhas   : R$ {total_cx:>10,.2f}  ({ok}/{len(CAIXINHAS)} inseridas)
  ─────────────────────────────
  Patrimônio  : R$ {total_inv + total_cx:>10,.2f}
    """)

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        user = get_user(db, args.email)
        print(f"\n[INFO] Usuário: id={user.id}  name={user.name}")

        confirm = input("\n⚠️  Apagará TODOS os dados financeiros e reinserirá do zero.\nDigite 'sim': ")
        if confirm.strip().lower() != "sim":
            print("Cancelado.")
            return

        limpar(db, user.id)
        seed(db, user.id)

        print("✅ Pronto! Recarregue a aplicação e clique em 'Calcular & Salvar' em /analise.")

    except Exception as e:
        db.rollback()
        print(f"\n[ERRO] {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()