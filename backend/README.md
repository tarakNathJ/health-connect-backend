# HealthConnect Backend API

This is the backend API for the HealthConnect application, which provides authentication services and health data management.

## Features

- User registration and authentication
- JWT-based authentication
- User profile management
- MongoDB database integration
- Secure password handling with bcrypt

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB Atlas account or local MongoDB instance

### Installation

1. Clone the repository
2. Navigate to the backend directory:
   ```
   cd backend
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Create a `.env` file in the root of the backend directory with the following variables:
   ```
   MONGODB_URI=mongodb+srv://your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   PORT=5000
   NODE_ENV=development
   ```

### Running the Server

Development mode:
```
npm run dev
```

Production mode:
```
npm start
```

## API Endpoints

### Authentication

- **Register a new user**
  - POST `/api/auth/register`
  - Body: `{ "name": "User Name", "email": "user@example.com", "password": "password123" }`

- **Login**
  - POST `/api/auth/login`
  - Body: `{ "email": "user@example.com", "password": "password123" }`

- **Get user profile**
  - GET `/api/auth/profile`
  - Headers: `Authorization: Bearer YOUR_TOKEN`

- **Update user profile**
  - PUT `/api/auth/profile`
  - Headers: `Authorization: Bearer YOUR_TOKEN`
  - Body: `{ "name": "Updated Name", "email": "updated@example.com", "password": "newpassword" }` (all fields optional)

## Security

- Passwords are hashed using bcrypt
- Authentication is handled with JWT tokens
- Validation is performed on all input data

## Development

The API is built with the following technologies:
- Express.js for the server
- Mongoose for MongoDB object modeling
- JWT for authentication
- Express Validator for input validation

## Frontend Integration

The frontend can connect to this API by setting the `VITE_API_URL` environment variable in your frontend's `.env` file:

```
VITE_API_URL=http://localhost:5000/api
```

Then use this URL for all API requests. 
