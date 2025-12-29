import React, { useRef, useEffect } from 'react';
import { CheckCircle2, XCircle, Circle, Clock, AlertTriangle } from 'lucide-react';
import { formatDuration } from '../utils/formatters';

interface Job {
    job_name: string;
    status: string;
    current_duration: number;
    is_anomaly: boolean;
}

interface JobVisualizationProps {
    jobs: Job[];
    selectedJob: string | null;
    onJobClick: (jobName: string) => void;
}

export const JobVisualization: React.FC<JobVisualizationProps> = ({ jobs, selectedJob, onJobClick }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to selected job
    useEffect(() => {
        if (selectedJob && scrollContainerRef.current) {
            const selectedElement = document.getElementById(`job-${selectedJob}`);
            if (selectedElement) {
                selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [selectedJob]);

    return (
        <div className="relative w-full">
            <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-800 -z-10" />

            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto pb-4 gap-8 px-2 hide-scrollbar snap-x"
                style={{ scrollbarWidth: 'thin' }}
            >
                {jobs.map((job) => {
                    const isSelected = selectedJob === job.job_name;
                    let StatusIcon = Circle;
                    let iconColor = "text-slate-600";

                    if (job.status === 'success') {
                        StatusIcon = CheckCircle2;
                        iconColor = "text-emerald-500";
                    } else if (job.status === 'failure') {
                        StatusIcon = XCircle;
                        iconColor = "text-rose-500";
                    }

                    return (
                        <div
                            key={job.job_name}
                            id={`job-${job.job_name}`}
                            onClick={() => onJobClick(job.job_name)}
                            className={`
                flex flex-col items-center min-w-[100px] cursor-pointer group snap-center
                transition-all duration-200 hover:-translate-y-1
              `}
                        >
                            <div className={`
                relative z-10 bg-slate-900 rounded-full p-1.5 border-2 transition-all duration-300
                ${isSelected ? 'border-blue-500 scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-slate-800 group-hover:border-slate-600'}
                ${job.is_anomaly ? 'animate-pulse border-amber-500' : ''}
              `}>
                                <StatusIcon size={20} className={iconColor} />
                                {job.is_anomaly && (
                                    <div className="absolute -top-1 -right-1 bg-amber-900 text-amber-500 rounded-full p-0.5 border border-amber-700">
                                        <AlertTriangle size={8} />
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 text-center">
                                <div className={`text-xs font-medium transition-colors ${isSelected ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                    {job.job_name}
                                </div>
                                <div className="flex items-center justify-center gap-1 mt-1 text-[10px] text-slate-600 font-mono">
                                    <Clock size={10} />
                                    {formatDuration(job.current_duration)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
