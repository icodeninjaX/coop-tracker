# Supabase Authentication Setup

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub (recommended)
4. Click "New project"
5. Choose your organization
6. Fill in project details:
   - Name: `coop-tracker` (or your preferred name)
   - Database Password: Generate a strong password
   - Region: Choose closest to your users
7. Click "Create new project"

## 2. Set Up Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase.sql` from your project
3. Paste it into a new query
4. Click "Run" to execute

This creates:

- `coop_state` table for storing user data
- Row Level Security (RLS) policies
- Proper indexes for performance

## 3. Configure Environment Variables

1. In Supabase dashboard, go to **Settings > API**
2. Copy your project URL and anon key
3. In your project, copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
4. Update `.env.local` with your actual values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## 4. Configure Authentication (Optional but Recommended)

### Email Authentication (Default)

No additional setup needed. Users can sign up with email/password.

### Social Authentication (Optional)

To enable Google, GitHub, etc.:

1. Go to **Authentication > Settings**
2. Scroll to "Auth Providers"
3. Configure your preferred providers

### Email Templates (Optional)

1. Go to **Authentication > Templates**
2. Customize signup confirmation, password reset emails

## 5. Test Your Setup

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`

3. You should see the authentication form

4. Test sign up:
   - Enter email and password
   - Click "Create account"
   - Check your email for confirmation link (if email confirmation is enabled)
   - Click confirmation link
   - You should be redirected and logged in

## 6. User Management

### View Users

- Go to **Authentication > Users** in Supabase dashboard
- See all registered users
- Manually verify users if needed

### User Roles (Advanced)

If you need admin users or roles:

1. Go to **Authentication > Users**
2. Click on a user
3. In "Raw User Meta Data", add:
   ```json
   {
     "role": "admin"
   }
   ```

## 7. Security Considerations

### Row Level Security

- ✅ Already configured - users can only access their own data
- Each user's coop data is completely isolated

### Environment Variables

- ✅ Never commit `.env.local` to version control
- ✅ Use different Supabase projects for development/production

### Password Policy

- Configure in **Authentication > Settings**
- Set minimum password length, complexity requirements

## 8. Troubleshooting

### "Supabase not configured" error

- Check your `.env.local` file exists and has correct values
- Restart your development server after adding environment variables

### Users can't sign up

- Check email confirmation settings in **Authentication > Settings**
- If using custom domain, configure email settings

### Authentication state issues

- Clear localStorage: `localStorage.clear()` in browser console
- Check browser network tab for authentication errors

### Database connection errors

- Verify your database is running in Supabase dashboard
- Check the SQL was executed successfully

## 9. Production Deployment

### Vercel/Netlify

1. Add environment variables to your deployment platform
2. Use production Supabase project URL and keys

### Custom Domain (Optional)

1. In Supabase: **Settings > General > Custom domain**
2. Follow instructions to set up custom domain
3. Update your environment variables

## 10. Backup Strategy

### Automatic Backups

- Supabase automatically backs up your database
- View in **Database > Backups**

### Manual Export

```sql
-- Export all user data
SELECT user_id, data FROM coop_state;
```

Need help? Check the [Supabase documentation](https://supabase.com/docs) or create an issue in the project repository.
