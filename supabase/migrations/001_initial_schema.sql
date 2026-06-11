-- ============================================================
-- PLATAFORMA DE GESTIÓN DE AGREMIADOS Y SOLVENCIAS
-- Migración: 001_initial_schema
-- ============================================================

-- 1. PERFILES DE ADMINISTRADORES
-- Extiende auth.users con username obligatorio (autenticación tripartita)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AGREMIADOS (Directorio principal)
CREATE TABLE IF NOT EXISTS public.agremiados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula TEXT UNIQUE NOT NULL,
  fpv TEXT UNIQUE NOT NULL,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  correo TEXT,
  telefono TEXT,
  fecha_inscripcion DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PAGOS
CREATE TABLE IF NOT EXISTS public.pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agremiado_id UUID NOT NULL REFERENCES public.agremiados(id) ON DELETE CASCADE,
  fecha_pago DATE NOT NULL,
  monto_ves NUMERIC(14,2) NOT NULL CHECK (monto_ves > 0),
  tasa_cambio NUMERIC(14,4) NOT NULL CHECK (tasa_cambio > 0),
  monto_usd NUMERIC(10,2) GENERATED ALWAYS AS (ROUND(monto_ves / tasa_cambio, 2)) STORED,
  referencia TEXT NOT NULL,
  metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('transferencia', 'pago_movil', 'efectivo_usd', 'zelle', 'otro')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SOLVENCIAS ANUALES
CREATE TABLE IF NOT EXISTS public.solvencias_anuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agremiado_id UUID NOT NULL REFERENCES public.agremiados(id) ON DELETE CASCADE,
  pago_id UUID NOT NULL REFERENCES public.pagos(id) ON DELETE CASCADE,
  anio_correspondiente SMALLINT NOT NULL CHECK (anio_correspondiente BETWEEN 2010 AND 2099),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agremiado_id, anio_correspondiente)
);

-- ============================================================
-- ÍNDICES DE BÚSQUEDA ULTRA-RÁPIDA
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_agremiados_cedula ON public.agremiados USING btree (cedula);
CREATE INDEX IF NOT EXISTS idx_agremiados_fpv ON public.agremiados USING btree (fpv);
CREATE INDEX IF NOT EXISTS idx_agremiados_nombres ON public.agremiados USING gin (to_tsvector('spanish', nombres || ' ' || apellidos));
CREATE INDEX IF NOT EXISTS idx_pagos_agremiado ON public.pagos (agremiado_id, fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_solvencias_agremiado_anio ON public.solvencias_anuales (agremiado_id, anio_correspondiente);

-- ============================================================
-- FUNCIÓN: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agremiados_updated_at
  BEFORE UPDATE ON public.agremiados
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- FUNCIÓN: Crear profile automáticamente en registro
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agremiados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solvencias_anuales ENABLE ROW LEVEL SECURITY;

-- Profiles: usuario solo ve/edita su propio perfil
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Agremiados: cualquier usuario autenticado puede CRUD
CREATE POLICY "agremiados_authenticated_all" ON public.agremiados
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Pagos: cualquier usuario autenticado puede CRUD
CREATE POLICY "pagos_authenticated_all" ON public.pagos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Solvencias: cualquier usuario autenticado puede CRUD
CREATE POLICY "solvencias_authenticated_all" ON public.solvencias_anuales
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SERVICE ROLE (webhook): acceso total sin restricciones RLS
-- Las políticas se aplican solo a authenticated; service_role las bypasea por defecto.

-- ============================================================
-- VISTA: Estado de solvencia por agremiado
-- ============================================================
CREATE OR REPLACE VIEW public.vista_solvencia_agremiados AS
SELECT
  a.id,
  a.cedula,
  a.fpv,
  a.nombres,
  a.apellidos,
  a.correo,
  a.telefono,
  a.fecha_inscripcion,
  ARRAY_AGG(sa.anio_correspondiente ORDER BY sa.anio_correspondiente) 
    FILTER (WHERE sa.anio_correspondiente IS NOT NULL) AS anios_solventes,
  COUNT(sa.id) AS total_anios_solventes
FROM public.agremiados a
LEFT JOIN public.solvencias_anuales sa ON sa.agremiado_id = a.id
GROUP BY a.id, a.cedula, a.fpv, a.nombres, a.apellidos, a.correo, a.telefono, a.fecha_inscripcion;
