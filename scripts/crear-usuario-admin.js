/**
 * Script para crear el usuario admin de prueba usando la API Admin de Supabase.
 * Usa el service role key para bypassar confirmaion de email.
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function crearUsuarioAdmin() {
  console.log('🔧 Creando usuario admin...')

  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@colpsi.test',
    password: 'Admin2024!',
    email_confirm: true,          // Confirma el email sin requerir verificación
    user_metadata: {
      username: 'admin',
      full_name: 'Administrador ColPsi',
    },
  })

  if (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  console.log('✅ Usuario creado exitosamente:')
  console.log('   ID:', data.user.id)
  console.log('   Email:', data.user.email)
  console.log('   Confirmado:', data.user.email_confirmed_at ? 'Sí' : 'No')

  // Verificar que el trigger creó el profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, role')
    .eq('id', data.user.id)
    .single()

  if (profile) {
    console.log('✅ Profile creado por trigger:')
    console.log('   Username:', profile.username)
    console.log('   Nombre:', profile.full_name)
    console.log('   Rol:', profile.role)
  } else {
    console.warn('⚠️  Profile no encontrado — puede que el trigger no haya disparado')
  }
}

crearUsuarioAdmin()
