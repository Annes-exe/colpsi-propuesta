-- ============================================================
-- MIGRACIÓN 003: ESTADO DE CUENTA Y EXPEDIENTES DIGITALES
-- Agrega soporte para el Filtro Humano (panel de aprobaciones)
-- y los campos de la planilla digitalizada.
-- ============================================================

-- 1. AGREGAR COLUMNAS A LA TABLA public.agremiados
ALTER TABLE public.agremiados 
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS colegio_pertenece TEXT,
  ADD COLUMN IF NOT EXISTS foto_carnet TEXT,
  ADD COLUMN IF NOT EXISTS planilla_fpv TEXT,
  ADD COLUMN IF NOT EXISTS cedula_digitalizada TEXT,
  ADD COLUMN IF NOT EXISTS rif_digitalizado TEXT,
  ADD COLUMN IF NOT EXISTS titulo_graduacion TEXT,
  ADD COLUMN IF NOT EXISTS estado_cuenta TEXT DEFAULT 'Activo';

-- 2. AGREGAR COLUMNAS A LA TABLA public.vista_solvencia_agremiados
ALTER TABLE public.vista_solvencia_agremiados 
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS colegio_pertenece TEXT,
  ADD COLUMN IF NOT EXISTS foto_carnet TEXT,
  ADD COLUMN IF NOT EXISTS planilla_fpv TEXT,
  ADD COLUMN IF NOT EXISTS cedula_digitalizada TEXT,
  ADD COLUMN IF NOT EXISTS rif_digitalizado TEXT,
  ADD COLUMN IF NOT EXISTS titulo_graduacion TEXT,
  ADD COLUMN IF NOT EXISTS estado_cuenta TEXT DEFAULT 'Activo';

-- 3. ACTUALIZAR FUNCIÓN DE SINCRONIZACIÓN DE AGREMIADOS HACIA VISTA
CREATE OR REPLACE FUNCTION public.sync_agremiados_to_vista()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.vista_solvencia_agremiados (
      id, cedula, fpv, nombres, apellidos, correo, telefono, fecha_inscripcion, fecha_recepcion_titulo,
      direccion, colegio_pertenece, foto_carnet, planilla_fpv, cedula_digitalizada, rif_digitalizado, titulo_graduacion,
      estado_cuenta, has_paid_inscription, meses_custodia_pagados, anios_solventes, total_anios_solventes
    ) VALUES (
      NEW.id, NEW.cedula, NEW.fpv, NEW.nombres, NEW.apellidos, NEW.correo, NEW.telefono, NEW.fecha_inscripcion, NEW.fecha_recepcion_titulo,
      NEW.direccion, NEW.colegio_pertenece, NEW.foto_carnet, NEW.planilla_fpv, NEW.cedula_digitalizada, NEW.rif_digitalizado, NEW.titulo_graduacion,
      NEW.estado_cuenta, false, ARRAY[]::text[], ARRAY[]::integer[], 0
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
      fecha_recepcion_titulo = NEW.fecha_recepcion_titulo,
      direccion = NEW.direccion,
      colegio_pertenece = NEW.colegio_pertenece,
      foto_carnet = NEW.foto_carnet,
      planilla_fpv = NEW.planilla_fpv,
      cedula_digitalizada = NEW.cedula_digitalizada,
      rif_digitalizado = NEW.rif_digitalizado,
      titulo_graduacion = NEW.titulo_graduacion,
      estado_cuenta = NEW.estado_cuenta
    WHERE id = NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.vista_solvencia_agremiados WHERE id = OLD.id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. ACTUALIZAR FUNCIÓN DE SINCRONIZACIÓN INVERSA HACIA AGREMIADOS
CREATE OR REPLACE FUNCTION public.sync_vista_to_agremiados()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.agremiados (
      id, cedula, fpv, nombres, apellidos, correo, telefono, fecha_inscripcion, fecha_recepcion_titulo,
      direccion, colegio_pertenece, foto_carnet, planilla_fpv, cedula_digitalizada, rif_digitalizado, titulo_graduacion,
      estado_cuenta
    ) VALUES (
      NEW.id, NEW.cedula, NEW.fpv, NEW.nombres, NEW.apellidos, NEW.correo, NEW.telefono, NEW.fecha_inscripcion, NEW.fecha_recepcion_titulo,
      NEW.direccion, NEW.colegio_pertenece, NEW.foto_carnet, NEW.planilla_fpv, NEW.cedula_digitalizada, NEW.rif_digitalizado, NEW.titulo_graduacion,
      NEW.estado_cuenta
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
      fecha_recepcion_titulo = NEW.fecha_recepcion_titulo,
      direccion = NEW.direccion,
      colegio_pertenece = NEW.colegio_pertenece,
      foto_carnet = NEW.foto_carnet,
      planilla_fpv = NEW.planilla_fpv,
      cedula_digitalizada = NEW.cedula_digitalizada,
      rif_digitalizado = NEW.rif_digitalizado,
      titulo_graduacion = NEW.titulo_graduacion,
      estado_cuenta = NEW.estado_cuenta
    WHERE id = NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.agremiados WHERE id = OLD.id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. ASEGURAR LA EXISTENCIA DEL BUCKET DE EXPEDIENTES EN STORAGE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('expedientes', 'expedientes', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;
