from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from models.user import UserCreate, User, Token
from services.auth_service import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory user store for simplicity (as per plan, could be SQLite later)
users_db = {}

@router.post("/signup", response_model=User)
async def signup(user: UserCreate):
    if user.username in users_db:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    user_dict.pop("password")
    user_dict["hashed_password"] = hashed_password
    user_dict["id"] = str(len(users_db) + 1)
    
    db_user = User(**user_dict)
    users_db[user.username] = db_user
    return db_user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = users_db.get(form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
