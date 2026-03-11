# Vercel API Deployment

This directory contains the serverless API entry point for Vercel deployment.

## Required Environment Variables

When deploying to Vercel, you'll need to set the following environment variables:

- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `NODE_ENV`: Set to "production" for production deployments
- Any other environment variables used in your application

## Deployment Steps

1. Make sure you have the Vercel CLI installed: `npm i -g vercel`
2. Run `vercel` from the root directory of your project
3. Follow the prompts to link to your Vercel account and project

## Local Development

For local development, you can continue using the original backend structure with:

```
cd backend
npm run dev
``` 