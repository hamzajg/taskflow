import { User } from '../auth'
import Alert from '../components/Alert'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import ProfileForm from '../components/ProfileForm'
import { useShell } from '../shell/ShellContext'
import WorkspacePanel from './WorkspacePanel'

export default function AccountPage() {
  const { user, workspaces, refreshWorkspaces, setUser } = useShell()

  return (
    <>
      <PageHeader title={`Welcome${user ? `, ${user.firstName}` : ''}`} />
      {!user?.verified && (
        <Alert tone="warning">Please verify your email to use workspace features.</Alert>
      )}
      <div id="workspaces" className="anchor">
        <WorkspacePanel workspaces={workspaces} onChanged={refreshWorkspaces} />
      </div>
      <div id="profile" className="anchor">
        <Card title="Profile">
          {user && <ProfileForm user={user as User} onSaved={setUser} />}
        </Card>
      </div>
    </>
  )
}
