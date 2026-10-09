# Futuras mejoras

Ordenadas por impacto previsto.

1. **Sincronización con Supabase.** El consentimiento, el esquema con RLS y las columnas `updated_at`, `deleted_at`
   y `sync_status` ya existen; falta el motor que sube y baja cambios (último en escribir gana por registro) y la
   pantalla de estado de sincronización.
2. **Revisión clínica y legal.** Validar con neurología las reglas de alarma y los umbrales de patrones, y con un
   abogado los textos legales, antes de publicar.
3. **Recuperar contraseña sin nube.** En modo local, una cuenta olvidada solo se puede borrar; con la nube activa ya
   existe recuperación por email.
4. **Escalas clínicas validadas** (MIDAS, HIT-6) como cuestionarios opcionales, con su puntuación incluida en el
   informe.
5. **Diario menstrual opcional**, para observar la posible asociación con el ciclo.
6. **Clima y presión atmosférica** opcionales como posible factor, obtenidos con permiso de ubicación aproximada.
7. **Widgets y accesos rápidos** («Registrar episodio» desde la pantalla de inicio del teléfono) y Apple Health /
   Health Connect para importar sueño.
8. **Exportación a FHIR** para integrarse con historias clínicas.
9. **Más idiomas**: los textos ya están separados en `src/i18n`.
10. **Pruebas en dispositivo automatizadas** (Maestro) en EAS Workflows para cada versión.
11. **Copia de seguridad cifrada** de la base local, exportable e importable por el usuario.
