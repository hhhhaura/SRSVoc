from datetime import datetime
import random
import os
import json
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import User, Deck, Card
from schemas import (
    CardResponse, ReviewRequest, ReviewResponse, ImportRequest, ImportResponse, 
    CSVImportRequest, MultiDeckStudyRequest, CardBase, ExampleItem
)
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
        # Convert examples to dict format for JSON storage
        examples_data = None
        if card_data.examples:
            examples_data = [ex.model_dump() for ex in card_data.examples]
        
        card = Card(
            deck_id=import_data.deck_id,
            word=card_data.word,
            definition=card_data.definition,
            synonyms=card_data.synonyms,
            examples=examples_data
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
    """Import cards from pipe-separated format.
    
    Format: word || meaning || syn1, syn2 || (example1, trans1), (example2, trans2)...
    """
    deck = db.query(Deck).filter(
        Deck.id == import_data.deck_id,
        Deck.user_id == current_user.id
    ).first()
    
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    cards_to_add = []
    lines = import_data.csv_data.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check for new format (uses || as separator)
        if '||' in line:
            # New format: word || meaning || synonyms || (ex1, trans1), (ex2, trans2)...
            parts = line.split('||')
            if len(parts) >= 2:
                word = parts[0].strip() if len(parts) > 0 else ""
                definition = parts[1].strip() if len(parts) > 1 else ""
                
                # Synonyms (comma-separated)
                synonyms_str = parts[2].strip() if len(parts) > 2 else ""
                synonyms = [s.strip() for s in synonyms_str.split(',') if s.strip()] if synonyms_str else None
                
                # Examples: (sentence, trans), (sentence, trans)...
                # Use regex to find all (...)  pairs
                examples = []
                if len(parts) > 3:
                    examples_str = parts[3].strip()
                    # Find all (...) groups using regex
                    import re
                    pair_matches = re.findall(r'\(([^)]+)\)', examples_str)
                    for pair in pair_matches:
                        # Find the last comma to split sentence and translation
                        last_comma = pair.rfind(',')
                        if last_comma > 0:
                            sentence = pair[:last_comma].strip()
                            translation = pair[last_comma+1:].strip()
                            if sentence:
                                examples.append({"sentence": sentence, "translation": translation})
                        elif pair.strip():
                            # No comma found, just use as sentence
                            examples.append({"sentence": pair.strip(), "translation": None})
                
                if word and definition:
                    card = Card(
                        deck_id=import_data.deck_id,
                        word=word,
                        definition=definition,
                        synonyms=synonyms if synonyms else None,
                        examples=examples if examples else None
                    )
                    cards_to_add.append(card)
        
    
    if not cards_to_add:
        raise HTTPException(status_code=400, detail="No valid cards found in data")
    
    db.add_all(cards_to_add)
    db.commit()
    
    return ImportResponse(
        imported_count=len(cards_to_add),
        deck_id=import_data.deck_id
    )


@router.post("/study/multi", response_model=List[CardResponse])
async def get_multi_deck_study_cards(
    request: MultiDeckStudyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get cards from multiple decks for study. Cards are weighted by due status."""
    # Verify all decks belong to user
    decks = db.query(Deck).filter(
        Deck.id.in_(request.deck_ids),
        Deck.user_id == current_user.id
    ).all()
    
    if len(decks) != len(request.deck_ids):
        raise HTTPException(status_code=404, detail="One or more decks not found")
    
    # Collect cards from all decks
    all_cards = []
    now = datetime.utcnow()
    
    for deck in decks:
        if request.mode == "all":
            cards = db.query(Card).filter(Card.deck_id == deck.id).all()
        else:
            # Get due cards
            cards = db.query(Card).filter(
                Card.deck_id == deck.id,
                Card.next_review_date <= now
            ).all()
        all_cards.extend(cards)
    
    if not all_cards:
        return []
    
    # Apply weighted sampling if limit > 0
    if request.limit > 0 and len(all_cards) > request.limit:
        all_cards = weighted_sample(all_cards, request.limit)
    else:
        random.shuffle(all_cards)
    
    return all_cards


# AI Example Generation
AI_EXAMPLE_PROMPT = '''Generate 2 example sentences for the English word/phrase "{word}" (meaning: {definition}).

Requirements:
1. Each example should be a natural, clear sentence using the word
2. Wrap the target word in asterisks like *word* in the ENGLISH sentence ONLY
3. Provide a TRADITIONAL CHINESE (繁體中文) translation for each example
4. DO NOT use asterisks in the Chinese translation - keep it plain text
5. Example 1: A simple, everyday usage
6. Example 2: A sentence connecting to current events, history, or deeper context

Output as JSON with this exact structure:
{{
  "examples": [
    {{"sentence": "Example sentence with *word*.", "translation": "繁體中文翻譯（不要星號）"}},
    {{"sentence": "Another example with *word*.", "translation": "繁體中文翻譯（不要星號）"}}
  ]
}}

IMPORTANT: Output ONLY the JSON object, no other text. Use TRADITIONAL CHINESE (繁體中文) for all translations. NO asterisks in Chinese translations.'''


from pydantic import BaseModel as PydanticBaseModel

class AIExampleRequest(PydanticBaseModel):
    word: str
    definition: str


@router.post("/ai/generate-examples")
async def generate_ai_examples(
    request: AIExampleRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate AI example sentences for a word using Gemini API."""
    import google.generativeai as genai
    
    # Get API key from environment
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")
    
    # Configure Gemini
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash')
    
    prompt = AI_EXAMPLE_PROMPT.format(word=request.word, definition=request.definition)
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Try to extract JSON from response (handle markdown code blocks)
        if response_text.startswith("```"):
            response_text = re.sub(r'^```(?:json)?\n?', '', response_text)
            response_text = re.sub(r'\n?```$', '', response_text)
        
        result = json.loads(response_text)
        return result
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI API error: {str(e)}")
