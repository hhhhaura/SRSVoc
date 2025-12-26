# SRS Vocabulary Web App

A Spaced Repetition System (SRS) vocabulary learning application with React frontend and FastAPI backend.

## Features

- **User Authentication**: JWT-based authentication with registration and login
- **Library Management**: Organize decks into folders
- **Flashcard Study**: Flip cards with word/definition
- **Cloze Deletion**: Fill-in-the-blank exercises using `*word*` syntax
- **SM-2 Algorithm**: Intelligent spaced repetition scheduling
- **Batch Import**: Import multiple cards at once

## Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- Lucide React (Icons)
- Axios
- React Router

### Backend
- Python FastAPI
- SQLAlchemy (ORM)
- Pydantic
- SQLite
- JWT Authentication

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI app entry
│   ├── database.py          # Database configuration
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # JWT authentication
│   ├── srs_logic.py         # SM-2 algorithm
│   ├── requirements.txt     # Python dependencies
│   └── routers/
│       ├── auth_router.py   # Auth endpoints
│       ├── library_router.py # Library CRUD
│       └── study_router.py  # Study session
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── api/             # API layer with Axios
        ├── components/      # Reusable UI components
        ├── context/         # React context (Auth)
        └── pages/           # Page components
```

## Getting Started

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend will be available at `http://localhost:5173` and the API at `http://localhost:8000`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/token` | Login and get JWT token |
| POST | `/register` | Register new user |
| GET | `/me` | Get current user info |
| GET | `/library` | Get folders and decks |
| POST | `/library/folders` | Create folder |
| DELETE | `/library/folders/{id}` | Delete folder (decks move to root) |
| POST | `/library/decks` | Create deck |
| DELETE | `/library/decks/{id}` | Delete deck (cascade delete cards) |
| GET | `/library/decks/{id}/cards` | Get cards in deck |
| POST | `/library/decks/{id}/cards` | Create card |
| GET | `/study/{deck_id}` | Get up to 15 due cards |
| POST | `/study/{card_id}/review` | Submit review (SM-2) |
| POST | `/import` | Batch import cards |

## SM-2 Algorithm

The app uses the SuperMemo-2 algorithm for spaced repetition:

- **Quality 0**: Forgot - Reset interval to 1 day
- **Quality 3**: Hard - Increase interval with lower multiplier
- **Quality 4**: Good - Standard interval increase
- **Quality 5**: Easy - Maximum interval increase

Cards with interval > 3 days are considered "mastered".

## Cloze Deletion

Use asterisks to mark cloze deletions in example sentences:

```
He ate an *apple* yesterday.
```

This will render as a fill-in-the-blank exercise where users type "apple".
