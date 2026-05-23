import type { Route } from "./+types/home";

import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Link } from 'react-router';


export function meta({}: Route.MetaArgs) {
  return [
    { title: "AI-Resume-Analyzer" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {

  const { auth, isLoading, kv } = usePuterStore();
  const navigate = useNavigate();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

  // Wait for auth to finish loading before redirecting
  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) navigate('/auth?next=/');
  }, [isLoading, auth.isAuthenticated]);

  useEffect(() => {
    const loadResumes = async () => {
      setLoadingResumes(true);

      const items = (await kv.list('resume:*', true)) as KVItem[];

      const parsedResumes = items?.map((resume) => (
        JSON.parse(resume.value) as Resume
      ));

      setResumes(parsedResumes || []);
      setLoadingResumes(false);
    }

    loadResumes();
  }, []);

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">

      <Navbar />
      <section className="main-section">
        <div className="page-heading py-10">

          <h1>Track your Applications &amp; Resume Ratings</h1>
          {!loadingResumes && resumes?.length === 0 ? (
            <div>
              <h2 className="mb-10">No resumes found. Upload your first resume to get feedback.</h2>
              <Link to="/upload" className="primary-button w-fit mt-10">
                Upload Resume
              </Link>
            </div>
          ) : (
            <h2>Review your submissions and check AI-powered feedback.</h2>
          )}

        </div>

        {loadingResumes && (
          <div className="flex flex-col items-center justify-center">
            <img src={`${import.meta.env.BASE_URL}images/resume-scan-2.gif`} className="w-[200px]" alt="Loading..." />
          </div>
        )}

        {!loadingResumes && resumes.length > 0 && (
          <div className="resumes-section">
            {resumes.map((resume) => (
              <div key={resume.id}>
                <ResumeCard resume={resume} />
              </div>
            ))}
          </div>
        )}
      </section>

    </main>
  );
}
