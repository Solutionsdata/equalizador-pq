"""
Router de administração de usuários.
Apenas usuários com is_admin=True podem acessar estes endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin
from app.models.user import User
from app.schemas.user import UserResponse, UserAdminUpdate

router = APIRouter()


@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Lista todos os usuários cadastrados (somente admin)."""
    return db.query(User).order_by(User.created_at.asc()).all()


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserAdminUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Atualiza status, permissões ou data de assinatura de um usuário."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Impede o admin de se desativar ou remover sua própria flag de admin
    if user.id == admin.id:
        if data.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você não pode desativar sua própria conta",
            )
        if data.is_admin is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você não pode remover seu próprio acesso de administrador",
            )

    if data.is_active is not None:
        user.is_active = data.is_active
    if data.is_admin is not None:
        user.is_admin = data.is_admin
    if data.assinatura_ate is not None:
        user.assinatura_ate = data.assinatura_ate

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Remove um usuário e todos os seus dados (somente admin)."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode excluir sua própria conta",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    db.delete(user)
    db.commit()
