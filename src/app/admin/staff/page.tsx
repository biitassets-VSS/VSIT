const handleBulkUploadSubmit = async () => {
    if (!selectedFile) return alert("Please select a file first.");
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (text) {
        const rows = text.split('\n').slice(1); // Skip Header
        const newStaffDB: any[] = [];
        
        // --- NEW HELPER FUNCTION TO FIX DATES ---
        const formatToDBDate = (dateString?: string) => {
          if (!dateString) return undefined;
          const cleanDate = dateString.trim();
          
          // If already YYYY-MM-DD, return as is
          if (cleanDate.includes('-') && cleanDate.split('-')[0].length === 4) {
            return cleanDate;
          }
          
          // If DD/MM/YYYY or DD-MM-YYYY, convert to YYYY-MM-DD
          const parts = cleanDate.split(/[\/\-]/);
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            if (year.length === 4) return `${year}-${month}-${day}`;
          }
          return cleanDate; // Fallback
        };
        // -----------------------------------------

        rows.forEach((row) => {
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
            const staffEntry: any = {
              emp_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
              name: name,
              email: email,
              department: department,
              status: 'Active'
            };

            if (password) staffEntry.password = password;
            if (phone) staffEntry.contact_number = phone;
            
            // Apply the date fix here!
            if (dob) staffEntry.dob = formatToDBDate(dob);
            if (joiningDate) staffEntry.joining_date = formatToDBDate(joiningDate);

            newStaffDB.push(staffEntry);
          }
        });

        try {
          const { data, error } = await supabase.from('staff').insert(newStaffDB).select();
          
          if (error) {
            console.error("SUPABASE REJECTED UPLOAD:", error);
            throw error; 
          }

          alert(`${newStaffDB.length} Staff members uploaded successfully!`);
          setIsBulkModalOpen(false);
          setSelectedFile(null);
          window.location.reload(); 
        } catch (error: any) {
          console.error("Full Error Details:", error);
          alert(`Upload Failed: ${error.message || error.details || 'Check console for details'}`);
        } finally {
          setIsUploading(false);
        }
      }
    };
    reader.readAsText(selectedFile);
  };