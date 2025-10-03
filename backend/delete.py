# delete_user.py
import sqlite3

DB_PATH = "database/database.db"
USER_ID = "2a2cfbbb-4886-481a-bf03-26428f26f2af" 

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("SELECT * FROM usuarios WHERE id = ?", (USER_ID,))
user = cursor.fetchone()

if user:
    print(f"Usuário encontrado: {user}")
    confirm = input("Deseja deletar este usuário? (s/n): ")
    if confirm.lower() == 's':
        cursor.execute("DELETE FROM usuarios WHERE id = ?", (USER_ID,))
        conn.commit()
        print(f"✅ Usuário com ID {USER_ID} foi deletado!")
    else:
        print("Operação cancelada.")
else:
    print(f"❌ Nenhum usuário encontrado com ID {USER_ID}.")

conn.close()