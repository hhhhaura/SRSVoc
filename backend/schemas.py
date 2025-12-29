from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# User Schemas
class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# Folder Schemas
class FolderBase(BaseModel):
    name: str


class FolderCreate(FolderBase):
    pass


class FolderUpdate(BaseModel):
    name: Optional[str] = None


class FolderResponse(FolderBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Deck Schemas
class DeckBase(BaseModel):
    name: str


class DeckCreate(DeckBase):
    folder_id: Optional[int] = None


class DeckUpdate(BaseModel):
    name: Optional[str] = None
    folder_id: Optional[int] = None


class DeckResponse(DeckBase):
    id: int
    user_id: int
    folder_id: Optional[int]
    created_at: datetime
    card_count: int = 0
    mastered_count: int = 0
    due_count: int = 0
    cards_with_examples_count: int = 0

    class Config:
        from_attributes = True


# Example Schema for structured examples
class ExampleItem(BaseModel):
    sentence: str
    translation: Optional[str] = None


# Card Schemas
class CardBase(BaseModel):
    word: str
    definition: str
    synonyms: Optional[List[str]] = None
    examples: Optional[List[ExampleItem]] = None


class CardCreate(CardBase):
    pass


class CardUpdate(BaseModel):
    word: Optional[str] = None
    definition: Optional[str] = None
    synonyms: Optional[List[str]] = None
    examples: Optional[List[ExampleItem]] = None


class CardResponse(CardBase):
    id: int
    deck_id: int
    interval: int
    repetition: int
    ease_factor: float
    next_review_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# Study Schemas
class ReviewRequest(BaseModel):
    quality: int = Field(..., ge=0, le=5, description="Quality score: 0=Forgot, 3=Hard, 4=Good, 5=Easy")


class ReviewResponse(BaseModel):
    card_id: int
    new_interval: int
    new_ease_factor: float
    next_review_date: datetime


# Import Schemas
class ImportCard(BaseModel):
    word: str
    definition: str = Field(..., alias="def")
    synonyms: Optional[List[str]] = None
    examples: Optional[List[ExampleItem]] = None

    class Config:
        populate_by_name = True


class ImportRequest(BaseModel):
    deck_id: int
    cards: List[ImportCard]


class ImportResponse(BaseModel):
    imported_count: int
    deck_id: int


# Library Schemas
class DeckInFolder(BaseModel):
    id: int
    name: str
    card_count: int
    mastered_count: int
    due_count: int
    cards_with_examples_count: int = 0

    class Config:
        from_attributes = True


class FolderWithDecks(BaseModel):
    id: int
    name: str
    decks: List[DeckInFolder]

    class Config:
        from_attributes = True


class LibraryResponse(BaseModel):
    folders: List[FolderWithDecks]
    root_decks: List[DeckInFolder]


# CSV Import Schema
class CSVImportRequest(BaseModel):
    deck_id: int
    csv_data: str  # Raw CSV string: word,definition,example_sentence


# Multi-deck Study Schema
class MultiDeckStudyRequest(BaseModel):
    deck_ids: List[int]
    mode: str = "due"  # "due" or "all"
    limit: int = 15  # 0 for no limit
    with_examples_only: bool = False  # Filter for cards with examples (for cloze mode)


# PDF Import Schema
class PDFImportRequest(BaseModel):
    deck_id: int


class PDFImportResponse(BaseModel):
    imported_count: int
    deck_id: int
    cards_preview: List[CardBase]  # Preview of imported cards
