import { User } from '../auth'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import ProfileForm from '../components/ProfileForm'
import { useShell } from '../shell/ShellContext'

export default function ProfilePage() {
  const { user, setUser } = useShell()

  return (
    <>
      <PageHeader title="Profile" />
      <Card>
        {user && <ProfileForm user={user as User} onSaved={setUser} />}
      </Card>
    </>
  )
}
