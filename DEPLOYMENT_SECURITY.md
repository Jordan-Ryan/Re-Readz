# Deployment Security Guide

## Supabase Credentials Security

### Current Setup
- **Development**: Credentials are in `config.js` (this is normal for anon keys)
- **Production**: Should use environment variables

### Why Anon Keys Are Safe
- **Anon keys** are designed to be public and safe to expose in client-side code
- **Real security** comes from Row Level Security (RLS) policies in Supabase
- **Anon keys** only allow operations that RLS policies permit

### Production Deployment Options

#### Option 1: Environment Variables (Recommended)
1. **Set environment variables** in your hosting platform:
   ```
   SUPABASE_URL=https://yyqpfpccrcvkbgtrsxmb.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   ```

2. **Generate config.js** during build:
   ```bash
   echo "window.SUPABASE_CONFIG = { url: '$SUPABASE_URL', anonKey: '$SUPABASE_ANON_KEY' };" > config.js
   ```

#### Option 2: Backend API Proxy (Most Secure)
1. **Create a backend API** (Node.js, Python, etc.)
2. **Store credentials** in backend environment variables
3. **Proxy requests** through your backend
4. **Never expose** credentials to client-side code

#### Option 3: Keep Current Setup (Acceptable)
- **Anon keys are safe** to expose in client-side code
- **RLS policies** provide the real security
- **Current setup** is acceptable for most applications

### Security Best Practices
1. **Enable RLS** on all tables (already done for wishlist)
2. **Use specific policies** for each operation
3. **Never expose service role keys** (only anon keys)
4. **Regularly rotate keys** if needed
5. **Monitor usage** in Supabase dashboard

### Current Security Status
✅ **RLS enabled** on wishlist table  
✅ **User-specific policies** implemented  
✅ **Anon key only** (no service role key exposed)  
✅ **Input validation** implemented  
✅ **Error handling** implemented  

The current setup is secure for a client-side application using Supabase. 