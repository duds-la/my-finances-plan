import sys
sys.path.insert(0, ".")
from app.database.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
db.execute(text("UPDATE investment SET finalidade = 'R.E' WHERE id = 13"))
db.execute(text("UPDATE investment SET finalidade = 'Carro' WHERE id = 14"))
db.execute(text("UPDATE investment SET finalidade = 'Apartamento' WHERE id = 15"))
db.commit()

rows = db.execute(text("SELECT id, invested_value, finalidade FROM investment WHERE user_id = 4")).fetchall()
for r in rows:
    print(r)
db.close()
print("Pronto!")