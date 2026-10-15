import { createClient } from '@supabase/server'

const supabase = createClient()

async function testConnection() {
  try {
    // Test basic connection
    const { data, error } = await supabase.from('users').select('count')
    
    if (error) {
      console.error('Supabase connection error:', error)
      process.exit(1)
    }
    
    console.log('✅ Supabase connection successful!')
    console.log('Data:', data)
    process.exit(0)
  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(1)
  }
}

testConnection()
