const handleLogin = async (email, password) => {
  try {
    // 1. Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) throw authError;

    // 2. Fetch their Role from the Profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('email', email)
      .single();

    const userRole = profile?.role || 'staff'; // Default to staff just in case

    // 3. Route them to the correct dashboard based on role!
    if (userRole === 'admin') {
      router.push('/admin'); // Sends Lakhwinder to Admin
    } 
    else if (userRole === 'guest') {
      // Send to Staff dashboard, but append a 'demo' flag to the URL
      router.push('/staff?mode=demo'); 
    } 
    else {
      router.push('/staff'); // Standard staff
    }

  } catch (error) {
    alert("Login failed: " + error.message);
  }
}