import { requireUser } from '@/lib/auth';
import { roleLabel } from '@/lib/permissions';
import { initials } from '@/lib/utils';
import { Card, Badge } from '@/components/ui/card';
import { ActionForm, Field } from '@/components/action-form';
import { Input } from '@/components/ui/input';
import { changePasswordAction } from '@/app/actions/auth';
export const metadata = { title: 'My account' };
export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR SPACE, YOUR SECURITY</div>
          <h1>My account</h1>
          <p>A little care for the details that keep your workspace secure.</p>
        </div>
      </div>
      <div className="two-columns">
        <Card>
          <div className="detail-header">
            <span className="avatar avatar-purple detail-avatar">{initials(user.name)}</span>
            <div>
              <h2>{user.name}</h2>
              <p className="muted text-xs mt-2">{user.email}</p>
            </div>
          </div>
          <div className="card-body border-t" style={{ borderColor: 'var(--line)' }}>
            <Badge tone="purple">{roleLabel(user.role)}</Badge>
            <p className="muted text-xs leading-7 mt-4">
              Your permissions are assigned by a campus administrator. Contact them to update your
              account details. Sessions expire after eight hours. Changing your password signs out
              other devices.
            </p>
            {user.email.endsWith('@demo.academic.test') && (
              <p className="form-error mt-5">
                Demo account · Seeded records are sample content and must not be used for real
                student information.
              </p>
            )}
          </div>
        </Card>
        <Card>
          <div className="card-header">
            <h2>Change password</h2>
          </div>
          <div className="card-body">
            <ActionForm action={changePasswordAction} label="Update password">
              <Field label="Current password">
                <Input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                />
              </Field>
              <Field
                label="New password"
                hint="Use at least 12 characters. A unique passphrase works well."
              >
                <Input
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                />
              </Field>
              <Field label="Confirm new password">
                <Input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                />
              </Field>
            </ActionForm>
          </div>
        </Card>
      </div>
    </>
  );
}
