import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic_settings import BaseSettings
from pydantic import Field
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

class Settings(BaseSettings):
    # JWT
    secret_key: str = Field(default="sua-chave-secreta-super-segura-mude-em-producao", alias="SECRET_KEY")
    algorithm: str = Field(default="HS256", alias="ALGORITHM")
    access_token_expire_days: int = Field(default=1, alias="ACCESS_TOKEN_EXPIRE_DAYS")
    
    # API
    api_version: str = Field(default="1.0.0", alias="API_VERSION")
    debug: bool = Field(default=False, alias="DEBUG")
    
    # Database (read from .env but not used here, handled in database.py)
    db_user: str = Field(default="postgres", alias="DB_USER")
    db_password: str = Field(default="1234", alias="DB_PASSWORD")
    db_host: str = Field(default="localhost", alias="DB_HOST")
    db_port: str = Field(default="5432", alias="DB_PORT")
    db_name: str = Field(default="financeapp", alias="DB_NAME")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        populate_by_name = True
        extra = "ignore"

settings = Settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.access_token_expire_days)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        return None
