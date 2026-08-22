import type { Navigate } from '../App';

type WelcomePageProps = {
  onNavigate: Navigate;
};

export default function WelcomePage({ onNavigate }: WelcomePageProps) {
  return (
    <main className="welcome-page">
      <div className="welcome-backdrop" aria-hidden="true" />
      <div className="welcome-action">
        <a className="btn btn-enter" href="/memorial" onClick={(event) => onNavigate(event, '/memorial')}>
          <span>ร่วมแสดงความเสียใจ</span>
          <span>ต่อชีวิตประชาชนที่สูญเสียไปเพราะรัฐฆาตกร</span>
        </a>
      </div>
    </main>
  );
}
