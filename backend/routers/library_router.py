from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

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
    """Get card count, mastered count, due count, and cards with examples count for a deck."""
    cards = deck.cards
    card_count = len(cards)
    mastered_count = sum(1 for card in cards if card.interval > 3)
    due_count = sum(1 for card in cards if card.next_review_date <= datetime.utcnow())
    cards_with_examples_count = sum(1 for card in cards if card.examples and len(card.examples) > 0)
    
    deck_updated_at = getattr(deck, "updated_at", None) or deck.created_at

    return {
        "card_count": card_count,
        "mastered_count": mastered_count,
        "due_count": due_count,
        "cards_with_examples_count": cards_with_examples_count,
        "folder_id": deck.folder_id,
        "created_at": deck.created_at,
        "updated_at": deck_updated_at,
    }


def build_folder_tree(folders: List[Folder]) -> List[FolderWithDecks]:
    folder_nodes = {
        folder.id: FolderWithDecks(
            id=folder.id,
            name=folder.name,
            parent_folder_id=folder.parent_folder_id,
            decks=[],
            children=[],
        )
        for folder in folders
    }

    for folder in folders:
        for deck in folder.decks:
            stats = get_deck_stats(deck)
            folder_nodes[folder.id].decks.append(DeckInFolder(
                id=deck.id,
                name=deck.name,
                **stats,
            ))

        folder_nodes[folder.id].decks.sort(key=lambda deck_item: deck_item.name.lower())

    roots = []
    for folder in folders:
        node = folder_nodes[folder.id]
        if folder.parent_folder_id and folder.parent_folder_id in folder_nodes:
            folder_nodes[folder.parent_folder_id].children.append(node)
        else:
            roots.append(node)

    def sort_tree(node: FolderWithDecks) -> None:
        node.children.sort(key=lambda child: child.name.lower())
        for child in node.children:
            sort_tree(child)

    roots.sort(key=lambda folder_item: folder_item.name.lower())
    for root in roots:
        sort_tree(root)

    return roots


def assert_valid_parent_folder(
    db: Session,
    current_user: User,
    parent_folder_id: Optional[int],
    current_folder_id: Optional[int] = None,
):
    if parent_folder_id is None:
        return

    parent = db.query(Folder).filter(
        Folder.id == parent_folder_id,
        Folder.user_id == current_user.id,
    ).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent folder not found")

    if current_folder_id is None:
        return

    if parent_folder_id == current_folder_id:
        raise HTTPException(status_code=400, detail="Folder cannot be its own parent")

    cursor = parent
    while cursor is not None:
        if cursor.parent_folder_id == current_folder_id:
            raise HTTPException(status_code=400, detail="Cannot move folder into its descendant")
        if cursor.parent_folder_id is None:
            break
        cursor = db.query(Folder).filter(
            Folder.id == cursor.parent_folder_id,
            Folder.user_id == current_user.id,
        ).first()


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
    
    folders_with_decks = build_folder_tree(folders)
    
    # Build root decks response
    root_decks_response = []
    for deck in sorted(root_decks, key=lambda item: item.name.lower()):
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
    assert_valid_parent_folder(db, current_user, folder_data.parent_folder_id)
    folder = Folder(
        name=folder_data.name,
        user_id=current_user.id,
        parent_folder_id=folder_data.parent_folder_id,
    )
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
    if "parent_folder_id" in folder_data.model_fields_set:
        assert_valid_parent_folder(db, current_user, folder_data.parent_folder_id, current_folder_id=folder.id)
        folder.parent_folder_id = folder_data.parent_folder_id
    
    db.commit()
    db.refresh(folder)
    return folder


@router.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a folder. Decks/children are moved to the parent folder (or root)."""
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.user_id == current_user.id
    ).first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    target_parent_id = folder.parent_folder_id
    db.query(Deck).filter(Deck.folder_id == folder_id).update({"folder_id": target_parent_id})
    db.query(Folder).filter(Folder.parent_folder_id == folder_id).update({"parent_folder_id": target_parent_id})
    
    # Delete the folder
    db.delete(folder)
    db.commit()
    
    return {"message": "Folder deleted; nested content moved to parent"}


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
    
    # Convert examples to dict format for JSON storage
    examples_data = None
    if card_data.examples:
        examples_data = [ex.model_dump() for ex in card_data.examples]
    
    card = Card(
        deck_id=deck_id,
        word=card_data.word,
        definition=card_data.definition,
        synonyms=card_data.synonyms,
        examples=examples_data
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
    if card_data.synonyms is not None:
        card.synonyms = card_data.synonyms
    if card_data.examples is not None:
        card.examples = [ex.model_dump() for ex in card_data.examples]
    if card_data.is_starred is not None:
        card.is_starred = card_data.is_starred
    
    db.commit()
    db.refresh(card)
    
    return card


@router.post("/cards/{card_id}/star", response_model=CardResponse)
async def toggle_card_star(
    card_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Toggle the starred state for a card.
    """
    card = db.query(Card).join(Deck).filter(
        Card.id == card_id,
        Deck.user_id == current_user.id
    ).first()
    
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    card.is_starred = not bool(card.is_starred)
    
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
