import type { Route } from "./+types/home";

import  Navbar from "~/components/Navbar";

import {resumes} from '../../constants';

import ResumeCard from "~/components/ResumeCard";
import {usePuterStore} from "~/lib/puter";
import { useNavigate} from "react-router";
import {useEffect, useState} from "react";

import  {Link} from 'react-router';


export function meta({}: Route.MetaArgs) {
  return [
    { title: "AI-Resume-Analyzer" },
    { name: "description", content: "Smart feedback for your dream job! " },
  ];
}

export default function Home() {

  const {  auth ,kv} = usePuterStore();
  const navigate = useNavigate();

  const [resumes, setResumes] = useState<Resume[]>([]);

  const [loadingResumes, setLoadingResumes] = useState(false);



  useEffect(() => {
    if(!auth.isAuthenticated) navigate('/auth?next=/');
  },[auth.isAuthenticated])

  useEffect(() => {
    const loadResumes = async () => {
      setLoadingResumes(true);

      const resumes = (await kv.list('resume:*',true)) as KVItem[];

      const parsedResumes = resumes?.map((resume) => (
          JSON.parse(resume.value) as Resume
      ))

      setResumes(parsedResumes || []);
      setLoadingResumes(false);
    }

    loadResumes();
  }, []);


  useEffect(() => {
    const loadResume = async () => {

      const blob = await fs.read(resumes.imagePath);

      if(!blob) return;
      let url = URL.createObjectURL(blob);
      setResumeUrl(url);
    }

    loadResume();
  }, [resumes.imagePath]);
  return <main className="bg-[url('/images/bg-main.svg')] bg-cover">

    <Navbar />
    <section className="main-section">
      <div className="page-heading py-10">

        <h1> Track your Applications & Resume Ratings</h1>
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
            <img src={`${import.meta.env.BASE_URL}/images/resume-scan-2.gif`} className="w-[200px]"/>
          </div>
      )}
      {!loadingResumes && resumes.length > 0 && (
          <div className="resumes-section">
            {resumes.map((resume) => (
                <div key={resume.id}>
                  <ResumeCard resume={resume}/>
                </div>
            ))}

            {!loadingResumes && resumes?.length === 0 && (
                <div className="flex flex-col items-center justify-center mt-10 gap-4">

                  <Link to="/upload" className="primary-button w-fit text-xl font-semibold">Upload Resume</Link>
                </div>
            )}

          </div>
      )}
    </section>



  </main>
}
