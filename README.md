# School Admin Web

## Setup
1. Open terminal in this folder.
2. Install dependencies: `npm install`
3. Copy env file: `.env.example` to `.env`
4. Update `VITE_API_BASE_URL` to your API URL.
5. Start app: `npm run dev`

## Login
- Uses `POST /api/auth/login`.
- Only `Administrator` role can access app routes.

## Initial Modules
- Dashboard
- Employee Management
  - List/search/filter
  - Create/update/soft delete
  - Assign classes (POST /api/employee/{empId}/classes)
  - Assign subjects (POST /api/employee/{empId}/subjects)
