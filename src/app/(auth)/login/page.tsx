  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email, password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // STRICT Verify role and redirect
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    // If no profile is found, or there is a database error
    if (profileError || !profile) {
      setError("Database Error: No profile found for this user, or RLS is blocking access. Please check your Supabase profiles table.")
      setLoading(false)
      return
    }

    // Strict routing based on exact role
    if (profile.role === 'admin') {
      router.push('/admin/dashboard')
    } else if (profile.role === 'staff') {
      router.push('/staff/dashboard')
    } else {
      setError(`Error: Unknown role '${profile.role}'. Please change it to 'admin' or 'staff' in Supabase.`)
      setLoading(false)
    }
  }
