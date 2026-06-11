'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '@/lib/validations/schemas'

// ─── LOGIN ────────────────────────────────────────────────────────────────────

export async function loginAction(formData: FormData) {
  const raw = {
    username: formData.get('username') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()

  // Verificar que el username corresponde al email registrado
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', parsed.data.username)
    .single()

  if (!profile) {
    return { error: 'Nombre de usuario o credenciales incorrectos' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { error: 'Credenciales incorrectas. Verifica usuario, correo y contraseña.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────

export async function registerAction(formData: FormData) {
  const raw = {
    username: formData.get('username') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
    fullName: formData.get('fullName') as string,
  }

  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()

  // Verificar username único antes de crear el usuario
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', parsed.data.username)
    .maybeSingle()

  if (existingProfile) {
    return { error: 'El nombre de usuario ya está en uso' }
  }

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        username: parsed.data.username,
        full_name: parsed.data.fullName,
      },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Este correo ya está registrado' }
    }
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
