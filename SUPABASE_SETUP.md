# Supabase Wishlist Table Setup

## 🗄️ Database Setup

### 1. Create the Wishlist Table

Go to your Supabase dashboard and run this SQL in the SQL Editor:

```sql
-- Create wishlist table
CREATE TABLE IF NOT EXISTS wishlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    book_key TEXT NOT NULL,
    book_title TEXT,
    book_author TEXT,
    book_cover_url TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, book_key)
);

-- Enable Row Level Security (RLS)
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own wishlist items
CREATE POLICY "Users can view their own wishlist items" ON wishlist
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own wishlist items
CREATE POLICY "Users can insert their own wishlist items" ON wishlist
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete their own wishlist items
CREATE POLICY "Users can delete their own wishlist items" ON wishlist
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_book_key ON wishlist(book_key);
```

### 2. Verify the Setup

After running the SQL:

1. **Check the table exists**: Go to Table Editor → `wishlist`
2. **Verify RLS is enabled**: The table should show "RLS enabled"
3. **Check policies**: Go to Authentication → Policies to see the policies

## 🔐 Security Features

- **Row Level Security (RLS)**: Users can only see their own wishlist items
- **User-specific data**: Each user has their own isolated wishlist
- **Automatic cleanup**: When a user is deleted, their wishlist items are automatically removed

## 📊 Table Structure

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `user_id` | UUID | References auth.users(id) |
| `book_key` | TEXT | Open Library book identifier |
| `book_title` | TEXT | Book title |
| `book_author` | TEXT | Book author |
| `book_cover_url` | TEXT | Book cover image URL |
| `added_at` | TIMESTAMP | When the book was added to wishlist |

## 🚀 Benefits of Supabase Storage

- **Persistent across devices**: Wishlist syncs across all user devices
- **Secure**: Data is protected by RLS policies
- **Scalable**: Can handle thousands of users and wishlist items
- **Real-time**: Can be extended with real-time subscriptions
- **Backup**: Automatic backups and data protection

## 🔧 Migration from localStorage

The code now uses Supabase instead of localStorage, providing:
- Better security
- Cross-device synchronization
- Data persistence
- User-specific isolation 