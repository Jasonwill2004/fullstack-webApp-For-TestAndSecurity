# Day 19 – App Architecture & Endpoint Summary

## ✅ Local Setup
- Cloned from: https://github.com/Jasonwill2004/fullstack-webApp-For-TestAndSecurity.git
- All dependencies installed at root level (unified structure)
- Launched using `npm run start-dev` which runs:
  - Frontend (webpack-dev-server)
  - Backend (nodemon with babel-node)

## 🏗️ Architecture

### Frontend: `/src/app`
- Built using **React.js + Redux**
- Key Components:
  - `Dashboard.jsx`: Main application view
  - `Login.jsx` & `Signup.jsx`: Authentication flows
  - `TaskDetail.jsx` & `TaskList.jsx`: Task management
  - `Navigation.jsx`: App navigation
- Uses Redux store (`/src/app/store`)
  - `sagas.js`: Handles async operations
  - `mutations.js`: State updates
  - `reducer.js`: State management

### Backend: `/src/server`
- Built using **Express.js**
- MongoDB for database
- Key Files:
  - `server.js`: Main Express application
  - `authenticate.js`: Authentication logic
  - `communicate-db.js`: Database operations
  - `connect-db.js`: MongoDB connection
  - `initialize-db.js`: Database setup

### Environment
- MongoDB URI: `mongodb://localhost:27017/organizer`
- Frontend Port: 8080
- Backend Port: 7777

## 🌐 Endpoints Overview

| Method | Endpoint           | Description                    |
|--------|-------------------|--------------------------------|
| POST   | `/authenticate`   | User login                     |
| POST   | `/user/create`    | Create new user account        |
| GET    | `/tasks`         | Retrieve all tasks             |
| POST   | `/task/new`      | Create a new task              |
| POST   | `/task/update`   | Update existing task           |

## 🔁 UI Flow Observed
1. **Authentication Flow**
   - User starts at login page
   - Can switch to signup for new account
   - Redirects to dashboard after authentication

2. **Task Management Flow**
   - Dashboard displays task list
   - Can create new tasks
   - Can view task details
   - Can update task status
   - Can navigate between different views

## 💾 Data Structure
```javascript
Task {
  id: string,
  name: string,
  isComplete: boolean
}

User {
  id: string,
  username: string,
  passwordHash: string
}
```

## 🔧 Technical Stack
- **Frontend**: React, Redux, Redux-Saga
- **Backend**: Express, MongoDB
- **Build Tools**: Webpack, Babel
- **Development**: Nodemon, Concurrently
