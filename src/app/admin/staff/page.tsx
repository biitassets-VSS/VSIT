const handleBulkUploadSubmit = async () => {
    if (!selectedFile) return alert("Please select a file first.");
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (text) {
        const rows = text.split('\n').slice(1); // Skip Header
        const newStaffDB: any[] = [];
        
        rows.forEach((row) => {
          // CRITICAL FIX: Remove hidden carriage returns from CSV
          const cleanRow = row.replace(/\r/g, ''); 
          if (!cleanRow.trim()) return;
          
          const cols = cleanRow.split(',');
          const name = cols[0]?.trim();
          const email = cols[1]?.trim();
          const password = cols[2]?.trim();
          const phone = cols[3]?.trim();
          const department = cols[4]?.trim() || 'IT Department';
          const dob = cols[5]?.trim();
          const joiningDate = cols[6]?.trim();

          if (name && email) {
            // Build payload dynamically so empty strings don't crash database Date fields
            const staffEntry: any = {
              emp_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
              name: name,
              email: email,
              department: department,
              status: 'Active'
            };

            // Only add these if they actually exist in the CSV row
            if (password) staffEntry.password = password;
            if (phone) staffEntry.contact_number = phone;
            if (dob) staffEntry.dob = dob;
            if (joiningDate) staffEntry.joining_date = joiningDate;

            newStaffDB.push(staffEntry);
          }
        });

        try {
          const { data, error } = await supabase.from('staff').insert(newStaffDB).select();
          
          if (error) {
            console.error("SUPABASE REJECTED UPLOAD:", error);
            throw error; // Pass error to catch block
          }

          alert(`${newStaffDB.length} Staff members uploaded successfully!`);
          setIsBulkModalOpen(false);
          setSelectedFile(null);
          window.location.reload(); 
        } catch (error: any) {
          console.error("Full Error Details:", error);
          // Show the exact database error to the user
          alert(`Upload Failed: ${error.message || error.details || 'Check console for details'}`);
        } finally {
          setIsUploading(false);
        }
      }
    };
    reader.readAsText(selectedFile);
  };