-- Create perfiles table (unchanged)
-- ...

-- Create habitaciones table
CREATE TABLE IF NOT EXISTS public.habitaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some default rooms
INSERT INTO public.habitaciones (nombre) VALUES 
('Habitación 1'), ('Habitación 2'), ('Habitación 3'), ('Habitación 4'), ('Habitación 5')
ON CONFLICT DO NOTHING;

-- Create reservas table
CREATE TABLE IF NOT EXISTS public.reservas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_nombre TEXT NOT NULL,
  cliente_whatsapp TEXT,
  check_in TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out TIMESTAMP WITH TIME ZONE NOT NULL,
  habitacion_id UUID REFERENCES public.habitaciones(id),
  comprobante_url TEXT,
  registrado_por UUID REFERENCES auth.users(id),
  subido_por UUID REFERENCES auth.users(id),
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'verificado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on reservas
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios autenticados pueden ver todas las reservas"
ON public.reservas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Los usuarios autenticados pueden crear reservas"
ON public.reservas FOR INSERT
TO authenticated
WITH CHECK (true);

-- Trigger to sync auth.users with perfiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Setup Storage
-- Instructions: Create a bucket named 'pagos' in the Supabase Dashboard
-- and set its RLS policies to allow authenticated users to read and upload.
