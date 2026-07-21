# LexiGuard AI — Authentication API Specification

This document details the REST API specifications for user onboarding and session management.

## Base URL
All API requests are relative to:
`http://localhost:8080`

---

## 1. Register User

Exposes user signup with validations.

* **URL:** `/auth/register`
* **Method:** `POST`
* **Headers:** 
  * `Content-Type: application/json`

### Request Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "ROLE_USER",
    "createdAt": "2026-07-17T19:50:00"
  }
}
```

### Validation Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "email: Invalid email format",
    "password: Password must be between 6 and 40 characters"
  ]
}
```

### Duplicate Email Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Email is already in use"
}
```

---

## 2. Authenticate User (Login)

Exposes user sign-in and JWT issuance.

* **URL:** `/auth/login`
* **Method:** `POST`
* **Headers:** 
  * `Content-Type: application/json`

### Request Body
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "type": "Bearer",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "ROLE_USER",
      "createdAt": "2026-07-17T19:50:00"
    }
  }
}
```

### Bad Credentials Response (401 Unauthorized)
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

## 3. Retrieve Profile (Me)

Exposes user information details matching current session token.

* **URL:** `/users/me`
* **Method:** `GET`
* **Headers:** 
  * `Authorization: Bearer <jwt_token>`

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "ROLE_USER",
    "createdAt": "2026-07-17T19:50:00"
  }
}
```

### Missing/Invalid Token Response (403 Forbidden)
Standard Spring Security access denied response or:
```json
{
  "success": false,
  "message": "Access Denied / Unauthorized"
}
```
