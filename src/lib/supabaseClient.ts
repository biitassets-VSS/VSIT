import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  "https://ghsiojfheepygzhkrymv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdoc2lvamZoZWVweWd6aGtyeW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MjA1NTMsImV4cCI6MjA5NjI5NjU1M30.L9hEtQ0PYnK0M4SzwbCC-YmMeiNxB6x3DD7b586gFQs"
)
