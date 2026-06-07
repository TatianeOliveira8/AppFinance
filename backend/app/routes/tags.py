from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Tag
from app.schemas import TagCreate, TagUpdate, TagResponse
from app.routes.auth import get_current_user_id

router = APIRouter(prefix="/api/tags", tags=["tags"])

@router.get("/", response_model=List[TagResponse])
def get_tags(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    return db.query(Tag).filter(Tag.user_id == user_id).all()

@router.post("/", response_model=TagResponse)
def create_tag(
    data: TagCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    tag = Tag(name=data.name, color=data.color, user_id=user_id)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag

@router.put("/{tag_id}", response_model=TagResponse)
def update_tag(
    tag_id: int,
    data: TagUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == user_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag não encontrada")
    if data.name is not None:
        tag.name = data.name
    if data.color is not None:
        tag.color = data.color
    db.commit()
    db.refresh(tag)
    return tag

@router.delete("/{tag_id}")
def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == user_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag não encontrada")
    db.delete(tag)
    db.commit()
    return {"message": "Tag excluída com sucesso"}
