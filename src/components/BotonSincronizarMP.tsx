import { useState } from 'react';
import { supabase } from '../services/supabase';

export function BotonSincronizarMP() {
  const [cargando, setCargando] = useState(false);
  const [textoBoton, setTextoBoton] = useState('🔄 Sincronizar Mercado Pago');

  const manejarSincronizacion = async () => {
    setCargando(true);
    let continuar = true;
    let totalAcumulado = 0;

    try {
      // Bucle automático que se repite hasta vaciar el historial por completo
      while (continuar) {
        setTextoBoton(`Descargando... (${totalAcumulado} guardados)`);

        // Llamamos a la Edge Function desplegada en Supabase[cite: 5]
        const { data, error } = await supabase.functions.invoke('sincronizar-mercado-pago');
        if (error) throw error;

        if (data && data.success) {
          totalAcumulado += data.totalGuardados || 0;

          // Si la función indica que terminó o ya no quedan registros, rompemos el bucle
          if (data.terminado || data.totalGuardados === 0) {
            continuar = false;
          }
        } else {
          throw new Error(data?.error || 'Error desconocido al sincronizar');
        }

        // Pequeña pausa de cortesía (0.5s) entre lote y lote
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      alert(`¡Sincronización histórica exitosa! Se procesaron un total de ${totalAcumulado} transacciones.`);
      
      // Aquí puedes recargar tus estados o tablas si lo necesitas
    } catch (err: any) {
      console.error('Error al sincronizar:', err);
      alert('Hubo un error al sincronizar con Mercado Pago: ' + err.message);
    } finally {
      setCargando(false);
      setTextoBoton('🔄 Sincronizar Mercado Pago');
    }
  };

  return (
    <button
      onClick={manejarSincronizacion}
      disabled={cargando}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors shadow-sm"
    >
      {cargando ? textoBoton : '🔄 Sincronizar Mercado Pago'}
    </button>
  );
}