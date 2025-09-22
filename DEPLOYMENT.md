# Deploying to Vercel

This guide walks you through deploying your Fathom AI Learning Platform to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com)
2. A [Supabase project](https://supabase.com) set up
3. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Environment Variables

You'll need to set up the following environment variables in your Vercel project:

### Required Variables
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Optional Variables
```
EMBEDDINGS_MODEL=e5-small
TUTOR_MODEL=tutor-instruct-small
HUGGINGFACE_API_TOKEN=your_huggingface_token
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_vercel_analytics_id
```

## Deployment Steps

### Method 1: Deploy via Vercel Dashboard

1. **Connect your repository:**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "New Project"
   - Import your Git repository

2. **Configure the project:**
   - Framework Preset: Next.js (should be auto-detected)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

3. **Set environment variables:**
   - In the project settings, go to "Environment Variables"
   - Add all the required variables listed above
   - Get your Supabase credentials from your Supabase project dashboard

4. **Deploy:**
   - Click "Deploy"
   - Your app will be built and deployed automatically

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from your project directory:**
   ```bash
   vercel
   ```

4. **Set environment variables:**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   # Add other variables as needed
   ```

5. **Redeploy with environment variables:**
   ```bash
   vercel --prod
   ```

## Supabase Setup

Make sure your Supabase project is properly configured:

1. **Enable pgvector extension:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Run migrations:**
   - Apply all SQL files in your `/migrations` or `/scripts` directory
   - Set up Row Level Security (RLS) policies

3. **Configure authentication:**
   - Set up your preferred auth providers in Supabase
   - Add your Vercel domain to the allowed origins

## Post-Deployment

1. **Test your deployment:**
   - Visit your Vercel URL
   - Try the guest mode functionality
   - Test user registration and login

2. **Set up custom domain (optional):**
   - In Vercel dashboard, go to "Domains"
   - Add your custom domain
   - Configure DNS settings as instructed

3. **Monitor performance:**
   - Use Vercel Analytics (already included in package.json)
   - Monitor Supabase usage and performance

## Troubleshooting

### Common Issues

1. **Build fails:**
   - Check that all environment variables are set
   - Ensure TypeScript and ESLint errors are resolved
   - Check the build logs in Vercel dashboard

2. **Database connection issues:**
   - Verify Supabase URL and keys are correct
   - Check that RLS policies allow your operations
   - Ensure pgvector extension is enabled

3. **API routes not working:**
   - Check that API routes are in the correct `/app/api` directory structure
   - Verify environment variables are available on the server side

### Getting Help

- Check [Vercel documentation](https://vercel.com/docs)
- Review [Next.js deployment docs](https://nextjs.org/docs/deployment)
- Check [Supabase documentation](https://supabase.com/docs)

## Automatic Deployments

Once set up, Vercel will automatically deploy:
- **Production deployments:** When you push to your main branch
- **Preview deployments:** When you create pull requests

Your app will be available at `https://your-project-name.vercel.app`
