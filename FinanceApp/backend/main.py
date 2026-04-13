from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routes import auth, transactions
from app.seeds import create_default_categories, create_admin_user

# Cria as tabelas
# Nota: Em desenvolvimento, isso criará as novas tabelas User e Transaction
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FinanceApp API - MVP",
    description="API de gestão de finanças pessoais simplificada",
    version="2.0.0"
)

# Configurar CORS (Permitir frontend se conectar)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event para popular categorias fixas do PRD
@app.on_event("startup")
def startup_event():
    create_default_categories()
    create_admin_user()

# Inclui as rotas refatoradas
app.include_router(auth.router)
app.include_router(transactions.router)

@app.get("/")
def read_root():
    return {
        "message": "MVP FinanceApp API Ativa",
        "docs": "/docs",
        "status": "online"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
