      {/* --- CLEAN WHITE RESPONSIVE NAVBAR FOR STAFF --- */}
      <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-12">
          
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Virtual Staffing Solutions" 
              className="h-8 sm:h-10 object-contain rounded" 
            />
            <span className="hidden sm:block text-gray-400 text-sm border-l border-gray-200 pl-3">
              Staff Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-sm font-bold text-gray-900">{STAFF_NAME}</span>
              <span className="text-xs font-semibold text-blue-600">IT Department</span>
            </div>
            
            {/* Avatar Circle instead of a plain button */}
            <div className="h-10 w-10 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-700 font-bold">
              {getInitials(STAFF_NAME)}
            </div>
          </div>

        </div>
      </nav>
