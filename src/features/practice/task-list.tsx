import { List, Row } from "@/components/layout/page";
import { DOMAIN_LABEL } from "@/lib/domain/domains";
import type { TaskView } from "./server/queries";

export function taskMeta(task: TaskView): string {
  if (task.status === "done") return "Fait";
  if (task.status === "skipped") return "Passée";
  return task.targetBpm ? `${task.plannedMinutes} min · ${task.targetBpm} BPM` : `${task.plannedMinutes} min`;
}

/** Liste numérotée des tâches d'un jour, avec la raison de chaque tâche. */
export function TaskList({ tasks }: { tasks: TaskView[] }) {
  return (
    <List ordered>
      {tasks.map((task, i) => (
        <Row
          key={task.id}
          n={i + 1}
          done={task.status !== "planned"}
          main={task.domain === "repertoire" ? "Répertoire" : DOMAIN_LABEL[task.domain]}
          detail={
            <>
              {[task.title, task.detail].filter(Boolean).join(", ")}
              <span className="block">Pourquoi : {task.reason}</span>
            </>
          }
          meta={taskMeta(task)}
        />
      ))}
    </List>
  );
}
