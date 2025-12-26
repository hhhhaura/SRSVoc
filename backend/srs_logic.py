from datetime import datetime, timedelta
from models import Card


def calculate_sm2(quality: int, card: Card) -> dict:
    """
    SuperMemo-2 (SM-2) Algorithm Implementation
    
    Args:
        quality: Quality of response (0=Forgot, 3=Hard, 4=Good, 5=Easy)
        card: Card object with current SM-2 values
    
    Returns:
        dict with updated interval, repetition, ease_factor, and next_review_date
    """
    # Get current values
    repetition = card.repetition
    ease_factor = card.ease_factor
    interval = card.interval
    
    # Quality must be between 0 and 5
    quality = max(0, min(5, quality))
    
    if quality < 3:
        # Failed review - reset repetition and interval
        repetition = 0
        interval = 1
    else:
        # Successful review
        if repetition == 0:
            interval = 1
        elif repetition == 1:
            interval = 6
        else:
            interval = round(interval * ease_factor)
        
        repetition += 1
    
    # Update ease factor using SM-2 formula
    # EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    
    # Ease factor should not go below 1.3
    ease_factor = max(1.3, ease_factor)
    
    # Calculate next review date
    next_review_date = datetime.utcnow() + timedelta(days=interval)
    
    return {
        "interval": interval,
        "repetition": repetition,
        "ease_factor": round(ease_factor, 2),
        "next_review_date": next_review_date
    }


def get_mastery_percentage(cards: list) -> float:
    """
    Calculate the percentage of mastered cards in a deck.
    A card is considered mastered if its interval > 3 days.
    
    Args:
        cards: List of Card objects
    
    Returns:
        Percentage of mastered cards (0-100)
    """
    if not cards:
        return 0.0
    
    mastered_count = sum(1 for card in cards if card.interval > 3)
    return round((mastered_count / len(cards)) * 100, 1)


def get_due_cards_count(cards: list) -> int:
    """
    Count cards that are due for review.
    
    Args:
        cards: List of Card objects
    
    Returns:
        Number of cards due for review
    """
    now = datetime.utcnow()
    return sum(1 for card in cards if card.next_review_date <= now)
