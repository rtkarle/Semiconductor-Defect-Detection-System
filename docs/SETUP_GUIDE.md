# Local Setup Guide

## Windows (XAMPP Environment)

### Backend

```bat
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
:: Edit .env with DB credentials
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bat
cd frontend
npm install
copy .env.example .env
npm run dev
```

### MySQL (XAMPP)

1. Start XAMPP → Start MySQL
2. Open phpMyAdmin → http://localhost/phpmyadmin
3. Import `database/schema.sql`
4. Import `database/seed_data.sql`

### .env for Backend (XAMPP MySQL)

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=semiconductor_defect_db
DB_USER=root
DB_PASSWORD=          ← blank for XAMPP default
SECRET_KEY=my_super_secret_key_change_in_prod
DEBUG=True
ALLOWED_ORIGINS=http://localhost:3000
```

## Verify Installation

- Backend health: http://localhost:8000/health
- API docs:       http://localhost:8000/docs
- Frontend:       http://localhost:3000

## Common Issues

| Issue | Fix |
|-------|-----|
| `ModuleNotFoundError: cv2` | `pip install opencv-python-headless` |
| MySQL connection refused | Ensure XAMPP MySQL is running on port 3306 |
| CORS error in browser | Add `http://localhost:3000` to `ALLOWED_ORIGINS` in .env |
| JWT decode error | Ensure `SECRET_KEY` is the same in all environments |
| `ultralytics` import error | `pip install ultralytics` |
