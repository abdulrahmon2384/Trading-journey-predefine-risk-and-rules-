# Deploying to Render

This project is optimized for deployment on [Render](https://render.com) as a **Static Site**.

## Option 1: Using the Blueprint (Recommended)

1. Connect your GitHub repository to Render.
2. Go to the **Blueprints** section in the Render Dashboard.
3. Click **New Blueprint Instance**.
4. Select this repository.
5. Render will automatically detect the `render.yaml` file and configure:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - **Environment Variables**: It will prompt you to enter `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Option 2: Manual Setup

If you prefer to set it up manually:

1. Create a new **Static Site** on Render.
2. Connect your GitHub repository.
3. Set the following configurations:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Add the following **Environment Variables**:
   - `VITE_SUPABASE_URL`: Your Supabase URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.

## SPA Routing
The project includes a `public/_redirects` file and a rewrite rule in `render.yaml`. This ensures that if you add pages later (using React Router), refreshing the page won't result in a 404 error.
