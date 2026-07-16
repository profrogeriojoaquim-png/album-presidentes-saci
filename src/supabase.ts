import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qmcqffnawtfaenyziwsn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtY3FmZm5hd3RmYWVueXppd3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNTM5NTMsImV4cCI6MjA4OTcyOTk1M30._CjaNoeJeQp-8s8Jt-dk3bJfktdEV97R5LhLnWgYrNc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)