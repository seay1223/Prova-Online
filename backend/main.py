from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from db import Base, engine, get_db
from models import Aluno, AlunoCreate, AlunoOut

app = FastAPI(title="API Escola")

# CORS (ajuste os domínios em produção)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # troque por ["https://seu-dominio.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Criar tabelas
Base.metadata.create_all(bind=engine)

@app.get("/api/alunos", response_model=list[AlunoOut])
def listar_alunos(db: Session = Depends(get_db)):
    return db.query(Aluno).order_by(Aluno.id.desc()).all()

@app.post("/api/alunos", response_model=AlunoOut, status_code=201)
def criar_aluno(payload: AlunoCreate, db: Session = Depends(get_db)):
    aluno = Aluno(nome=payload.nome)
    db.add(aluno)
    db.commit()
    db.refresh(aluno)
    return aluno

@app.get("/health")
def health():
    return {"status": "ok"}
