-- ============================================================
-- PLATAFORMA DE GESTIÓN DE AGREMIADOS Y SOLVENCIAS (ColPsi)
-- Estructura Completa de Base de Datos
-- ============================================================

-- ============================================================
-- 1. CREACIÓN DE TABLAS PRINCIPALES
-- ============================================================

-- PERFILES DE ADMINISTRADORES
-- Extiende auth.users de Supabase con campos adicionales
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AGREMIADOS (Directorio principal)
CREATE TABLE IF NOT EXISTS public.agremiados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula TEXT UNIQUE NOT NULL,
  fpv TEXT UNIQUE NOT NULL,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  correo TEXT,
  telefono TEXT,
  fecha_inscripcion DATE NOT NULL,
  fecha_recepcion_titulo DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REGISTRO DE PAGOS
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
  tipo_pago TEXT NOT NULL DEFAULT 'solvencia' CHECK (tipo_pago IN ('solvencia', 'inscripcion', 'custodia', 'carnet')),
  meses_custodia TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOLVENCIAS ANUALES REGISTRADAS
CREATE TABLE IF NOT EXISTS public.solvencias_anuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agremiado_id UUID NOT NULL REFERENCES public.agremiados(id) ON DELETE CASCADE,
  pago_id UUID NOT NULL REFERENCES public.pagos(id) ON DELETE CASCADE,
  anio_correspondiente SMALLINT NOT NULL CHECK (anio_correspondiente BETWEEN 2010 AND 2099),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agremiado_id, anio_correspondiente)
);

-- TABLA FÍSICA SINCRONIZADA DE SOLVENCIA (Sustituye la antigua vista)
CREATE TABLE IF NOT EXISTS public.vista_solvencia_agremiados (
  id UUID PRIMARY KEY REFERENCES public.agremiados(id) ON DELETE CASCADE,
  cedula TEXT UNIQUE NOT NULL,
  fpv TEXT UNIQUE NOT NULL,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  correo TEXT,
  telefono TEXT,
  fecha_inscripcion DATE NOT NULL,
  fecha_recepcion_titulo DATE,
  has_paid_inscription BOOLEAN DEFAULT FALSE,
  meses_custodia_pagados TEXT[] DEFAULT ARRAY[]::text[],
  anios_solventes INTEGER[] DEFAULT ARRAY[]::integer[],
  total_anios_solventes INTEGER DEFAULT 0
);

