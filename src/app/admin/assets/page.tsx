useEffect(() => {
    const fetchTicketsAndStaff = async () => {
      try {
        const { data: staffData } = await supabase.from('staff').select('emp_code, name');
        const staffMap: Record<string, string> = {};
        if (staffData) staffData.forEach((staff: any) => staffMap[staff.emp_code] = staff.name);

        const { data: ticketData } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
        if (ticketData) {
          const mappedTickets: SupportTicket[] = ticketData.map((t: any) => ({
            id: t.id,
            title: t.subject || t.title || 'No Subject Provided', 
            description: t.description || 'No description',
            priority: t.priority || 'Medium',
            status: t.status || 'Open',
            estimatedTime: t.waiting_time || '', 
            submittedBy: staffMap[t.emp_code] || 'Unknown User', 
            empCode: t.emp_code || 'N/A',
            date: t.created_at ? new Date(t.created_at).toISOString().split('T')[0] : '',
            replies: t.replies || [] 
          }));
          setTickets(mappedTickets);
        }
      } catch (error) {
        console.error("Error fetching tickets:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchTicketsAndStaff();

    // REAL-TIME LISTENER FOR ADMIN TICKETS
    const channel = supabase.channel('admin_tickets_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchTicketsAndStaff(); // Refresh instantly
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);