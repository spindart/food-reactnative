# Food Delivery Application

This is a full-stack food delivery application with a **React Native** frontend and a **Node.js** backend. The backend uses **TypeScript**, **Prisma**, and **PostgreSQL** for database management. The frontend is styled with **Tailwind CSS** and supports push notifications using **Expo Notifications**.

## Features

### Backend
- User authentication (register, login, logout) with JWT.
- CRUD operations for establishments, products, and orders.
- WebSocket notifications for real-time updates.
- Prisma ORM for database management.

### Frontend
- React Native app with Expo.
- Product listing and details.
- Cart management and checkout.
- Push notifications for order status updates.
- Tailwind CSS for styling.

## Prerequisites

- **Node.js** (v18 or later)
- **Docker** and **Docker Compose**
- **Expo CLI** (for frontend development)

## Local Development Setup

### Backend

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd food
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   - Ensure Docker is running.
   - Start the database using Docker Compose:
     ```bash
     docker-compose up -d db
     ```

4. Apply Prisma migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Start the backend server:
   ```bash
   npm run dev
   ```

The backend will be available at `http://localhost:3000`.

### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd front
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npm run start
   ```

4. Follow the instructions in the terminal to open the app on your device or emulator.

## Docker Setup

To run the entire application with Docker:

1. Build and start the services:
   ```bash
   docker-compose up --build
   ```

2. Access the services:
   - Backend: `http://localhost:3000`
   - Adminer (Database Manager): `http://localhost:8080`

## Testing

1. Run unit tests:
   ```bash
   npm test
   ```

2. Lint and format the code:
   ```bash
   npm run lint
   npm run format
   ```

## Deployment

### Backend
- The backend is configured to build a Docker image and push it to GitHub Container Registry.
- Deployment to Render is automated via GitHub Actions.

### Frontend
- The frontend is built for production using the provided Dockerfile.

## CI/CD

The project includes a GitHub Actions workflow for:
- Running tests, linting, and type-checking.
- Building and publishing Docker images.
- Deploying to Render after merging to the `main` branch.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
DATABASE_URL=postgres://<user>:<password>@localhost:5432/food_db
JWT_SECRET=your_jwt_secret
```