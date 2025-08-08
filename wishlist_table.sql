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