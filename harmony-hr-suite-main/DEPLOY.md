# Deploy to Vercel

The project has been prepared for Vercel deployment.

## Prerequisites
- **Git Repository**: Initialized locally.
- **Vercel CLI**: Detected as installed (v48.9.0).
- **Vercel Configuration**: `vercel.json` added for SPA routing.

## Deployment Steps

1.  **Open Terminal**: Open your terminal in this directory.
2.  **Login**: Ensure you are logged in to the account that has access to the team `imrans-projects-faf1daf5`.
    ```bash
    vercel login
    ```
3.  **Deploy**: Run the deployment command.
    ```bash
    vercel deploy --prod
    ```
4.  **Follow Prompts**:
    - **Set up and deploy?**: `Y`
    - **Which scope?**: Select `imrans-projects-faf1daf5` (or similar).
    - **Link to existing project?**: `N` (unless you already created it).
    - **Project Name**: `harmony-hr-suite` (or your preference).
    - **Directory**: `./` (default).
    - **Build settings**: Default (Vite should be detected).

## Environment Variables
Ensure you add your Supabase credentials in the Vercel Project Settings > Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

## Manual Deployment (Git)
Alternatively, create a new repository on GitHub, push this code, and import it via the Vercel Dashboard using the URL you provided.
