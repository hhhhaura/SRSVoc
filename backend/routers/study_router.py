from datetime import datetime
import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import User, Deck, Card
from schemas import CardResponse, ReviewRequest, ReviewResponse, ImportRequest, ImportResponse, CSVImportRequest
from auth import get_current_user
from srs_logic import calculate_sm2

router = APIRouter(tags=["Study"])


def weighted_sample(cards: List[Card], n: int) -> List[Card]:
    """Sample cards with weights inversely proportional to interval (smaller interval = higher probability)."""
    if len(cards) <= n:
        return cards
    
    # Calculate weights: smaller interval = higher weight
    weights = []
    for card in cards:
        # Add 1 to avoid division by zero, use inverse of interval
        weight = 1.0 / (card.interval + 1)
        weights.append(weight)
    
    # Normalize weights
    total_weight = sum(weights)
    weights = [w / total_weight for w in weights]
    
    # Weighted random sampling without replacement
    selected = []
    available_indices = list(range(len(cards)))
    available_weights = weights.copy()
    
    for _ in range(n):
        if not available_indices:
            break
        # Normalize remaining weights
        total = sum(available_weights)
        if total == 0:
            break
        probs = [w / total for w in available_weights]
        
        # Select one index
        idx = random.choices(range(len(available_indices)), weights=probs, k=1)[0]
        selected.append(cards[available_indices[idx]])
        
        # Remove selected from available
        available_indices.pop(idx)
        available_weights.pop(idx)
    
    return selected


@router.get("/study/{deck_id}", response_model=List[CardResponse])
async def get_study_cards(
    deck_id: int,
    mode: str = "due",
    limit: int = 15,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get cards for study. Mode: 'due' (default) or 'all'. Limit: number of cards (0 for all)."""
    deck = db.query(Deck).filter(
        Deck.id == deck_id,
        Deck.user_id == current_user.id
    ).first()
    
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    if mode == "all":
        # Get all cards for practice
        cards = db.query(Card).filter(Card.deck_id == deck_id).all()
    else:
        # Get cards where next_review_date <= NOW
        now = datetime.utcnow()
        cards = db.query(Card).filter(
            Card.deck_id == deck_id,
            Card.next_review_date <= now
        ).all()
    
    # Apply weighted sampling if limit > 0
    if limit > 0 and len(cards) > limit:
        cards = weighted_sample(cards, limit)
    else:
        # Even if not sampling, shuffle the cards for variety
        cards = list(cards)
        random.shuffle(cards)
    
    return cards


@router.post("/study/{deck_id}/reset")
async def reset_deck_progress(
    deck_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reset all cards in a deck to initial state for relearning."""
    deck = db.query(Deck).filter(
        Deck.id == deck_id,
        Deck.user_id == current_user.id
    ).first()
    
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    # Reset all cards to initial SM-2 values
    now = datetime.utcnow()
    db.query(Card).filter(Card.deck_id == deck_id).update({
        "interval": 0,
        "repetition": 0,
        "ease_factor": 2.5,
        "next_review_date": now
    })
    
    db.commit()
    
    return {"message": "Deck progress reset", "deck_id": deck_id}


@router.post("/study/{card_id}/review", response_model=ReviewResponse)
async def review_card(
    card_id: int,
    review_data: ReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a review for a card and update SM-2 values."""
    card = db.query(Card).join(Deck).filter(
        Card.id == card_id,
        Deck.user_id == current_user.id
    ).first()
    
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # Calculate new SM-2 values
    sm2_result = calculate_sm2(review_data.quality, card)
    
    # Update card
    card.interval = sm2_result["interval"]
    card.repetition = sm2_result["repetition"]
    card.ease_factor = sm2_result["ease_factor"]
    card.next_review_date = sm2_result["next_review_date"]
    
    db.commit()
    db.refresh(card)
    
    return ReviewResponse(
        card_id=card.id,
        new_interval=card.interval,
        new_ease_factor=card.ease_factor,
        next_review_date=card.next_review_date
    )


@router.post("/import", response_model=ImportResponse)
async def import_cards(
    import_data: ImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import multiple cards into a deck."""
    deck = db.query(Deck).filter(
        Deck.id == import_data.deck_id,
        Deck.user_id == current_user.id
    ).first()
    
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    # Create cards in batch
    cards_to_add = []
    for card_data in import_data.cards:
        card = Card(
            deck_id=import_data.deck_id,
            word=card_data.word,
            definition=card_data.definition,
            example_sentence=card_data.example_sentence
        )
        cards_to_add.append(card)
    
    db.add_all(cards_to_add)
    db.commit()
    
    return ImportResponse(
        imported_count=len(cards_to_add),
        deck_id=import_data.deck_id
    )


@router.post("/import/csv", response_model=ImportResponse)
async def import_cards_csv(
    import_data: CSVImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import cards from CSV format: word,definition,example_sentence (one per line)."""
    import csv
    from io import StringIO
    
    deck = db.query(Deck).filter(
        Deck.id == import_data.deck_id,
        Deck.user_id == current_user.id
    ).first()
    
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    # Parse CSV data
    cards_to_add = []
    csv_file = StringIO(import_data.csv_data)
    reader = csv.reader(csv_file)
    
    for row in reader:
        if not row or not row[0].strip():
            continue  # Skip empty rows
        
        word = row[0].strip() if len(row) > 0 else ""
        definition = row[1].strip() if len(row) > 1 else ""
        example = row[2].strip() if len(row) > 2 else None
        
        if word and definition:  # Only add if word and definition exist
            card = Card(
                deck_id=import_data.deck_id,
                word=word,
                definition=definition,
                example_sentence=example if example else None
            )
            cards_to_add.append(card)
    
    if not cards_to_add:
        raise HTTPException(status_code=400, detail="No valid cards found in CSV data")
    
    db.add_all(cards_to_add)
    db.commit()
    
    return ImportResponse(
        imported_count=len(cards_to_add),
        deck_id=import_data.deck_id
    )
