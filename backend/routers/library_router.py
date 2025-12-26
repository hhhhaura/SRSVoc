from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User, Folder, Deck, Card
from schemas import (
    FolderCreate, FolderUpdate, FolderResponse,
    DeckCreate, DeckUpdate, DeckResponse,
    CardCreate, CardUpdate, CardResponse,
    LibraryResponse, FolderWithDecks, DeckInFolder
)
from auth import get_current_user

router = APIRouter(prefix="/library", tags=["Library"])


def get_deck_stats(deck: Deck) -> dict:
    """Get card count, mastered count, and due count for a deck."""
    cards = deck.cards
    card_count = len(cards)
    mastered_count = sum(1 for card in cards if card.interval > 3)
    due_count = sum(1 for card in cards if card.next_review_date <= datetime.utcnow())
    
    return {
        "card_count": card_count,
        "mastered_count": mastered_count,
        "due_count": due_count
    }


@router.get("", response_model=LibraryResponse)
async def get_library(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the full library structure with folders and decks."""
    # Get all folders for the user
    folders = db.query(Folder).filter(Folder.user_id == current_user.id).all()
    
    # Get root decks (decks without a folder)
    root_decks = db.query(Deck).filter(
        Deck.user_id == current_user.id,
        Deck.folder_id == None
    ).all()
    
    # Build folder response with decks
    folders_with_decks = []
    for folder in folders:
        folder_decks = []
        for deck in folder.decks:
            stats = get_deck_stats(deck)
            folder_decks.append(DeckInFolder(
                id=deck.id,
                name=deck.name,
                **stats
            ))
        
        folders_with_decks.append(FolderWithDecks(
            id=folder.id,
            name=folder.name,
            decks=folder_decks
        ))
    
    # Build root decks response
    root_decks_response = []
    for deck in root_decks:
        stats = get_deck_stats(deck)
        root_decks_response.append(DeckInFolder(
            id=deck.id,
            name=deck.name,
            **stats
        ))
    
    return LibraryResponse(
        folders=folders_with_decks,
        root_decks=root_decks_response
    )


# Folder CRUD
@router.post("/folders", response_model=FolderResponse)
async def create_folder(
    folder_data: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new folder."""
    folder = Folder(name=folder_data.name, user_id=current_user.id)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


@router.put("/folders/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: int,
    folder_data: FolderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a folder."""
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    if folder_data.name is not None:
        folder.name = folder_data.name
    
    db.commit()
    db.refresh(folder)
    return folder


@router.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a folder. Decks inside are moved to root (folder_id = NULL)."""
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Move decks to root (set folder_id to NULL)
    db.query(Deck).filter(Deck.folder_id == folder_id).update({"folder_id": None})
    
    # Delete the folder
    db.delete(folder)
    db.commit()
    
    return {"message": "Folder deleted, decks moved to root"}


# Deck CRUD
@router.post("/decks", response_model=DeckResponse)
async def create_deck(
    deck_data: DeckCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new deck."""
    # Verify folder belongs to user if provided
    if deck_data.folder_id:
        folder = db.query(Folder).filter(
            Folder.id == deck_data.folder_id,
            Folder.user_id == current_user.id
        ).first()
        
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")
    
    deck = Deck(
        name=deck_data.name,
        user_id=current_user.id,
        folder_id=deck_data.folder_id
    )
    db.add(deck)
    db.commit()
    db.refresh(deck)
    
    return DeckResponse(
        id=deck.id,
        name=deck.name,
        user_id=deck.user_id,
        folder_id=deck.folder_id,
        created_at=deck.created_at,
        card_count=0,
        mastered_count=0,
        due_count=0
    )


@router.get("/decks/{deck_id}", response_model=DeckResponse)
async def get_deck(
    deck_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific deck."""
    deck = db.query(Deck).filter(
        Deck.id == deck_id,
        Deck.user_id == current_user.id
    ).first()
    
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    stats = get_deck_stats(deck)
    
    return DeckResponse(
        id=deck.id,
        name=deck.name,
        user_id=deck.user_id,
        folder_id=deck.folder_id,
        created_at=deck.created_at,
        **stats
    )


@router.put("/decks/{deck_id}", response_model=DeckResponse)
async def update_deck(
    deck_id: int,
    deck_data: DeckUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a deck."""
    deck = db.query(Deck).filter(
        Deck.id == deck_id,
        Deck.user_id == current_user.id
    ).first()
    
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    if deck_data.name is not None:
        deck.name = deck_data.name
    
    if deck_data.folder_id is not None:
        # Verify folder belongs to user
        if deck_data.folder_id != 0:
            folder = db.query(Folder).filter(
                Folder.id == deck_data.folder_id,
                Folder.user_id == current_user.id
            ).first()
            
            if not folder:
                raise HTTPException(status_code=404, detail="Folder not found")
            
            deck.folder_id = deck_data.folder_id
        else:
            deck.folder_id = None
    
    db.commit()
    db.refresh(deck)
    
    stats = get_deck_stats(deck)
    
    return DeckResponse(
        id=deck.id,
        name=deck.name,
        user_id=deck.user_id,
        folder_id=deck.folder_id,
        created_at=deck.created_at,
        **stats
    )


@router.delete("/decks/{deck_id}")
async def delete_deck(
    deck_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a deck and all its cards (cascade delete)."""
    deck = db.query(Deck).filter(
        Deck.id == deck_id,
        Deck.user_id == current_user.id
    ).first()
    
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    db.delete(deck)
    db.commit()
    
    return {"message": "Deck and all cards deleted"}


# Card CRUD
@router.get("/decks/{deck_id}/cards", response_model=List[CardResponse])
async def get_cards(
    deck_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all cards in a deck."""
    deck = db.query(Deck).filter(
        Deck.id == deck_id,
        Deck.user_id == current_user.id
    ).first()
    
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    return deck.cards


@router.post("/decks/{deck_id}/cards", response_model=CardResponse)
async def create_card(
    deck_id: int,
    card_data: CardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new card in a deck."""
    deck = db.query(Deck).filter(
        Deck.id == deck_id,
        Deck.user_id == current_user.id
    ).first()
    
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    card = Card(
        deck_id=deck_id,
        word=card_data.word,
        definition=card_data.definition,
        example_sentence=card_data.example_sentence
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    
    return card


@router.put("/cards/{card_id}", response_model=CardResponse)
async def update_card(
    card_id: int,
    card_data: CardUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a card."""
    card = db.query(Card).join(Deck).filter(
        Card.id == card_id,
        Deck.user_id == current_user.id
    ).first()
    
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    if card_data.word is not None:
        card.word = card_data.word
    if card_data.definition is not None:
        card.definition = card_data.definition
    if card_data.example_sentence is not None:
        card.example_sentence = card_data.example_sentence
    
    db.commit()
    db.refresh(card)
    
    return card


@router.delete("/cards/{card_id}")
async def delete_card(
    card_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a card."""
    card = db.query(Card).join(Deck).filter(
        Card.id == card_id,
        Deck.user_id == current_user.id
    ).first()
    
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    db.delete(card)
    db.commit()
    
    return {"message": "Card deleted"}
