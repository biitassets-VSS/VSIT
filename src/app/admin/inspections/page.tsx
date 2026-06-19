useEffect(() => {
    const fetchInspections = async () => {
      try {
        const { data: staffData } = await supabase.from('staff').select('emp_code, name');
        const staffMap: Record<string, string> = {};
        if (staffData) staffData.forEach((s: any) => staffMap[s.emp_code] = s.name);

        const { data: assetData } = await supabase.from('assets').select('*').not('inspection_status', 'is', null).order('updated_at', { ascending: false });
        if (assetData) {
          setAssets(assetData.map((a: any) => ({
            ...a,
            staff_name: staffMap[a.emp_code] || 'Unassigned',
            photos: a.photos || [],
            inspection_notes: a.inspection_notes || 'No notes provided.'
          })));
        }
      } catch (error) {
        console.error("Error fetching inspections:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInspections();

    // REAL-TIME LISTENER FOR ADMIN INSPECTIONS
    const channel = supabase.channel('admin_assets_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, () => {
        fetchInspections(); // Refresh instantly
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);