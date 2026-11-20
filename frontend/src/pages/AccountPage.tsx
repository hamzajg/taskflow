import Alert from '../components/Alert'
import PageHeader from '../components/PageHeader'
import { useShell } from '../shell/ShellContext'
import WorkspacePanel from './WorkspacePanel'

export default function AccountPage() {
  const { user, workspaces, refreshWorkspaces } = useShell()

  return (
    <>
      <PageHeader title="Workspaces" />
      {!user?.verified && (
        <Alert tone="warning">Please verify your email to use workspace features.</Alert>
      )}
      <div id="workspaces" className="anchor">
        <WorkspacePanel workspaces={workspaces} onChanged={refreshWorkspaces} />
      </div>
    </>
  )
}
