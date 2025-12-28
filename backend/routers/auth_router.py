from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import get_db
from models import User, Deck, Card
from schemas import Token, UserCreate, UserResponse
from auth import (
    authenticate_user,
    create_access_token,
    create_user,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(tags=["Authentication"])


@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login and get access token."""
    user = authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    user = create_user(db, user_data.username, user_data.password)
    
    # Create sample deck with introduction cards for new users
    sample_deck = Deck(name="📚 Getting Started", user_id=user.id)
    db.add(sample_deck)
    db.flush()  # Get the deck ID
    
    sample_cards = [
        Card(
            deck_id=sample_deck.id,
            word="Welcome!",
            definition="This is your first vocabulary deck. Cards have a word/term and its definition.",
            example_sentence="You can add *example sentences* with cloze deletions using asterisks."
        ),
        Card(
            deck_id=sample_deck.id,
            word="Flashcard Mode",
            definition="Tap the card to flip and reveal the answer. Then rate how well you knew it.",
            example_sentence="Use *flashcard* mode for quick review sessions."
        ),
        Card(
            deck_id=sample_deck.id,
            word="Fill in Blank Mode",
            definition="Type the missing word(s) marked with *asterisks* in the example sentence.",
            example_sentence="This mode tests your *active recall* - typing the answer yourself."
        ),
        Card(
            deck_id=sample_deck.id,
            word="Spaced Repetition",
            definition="Cards you know well appear less often. Difficult cards appear more frequently.",
            example_sentence="*Spaced repetition* optimizes your learning by reviewing at the right time."
        ),
        Card(
            deck_id=sample_deck.id,
            word="Import Cards",
            definition="Add many cards at once using the Import feature. Use pipe format: word | definition | example",
            example_sentence="You can *import* hundreds of cards from a CSV file or paste them directly."
        ),
    ]
    
    db.add_all(sample_cards)
    db.commit()
    
    return user


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return current_user
