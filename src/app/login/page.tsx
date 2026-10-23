import { redirect } from 'next/navigation';
import { GraduationCap, ShieldCheck } from 'lucide-react';
import { getUser } from '@/lib/auth';
import { LoginForm } from '@/components/login-form';
export default async function LoginPage() {
  if (await getUser()) redirect('/dashboard');
  return (
    <div className="login-page">
      <aside className="login-aside">
        <div className="brand">
          <div className="brand-icon">
            <GraduationCap size={26} />
          </div>
          <span>
            academia<span className="brand-dot">.</span>
            <small>THE CAMPUS, CONNECTED</small>
          </span>
        </div>
        <div>
          <p className="eyebrow">A MORE CONNECTED CAMPUS</p>
          <h1>
            Great things
            <br />
            begin with
            <br />a little clarity.
          </h1>
          <p>
            One thoughtful workspace for the people, learning, and possibilities that make your
            campus.
          </p>
        </div>
        <footer>Academic Portal · Built for your everyday extraordinary.</footer>
      </aside>
      <main className="login-main" id="main-content">
        <div className="login-box">
          <div className="eyebrow">WELCOME TO YOUR WORKSPACE</div>
          <h1>A fresh start, every day.</h1>
          <p>Sign in to stay connected with your campus.</p>
          <LoginForm />
          <div className="login-security">
            <ShieldCheck size={14} />
            Secure, private, and made for your campus.
          </div>
          <footer>
            Need an account or help signing in?
            <br />
            Contact your campus administrator.
          </footer>
        </div>
      </main>
    </div>
  );
}
