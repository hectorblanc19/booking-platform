import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://uyxgycmqhjdyidasdyfo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5eGd5Y21xaGpkeWlkYXNkeWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyODQ5ODYsImV4cCI6MjA5Njg2MDk4Nn0.hWyEQp_vytE1gmTgLnTnDG4kjKTGE62z_vBvB7XOQRo'
)
