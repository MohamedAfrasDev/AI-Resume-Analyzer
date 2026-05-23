import React, { type FormEvent } from 'react'
import Navbar from "~/components/Navbar";
import { useState } from 'react';
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { convertPdfToImage } from "~/lib/pdf2img";
import { generateUUID } from "~/lib/utils";
import { prepareInstructions } from "../../constants";


const Upload = () => {

    const { fs, ai, kv } = usePuterStore();

    const navigate = useNavigate();

    const [isProcessing, setIsProcessing] = useState(false);

    const [statusText, setStatusText] = useState('');

    const [file, setFile] = useState<File | null>(null);

    const handleFileSelect = (file: File | null) => {
        setFile(file);
    }

    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File }) => {

        setIsProcessing(true);

        try {
            setStatusText('Uploading the file...');
            const uploadedFile = await fs.upload([file]);
            if (!uploadedFile) {
                setStatusText('Error: Failed to upload file');
                setIsProcessing(false);
                return;
            }

            setStatusText('Converting to image...');
            const imageFile = await convertPdfToImage(file);
            if (!imageFile.file) {
                setStatusText('Error: Failed to convert PDF to image');
                setIsProcessing(false);
                return;
            }

            setStatusText('Uploading the image...');
            const uploadedImage = await fs.upload([imageFile.file]);
            if (!uploadedImage) {
                setStatusText('Error: Failed to upload image');
                setIsProcessing(false);
                return;
            }

            setStatusText('Preparing data...');
            const uuid = generateUUID();
            // Use a mutable record so we can update feedback after the AI call
            const data: Omit<Resume, 'feedback'> & { feedback: Feedback | string } = {
                id: uuid,
                resumePath: uploadedFile.path,
                imagePath: uploadedImage.path,
                companyName,
                jobTitle,
                feedback: '',
            };
            await kv.set(`resume:${uuid}`, JSON.stringify(data));

            setStatusText('Analyzing...');
            const feedback = await ai.feedback(
                uploadedFile.path,
                prepareInstructions({ jobTitle, jobDescription })
            );
            if (!feedback) {
                setStatusText('Error: Failed to analyze resume');
                setIsProcessing(false);
                return;
            }

            const feedbackText = typeof feedback.message.content === 'string'
                ? feedback.message.content
                : feedback.message.content[0].text;

            let parsedFeedback: Feedback;
            try {
                parsedFeedback = JSON.parse(feedbackText);
            } catch {
                setStatusText('Error: Failed to parse AI response. Please try again.');
                setIsProcessing(false);
                return;
            }

            data.feedback = parsedFeedback;
            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            setStatusText('Analysis complete, redirecting...');
            navigate(`/resume/${uuid}`);

        } catch (error) {
            setStatusText(`Error: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`);
            setIsProcessing(false);
        }
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        if (!file) return;

        await handleAnalyze({ companyName, jobTitle, jobDescription, file });
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">

            <Navbar />
            <section className="main-section">

                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream job</h1>

                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src={`${import.meta.env.BASE_URL}images/resume-scan.gif`} className="w-full" alt="Scanning resume..." />
                        </>
                    ) : (
                        <h2>Drop your resume for an ATS score and improvement tips</h2>
                    )}

                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input type="text"
                                    name="company-name" placeholder="Company Name" id="company-name" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text"
                                    name="job-title" placeholder="Job Title" id="job-title" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={5}
                                    name="job-description" placeholder="Job Description" id="job-description" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="uploader">Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>

                            <button className="primary-button" type="submit">
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>

        </main>
    )
}
export default Upload
