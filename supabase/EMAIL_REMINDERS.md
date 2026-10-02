# Recordatorios por correo

Los recordatorios de pago se ejecutan diariamente a las 12:00 UTC. Se envía un correo diario por empresa cuando el próximo pago vence entre hoy y los próximos cinco días. La deduplicación por empresa y día evita envíos repetidos si el trabajo se reintenta.

La Edge Function consulta `empresas` en el servidor y exige `estado = 'VIGENTE'` y un correo válido. También vuelve a consultar el estado inmediatamente antes de cada envío. Las empresas desvinculadas, no vigentes, sin correo o con pagos vencidos no reciben recordatorios. El feed de alertas internas usa el mismo filtro estricto.

## Configuración

1. Verifica el dominio remitente en Resend.
2. En Supabase Dashboard, configura `RESEND_API_KEY` y `EMAIL_FROM` en **Edge Functions > Secrets**. No pongas la clave en `.env`, en una variable `VITE_*` ni en el repositorio: las variables Vite quedan incluidas en el código que recibe el navegador.

   Como alternativa, puedes configurar los secretos desde una terminal:

   ```powershell
   supabase secrets set RESEND_API_KEY="tu-clave-real-de-resend" EMAIL_FROM="Nombre de la app <avisos@tu-dominio.cl>"
   ```

   Sustituye `tu-clave-real-de-resend` y `avisos@tu-dominio.cl` por los valores reales.

3. En Supabase Vault crea dos secretos llamados `project_url` y `service_role_key`. Usa como valores la URL del proyecto y la clave `service_role` del proyecto. No uses la clave `anon`.
4. Despliega la función:

   ```powershell
   supabase functions deploy send-payment-reminders
   ```

5. Aplica la migración `202610020001_scheduled_email_reminders.sql` después de crear los secretos de Vault. La migración crea la tabla de deduplicación y el trabajo diario de `pg_cron`.

Para probar un envío, inicia sesión en la app y usa el botón con el icono de envío en la fila de una empresa VIGENTE con correo registrado. La función consulta el correo actual de `empresas` en Supabase; no acepta direcciones arbitrarias enviadas desde el navegador.

La función usa las variables de entorno `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` que Supabase proporciona en el entorno Edge. El cron invoca la función con la clave `service_role` almacenada en Vault; ninguna clave privilegiada se expone en el frontend.
