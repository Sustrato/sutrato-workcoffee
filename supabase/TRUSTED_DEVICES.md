# Verificación de dispositivos de confianza

Al entrar a una ruta autenticada, la aplicación comprueba el dispositivo con la Edge Function `trusted-device-auth`. La función obtiene la IP y el User-Agent de los headers de la solicitud. La aplicación mantiene un identificador aleatorio por navegador y la función considera conocido el dispositivo cuando existe un registro para el usuario que coincida con la IP **o** con la huella SHA-256 de ese identificador. El User-Agent se conserva junto al registro. Un dispositivo nuevo recibe un código de seis dígitos por correo; el código vence en 10 minutos y admite hasta cinco intentos. Al agotar los intentos, el desafío queda bloqueado hasta vencer para evitar reiniciar el límite solicitando otro código.

La tabla `trusted_devices` contiene la IP, el User-Agent, la huella del identificador aleatorio local y las fechas de creación/último uso. `trusted_device_challenges` guarda temporalmente el hash del código y los datos del dispositivo pendiente. Ambas tablas tienen RLS habilitado y no permiten acceso directo a `anon` ni a `authenticated`; solo las administra la función con la clave `service_role`.

La función no exige JWT a nivel de gateway para que el desafío de un solo uso pueda validarse después de cerrar la sesión. La acción de comprobación exige y valida explícitamente el JWT con Supabase Auth; la acción de verificación requiere el ID aleatorio del desafío, el código vigente y el mismo IP/dispositivo, limita los intentos y solo registra el dispositivo después de acertar.

## Activación

1. Confirma que las tablas `trusted_devices` y `trusted_device_challenges` existen y que `service_role` tiene permisos para consultarlas y actualizarlas.
2. Configura los secretos `RESEND_API_KEY` y `EMAIL_FROM` para Edge Functions si todavía no están configurados. No expongas estos secretos en variables `VITE_*`.
3. Despliega la función:

   ```powershell
   supabase functions deploy trusted-device-auth --no-verify-jwt
   ```

`--no-verify-jwt` es necesario porque la acción de verificación usa un desafío temporal después de cerrar la sesión; la acción `check` valida explícitamente el JWT dentro de la función. El cliente invoca la ruta `/functions/v1/trusted-device-auth` construida por Supabase a partir de `VITE_SUPABASE_URL`.

Las rutas de la aplicación, excepto el inicio de sesión, quedan detrás de una verificación de sesión y de dispositivo.
