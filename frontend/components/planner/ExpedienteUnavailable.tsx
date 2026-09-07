import { Icon } from "@/components/ui/Icon";

/**
 * Pantalla que se muestra cuando el enlace público ya no resuelve: el token fue
 * regenerado (reemplazado por uno nuevo) o el expediente se eliminó del sistema.
 */
export function ExpedienteUnavailable() {
  return (
    <main className="unavailable">
      <div className="unavailable-card">
        <span className="unavailable-mark" aria-hidden="true">
          <Icon name="folder" size={30} />
        </span>
        <p className="eyebrow">Enlace no disponible</p>
        <h1>Este expediente ya no está disponible</h1>
        <p className="unavailable-lead">
          El enlace de acceso fue reemplazado por uno nuevo, o el expediente fue eliminado del
          sistema.
        </p>
        <div className="unavailable-note">
          <Icon name="bell" size={16} />
          <span>Por favor, comuníquese con el proveedor para obtener un enlace vigente.</span>
        </div>
      </div>
      <p className="unavailable-brand">Project Planner · Control de expedientes</p>
    </main>
  );
}
