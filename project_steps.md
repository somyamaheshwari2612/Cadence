# AWS Hackathon: Exposure Router & Eco-Streak - Project Plan

This document outlines the step-by-step approach we will take to build the project. We will go phase by phase, and after each major step, we will verify functionality using dedicated test scripts. As requested, we will keep the frontend basic initially and focus on the core logic and integrations.

## Phase 1: Environment & Foundation
1. **Initialize Monorepo Structure**: Set up the `backend` and `frontend` directories and their basic files.
2. **Setup Backend Environment**: Initialize a Python virtual environment, install dependencies (`flask`, `flask-cors`, `requests`, `google-genai`), and set up the `.env` file.
   - *Your Task*: You will need to generate and provide the Google AI Studio API key.

## Phase 2: Backend Core Services
3. **Open-Meteo Integration (`services/env_data.py`)**: Fetch and format weather and AQI data.
   - *Test*: We will write and run a script to ensure Open-Meteo data is successfully fetched and parsed.
4. **Deterministic Scheduler (`services/scheduler.py`)**: Implement mathematical rules to filter and score time slots based on user constraints.
   - *Test*: We will run a script with mock environmental data to verify the scheduling logic.
5. **Gemini Engine (`services/llm_engine.py`)**: Integrate Gemini Flash-Lite for explanations and Gemini Flash Vision for image validation.
   - *Test*: We will run a script passing dummy inputs to verify the Gemini API responses.

## Phase 3: API Endpoints
6. **Flask Server (`app.py`)**: Wire up the REST endpoints (`/api/schedule` and `/api/verify-task`) to connect the services.
   - *Test*: Start the Flask server and hit the endpoints using a Python test script to verify end-to-end backend functionality.

## Phase 4: Basic Frontend
7. **Initialize Next.js**: Scaffold the Next.js app in the `frontend` directory.
8. **Basic UI Components**: Create `RouterForm` and `Timeline` with simple styling, and connect them to our backend.
   - *Requirement*: Add a manual location input (e.g., city name or coordinates) so users don't have to grant browser location access.
   - *Test*: Submit the form from the browser and verify the backend response is displayed.

## Phase 5: Eco-Streak Feature
9. **Eco-Streak Component**: Implement the basic camera capture functionality and API calls.
10. **Final Integration Test**: Test the full vision flow from frontend capture to backend verification.