-- ============================================================
-- 2. ÍNDICES DE RENDIMIENTO Y BÚSQUEDA
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_agremiados_cedula ON public.agremiados USING btree (cedula);
CREATE INDEX IF NOT EXISTS idx_agremiados_fpv ON public.agremiados USING btree (fpv);
CREATE INDEX IF NOT EXISTS idx_agremiados_nombres ON public.agremiados USING gin (to_tsvector('spanish', nombres || ' ' || apellidos));
CREATE INDEX IF NOT EXISTS idx_pagos_agremiado ON public.pagos (agremiado_id, fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_solvencias_agremiado_anio ON public.solvencias_anuales (agremiado_id, anio_correspondiente);

-- ============================================================
-- 3. FUNCIONES Y PROCEDIMIENTOS ALMACENADOS
-- ============================================================

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para crear el perfil de administrador tras el registro en auth.users
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

-- Sincronización desde Agremiados hacia la tabla de solvencias agrupadas
CREATE OR REPLACE FUNCTION public.sync_agremiados_to_vista()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.vista_solvencia_agremiados (
      id, cedula, fpv, nombres, apellidos, correo, telefono, fecha_inscripcion, fecha_recepcion_titulo,
      has_paid_inscription, meses_custodia_pagados, anios_solventes, total_anios_solventes
    ) VALUES (
      NEW.id, NEW.cedula, NEW.fpv, NEW.nombres, NEW.apellidos, NEW.correo, NEW.telefono, NEW.fecha_inscripcion, NEW.fecha_recepcion_titulo,
      false, ARRAY[]::text[], ARRAY[]::integer[], 0
    );
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.vista_solvencia_agremiados
    SET
      cedula = NEW.cedula,
      fpv = NEW.fpv,
      nombres = NEW.nombres,
      apellidos = NEW.apellidos,
      correo = NEW.correo,
      telefono = NEW.telefono,
      fecha_inscripcion = NEW.fecha_inscripcion,
      fecha_recepcion_titulo = NEW.fecha_recepcion_titulo
    WHERE id = NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.vista_solvencia_agremiados WHERE id = OLD.id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Sincronización inversa (Ediciones directas en la tabla agrupada)
CREATE OR REPLACE FUNCTION public.sync_vista_to_agremiados()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.agremiados (
      id, cedula, fpv, nombres, apellidos, correo, telefono, fecha_inscripcion, fecha_recepcion_titulo
    ) VALUES (
      NEW.id, NEW.cedula, NEW.fpv, NEW.nombres, NEW.apellidos, NEW.correo, NEW.telefono, NEW.fecha_inscripcion, NEW.fecha_recepcion_titulo
    );
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.agremiados
    SET
      cedula = NEW.cedula,
      fpv = NEW.fpv,
      nombres = NEW.nombres,
      apellidos = NEW.apellidos,
      correo = NEW.correo,
      telefono = NEW.telefono,
      fecha_inscripcion = NEW.fecha_inscripcion,
      fecha_recepcion_titulo = NEW.fecha_recepcion_titulo
    WHERE id = NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.agremiados WHERE id = OLD.id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Cálculo en tiempo real de campos consolidados de Solvencia
CREATE OR REPLACE FUNCTION public.recalculate_vista_solvencia_fields(target_id uuid)
RETURNS void AS $$
DECLARE
  v_has_paid BOOLEAN;
  v_meses_custodia TEXT[];
  v_anios_solventes INTEGER[];
  v_total_anios INTEGER;
BEGIN
  -- Comprobar si el agremiado existe en la tabla consolidada
  IF NOT EXISTS (SELECT 1 FROM public.vista_solvencia_agremiados WHERE id = target_id) THEN
    RETURN;
  END IF;

  -- 1. has_paid_inscription (Verifica si tiene pago de inscripción)
  v_has_paid := COALESCE(
    EXISTS (
      SELECT 1 FROM public.pagos p 
      WHERE p.agremiado_id = target_id AND p.tipo_pago = 'inscripcion'
    ),
    false
  );

  -- 2. meses_custodia_pagados (Matriz de meses pagados de custodia)
  v_meses_custodia := COALESCE(
    (
      SELECT array_agg(m ORDER BY m)
      FROM (
        SELECT DISTINCT unnest(p.meses_custodia) AS m
        FROM public.pagos p
        WHERE p.agremiado_id = target_id AND p.tipo_pago = 'custodia'
      ) sub
    ),
    ARRAY[]::text[]
  );

  -- 3. anios_solventes & total_anios_solventes
  SELECT 
    COALESCE(ARRAY_AGG(sa.anio_correspondiente ORDER BY sa.anio_correspondiente), ARRAY[]::integer[]),
    COUNT(sa.id)
  INTO v_anios_solventes, v_total_anios
  FROM public.solvencias_anuales sa
  WHERE sa.agremiado_id = target_id;

  -- 4. Actualizar tabla física
  UPDATE public.vista_solvencia_agremiados
  SET
    has_paid_inscription = v_has_paid,
    meses_custodia_pagados = v_meses_custodia,
    anios_solventes = v_anios_solventes,
    total_anios_solventes = v_total_anios
  WHERE id = target_id;
END;
$$ LANGUAGE plpgsql;

-- Triggers de pagos
CREATE OR REPLACE FUNCTION public.sync_pagos_to_vista()
RETURNS trigger AS $$
DECLARE
  target_id UUID;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    target_id := NEW.agremiado_id;
  ELSE
    target_id := OLD.agremiado_id;
  END IF;

  PERFORM public.recalculate_vista_solvencia_fields(target_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers de solvencias anuales
CREATE OR REPLACE FUNCTION public.sync_solvencias_to_vista()
RETURNS trigger AS $$
DECLARE
  target_id UUID;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    target_id := NEW.agremiado_id;
  ELSE
    target_id := OLD.agremiado_id;
  END IF;

  PERFORM public.recalculate_vista_solvencia_fields(target_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. VINCULACIÓN DE TRIGGERS
-- ============================================================

-- Automatización de fecha de actualización updated_at
CREATE TRIGGER trg_agremiados_updated_at
  BEFORE UPDATE ON public.agremiados
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Creación automática de perfiles desde auth.users de Supabase
CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sincronizaciones de tabla física vista_solvencia_agremiados <-> agremiados
CREATE TRIGGER trg_sync_agremiados
  AFTER INSERT OR UPDATE OR DELETE ON public.agremiados
  FOR EACH ROW EXECUTE FUNCTION public.sync_agremiados_to_vista();

CREATE TRIGGER trg_sync_vista_to_agremiados
  AFTER INSERT OR UPDATE OR DELETE ON public.vista_solvencia_agremiados
  FOR EACH ROW EXECUTE FUNCTION public.sync_vista_to_agremiados();

-- Recálculo de campos ante cambios en pagos o solvencias
CREATE TRIGGER trg_sync_pagos
  AFTER INSERT OR UPDATE OR DELETE ON public.pagos
  FOR EACH ROW EXECUTE FUNCTION public.sync_pagos_to_vista();

CREATE TRIGGER trg_sync_solvencias
  AFTER INSERT OR UPDATE OR DELETE ON public.solvencias_anuales
  FOR EACH ROW EXECUTE FUNCTION public.sync_solvencias_to_vista();

-- ============================================================
-- 5. SEGURIDAD DE FILA (ROW LEVEL SECURITY - RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agremiados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solvencias_anuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vista_solvencia_agremiados ENABLE ROW LEVEL SECURITY;

-- Políticas de Profiles (Seguridad tripartita)
CREATE POLICY "profiles_select_by_username_anon" ON public.profiles
  FOR SELECT TO anon USING (true);

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Políticas de Agremiados (Sólo administradores autenticados)
CREATE POLICY "agremiados_authenticated_all" ON public.agremiados
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas de Pagos (Sólo administradores autenticados)
CREATE POLICY "pagos_authenticated_all" ON public.pagos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas de Solvencias Anuales (Sólo administradores autenticados)
CREATE POLICY "solvencias_authenticated_all" ON public.solvencias_anuales
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas de Vista Solvencia Agremiados (Sólo administradores autenticados)
CREATE POLICY "vista_solvencia_authenticated_all" ON public.vista_solvencia_agremiados
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
