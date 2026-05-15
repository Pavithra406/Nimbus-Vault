# nimbus-vault

A full-stack web application for secure, redundant file management across multiple storage backends — with role-based access control, activity tracking, and end-to-end encryption.

---

## Features

- JWT-based authentication with role-based access (admin / user)
- File encryption before storage using AES
- Multi-cloud replication with automatic failover
- Activity log tracking per user
- Admin dashboard for user and system management
- Responsive UI built with React and Tailwind CSS

---

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | React 19, Vite, Tailwind CSS v4, React Router v7 |
| Backend   | Node.js, Express 5                      |
| Database  | MySQL                                   |
| Storage   | AWS S3, Google Cloud Storage, Firebase  |
| Auth      | JWT, Bcrypt                             |
| Uploads   | Multer                                  |

---

## Project Structure

```
nimbus-vault/
├── backend/
│   ├── config/          # DB and cloud config
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth, admin, upload middleware
│   ├── routes/          # Express route definitions
│   ├── services/        # Encryption, cloud storage, activity logging
│   └── server.js
└── frontend/
    └── src/
        ├── components/  # Layout, route guards
        ├── pages/       # All app pages
        └── App.jsx
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- MySQL database
- Cloud credentials (AWS, GCP, Firebase)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/nimbus-vault.git
cd nimbus-vault
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Fill in your `.env`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=nimbus_vault

JWT_SECRET=your_jwt_secret

AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=...
AWS_REGION=...

GCP_PROJECT_ID=...
GCP_BUCKET_NAME=...
GCP_KEY_FILE=...

FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_SERVICE_ACCOUNT_KEY=...

ENCRYPTION_KEY=your_32_byte_hex_key
```

### 3. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 4. Run the app

Backend:
```bash
cd backend
node server.js
# or with auto-reload:
npx nodemon server.js
```

Frontend:
```bash
cd frontend
npm run dev
```

Frontend runs at `http://localhost:5173`, backend at `http://localhost:5000`.

---

## API Overview

| Method | Endpoint              | Description              | Auth     |
|--------|-----------------------|--------------------------|----------|
| POST   | /api/auth/register    | Register a new user      | Public   |
| POST   | /api/auth/login       | Login and get token      | Public   |
| GET    | /api/auth/me          | Get current user profile | Required |
| POST   | /api/upload           | Upload and encrypt file  | Required |
| GET    | /api/files            | List user's files        | Required |
| GET    | /api/files/:id        | Download a file          | Required |
| DELETE | /api/files/:id        | Delete a file            | Required |
| GET    | /api/admin/users      | List all users           | Admin    |
| GET    | /api/activity         | View activity log        | Required |

---

## Notes

- The first registered user is automatically granted admin privileges.
- Files are encrypted before leaving the server — cloud providers never see plaintext data.
- If a primary cloud provider is unavailable, the system falls back to the next available target automatically.

---

## License

MIT
"# Nimbus-Vault" 
