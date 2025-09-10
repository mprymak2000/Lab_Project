# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a lab plasmid management system with a React frontend and Flask backend, designed for tracking cesium chloride plasmids in laboratory storage bags. The system allows searching, adding, modifying, and deleting plasmid records stored in a PostgreSQL database.

## Architecture

- **Frontend**: React 19 with Vite, styled with Tailwind CSS
- **Backend**: Flask with CORS support, using psycopg2 for PostgreSQL connectivity
- **Database**: PostgreSQL running in Docker container
- **Infrastructure**: Docker Compose orchestration with separate services for database, pgAdmin, and backend

The backend uses a singleton pattern for database connections (`PlasmidDatabase` class) and implements business logic through a refactored module (`business_logic_refactor.py`).

## Common Commands

### Frontend Development
```bash
cd frontend
npm run dev          # Start development server on localhost:3000
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend Development
```bash
cd backend
python app.py        # Run Flask development server on localhost:5000
python -m pytest test_business_logic.py test_plasmid.py  # Run tests
```

### Docker Operations
```bash
docker-compose up -d    # Start all services (database, pgAdmin, backend)
docker-compose down     # Stop all services
docker-compose logs backend  # View backend logs
```

### Database Access
- PostgreSQL: localhost:5432 (lab_user/lab_pass, database: lab_db)
- pgAdmin: localhost:8080 (admin@lab.com/admin)

## API Endpoints

The Flask backend exposes these REST endpoints:
- `GET /health` - Health check
- `POST /api/search` - Search plasmids by collection
- `POST /api/add` - Add new plasmid record
- `PUT /api/modify` - Modify existing plasmid
- `DELETE /api/delete` - Delete plasmid record

## Key Files

- `backend/business_logic_refactor.py` - Core business logic and database operations
- `backend/app.py` - Flask API server with route definitions
- `frontend/src/App.jsx` - Main React component with search interface
- `frontend/src/BagCard.jsx` - Component for displaying bag information
- `Docker-Compose.yml` - Infrastructure configuration
- `Data/` - Contains SQL scripts and CSV data files

## Development Notes

The frontend has a search bug in App.jsx:102 where the onClick handler references `{handleSearch}` instead of calling `handleSearch()`. The backend uses hardcoded database credentials that should be moved to environment variables.