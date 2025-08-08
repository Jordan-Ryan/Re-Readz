// Security validation
if (!SUPABASE_URL || SUPABASE_URL === "YOUR_SUPABASE_URL") {
    console.error("SUPABASE_URL not configured");
}
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY") {
    console.error("SUPABASE_ANON_KEY not configured");
}

// Security utilities
function sanitizeInput(input) {
    if (typeof input !== "string") return "";
    return input.trim().replace(/[<>]/g, "");
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}
