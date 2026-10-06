// NEUROTRACK · Edge Function `delete-account`
//
// Elimina de forma definitiva la cuenta del usuario que llama y, en cascada
// (ON DELETE CASCADE), todas sus filas clínicas. Solo actúa sobre el usuario del
// token: nunca recibe un id por parámetro.
//
// Despliegue: supabase functions deploy delete-account
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json(401, { error: 'unauthorized' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return json(401, { error: 'unauthorized' });

  // La clave de servicio vive solo en el servidor; nunca en la app.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) return json(500, { error: 'delete_failed' });

  return json(200, { deleted: true });
});
