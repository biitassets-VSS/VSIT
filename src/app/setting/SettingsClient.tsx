// Put this right below the <h2>User Access Management</h2> and <p> tags:

<button 
  onClick={async () => {
    const confirm = window.confirm("This will auto-create login accounts for all staff with the password 'TemporaryPassword123!'. Continue?");
    if (!confirm) return;
    
    const res = await fetch('/api/staff/auto-create', { method: 'POST' });
    const data = await res.json();
    
    if (data.success) {
      alert(data.message);
    } else {
      alert("Error: " + data.error);
    }
  }}
  className="bg-orange-100 text-orange-700 hover:bg-orange-200 px-4 py-2 rounded-xl text-sm font-bold transition-colors mt-4 mb-4"
>
  Auto-Generate Login Accounts for Staff
</button>