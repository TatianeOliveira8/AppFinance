"""
Configuração pytest - Limpeza do banco antes dos testes
"""
import pytest
from app.database import Base, engine, SessionLocal
from app.models import Category
from sqlalchemy.orm import Session

@pytest.fixture(scope="session", autouse=True)
def clean_database_and_seed():
    """
    Limpa, recria e popula todas as tabelas ANTES de rodar os testes
    Autouse=True garante que roda automaticamente
    """
    # Dropa todas as tabelas
    Base.metadata.drop_all(bind=engine)
    
    # Recria as tabelas
    Base.metadata.create_all(bind=engine)
    
    # Cria as categorias fixas (como faz no startup do main.py)
    db = SessionLocal()
    try:
        fixed_categories = [
            Category(name="Alimentação", icon="🍔", user_id=None),
            Category(name="Transporte", icon="🚗", user_id=None),
            Category(name="Saúde", icon="⚕️", user_id=None),
            Category(name="Educação", icon="📚", user_id=None),
            Category(name="Lazer", icon="🎮", user_id=None),
            Category(name="Outros", icon="📝", user_id=None),
        ]
        for category in fixed_categories:
            db.add(category)
        db.commit()
    finally:
        db.close()
    
    yield  # Testes rodam aqui
    
    # Limpeza após testes (opcional)

