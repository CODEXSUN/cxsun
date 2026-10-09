import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { MasterDatabaseForm } from "./master-database.form";
import { useMasterDatabaseMutations, useMasterDatabaseQuery } from "./master-database.hooks";
import { MasterDatabaseList } from "./master-database.list";

export function MasterDatabaseWorkspace({ onOpenBackups }: { onOpenBackups: () => void }) {
  const query = useMasterDatabaseQuery();
  const mutations = useMasterDatabaseMutations();
  return (
    <WorkspacePage
      title="Master Database"
      description="Monitor the platform master database, migration state, backup requests, and restore readiness."
      technicalName="page.database.master"
      actions={
        <MasterDatabaseForm
          busy={mutations.migrate.isPending}
          loading={query.isLoading}
          onBackup={onOpenBackups}
          onMigrate={() => mutations.migrate.mutate()}
          onRefresh={() => void query.refetch()}
          onRestore={onOpenBackups}
        />
      }
    >
      <MasterDatabaseList record={query.data} />
    </WorkspacePage>
  );
}
