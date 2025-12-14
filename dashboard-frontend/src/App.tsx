import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Dot } from 'recharts';
import './App.css';
import ReactMarkdown from 'react-markdown';
import { 
  Stats, TableData, AnomalyData, JobBreakdownResponse, JobTrendsData 
} from './types';

// Component Props & Internal Types
interface CustomizedDotProps {
  cx?: number;
  cy?: number;
  payload?: AnomalyData;
}

// --- Main App Component ---
function App() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [analysisData, setAnalysisData] = useState<AnomalyData[]>([]);
  const [jobBreakdownData, setJobBreakdownData] = useState<JobBreakdownResponse | null>(null);
  const [jobTrendsData, setJobTrendsData] = useState<JobTrendsData>({ chartData: [], jobNames: [] });
  const [currentPage, setCurrentPage] = useState(1);
  
  const [pipelines, setPipelines] = useState<string[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Feature State
  const [aiSummary, setAiSummary] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Handles AI summary request to the backend.
  const getAiSummary = async (prompt: string): Promise<string> => {
    console.log("Requesting AI summary from backend...");
    const response = await axios.post('http://localhost:3000/api/generate-summary', { prompt });
    if (response.data && response.data.summary) {
      return response.data.summary;
    }
    throw new Error("Invalid response from AI summary endpoint.");
  };
  
  // Fetch available pipelines on mount
  useEffect(() => {
    const fetchPipelines = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/pipelines');
            setPipelines(res.data);
            if (res.data.length > 0) {
                // Default to the first pipeline if none selected
                setSelectedPipeline(res.data[0]);
            }
        } catch (e) {
            console.error("Failed to fetch pipelines", e);
        }
    };
    fetchPipelines();
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      // Don't fetch if we are waiting for initial pipeline selection (unless there are no pipelines yet)
      if (pipelines.length > 0 && !selectedPipeline) return;

      try {
        setLoading(true);
        const params = selectedPipeline ? `?pipeline=${encodeURIComponent(selectedPipeline)}` : '';
        const pageParams = `?page=${currentPage}&limit=5${selectedPipeline ? `&pipeline=${encodeURIComponent(selectedPipeline)}` : ''}`;
        
        const [statsRes, tableRes, analysisRes, jobBreakdownRes, jobTrendsRes] = await Promise.all([
          axios.get(`http://localhost:3000/api/stats${params}`),
          axios.get(`http://localhost:3000/api/runs/table${pageParams}`),
          axios.get(`http://localhost:3000/api/runs/duration-analysis${params}`),
          axios.get(`http://localhost:3000/api/jobs/breakdown${params}`),
          axios.get(`http://localhost:3000/api/jobs/trends${params}&limit=20`) // trends has limit param too
        ]);

        setStats(statsRes.data);
        setTableData(tableRes.data);
        setAnalysisData(analysisRes.data);

        // Handle new Job Breakdown data structure
        const breakdownData = jobBreakdownRes.data;
        setJobBreakdownData(breakdownData);

        const trendsData = jobTrendsRes.data;
        setJobTrendsData(trendsData);
        setError(null);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred');
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [currentPage, selectedPipeline, pipelines.length]);

  const handleAnalyzeClick = async () => {
    if (!jobBreakdownData) return;

    setIsAiLoading(true);
    setAiSummary('');
    setAiError('');

    // Filter for significant deviations based on defined rules.
    const significantDeviations = jobBreakdownData.jobs.filter(job => {
      const isFailed = job.status === 'failure';
      const isSlow = job.status === 'success' && job.percent_change != null && job.historical_avg != null &&
                     (job.percent_change >= 20 || (job.current_duration - job.historical_avg) > 15);
      return isFailed || isSlow;
    });

    if (significantDeviations.length === 0) {
      setAiSummary("No significant deviations found in the most recent run.");
      setIsAiLoading(false);
      return;
    }

    const jobDataString = significantDeviations.map(job => 
      `- Job: "${job.job_name}"\n  - Status: ${job.status}\n  - Duration: ${job.current_duration}s\n  - Historical Average: ${job.historical_avg?.toFixed(2) || 'N/A'}s\n  - Recent Durations: [${job.historical_durations.join(', ')}]s`
    ).join('\n');

    // Construct the prompt for AI analysis.
    const prompt = `You are an expert DevOps engineer creating a performance report.

**Task:**
Analyze the provided job data and generate a two-part report:
1.  **Executive Summary:** A single, concise sentence explaining the main finding.
2.  **Key Findings & Recommendations:** A bulleted list describing each significant issue. Each recommendation MUST start with an action verb (e.g., Investigate, Review, Confirm).

Do not add any other sections or concluding paragraphs.

**Job Data:**
${jobDataString}

**Report:**`;

    try {
      const summary = await getAiSummary(prompt);
      setAiSummary(summary);
    } catch (err) {
      setAiError("An error occurred while analyzing anomalies.");
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const StatCard = ({ title, value }: { title: string, value: string | number }) => (
    <div style={{ backgroundColor: '#2c2c2c', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
      <h3 style={{ margin: 0, color: '#aaa' }}>{title}</h3>
      <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{value}</p>
    </div>
  );

  const CustomizedDot = (props: CustomizedDotProps) => {
    const { cx, cy, payload } = props;
    if (payload && payload.is_anomaly) {
      return <Dot cx={cx} cy={cy} r={6} stroke="#ff4757" fill="#ff6b81" />;
    }
    return <Dot cx={cx} cy={cy} r={4} fill="#54a0ff" />;
  };

  const AnomalyIndicator = ({ isAnomaly }: { isAnomaly: boolean }) => (
    <span style={{ 
      display: 'inline-block',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: isAnomaly ? '#ff6b81' : '#2ed573',
      boxShadow: isAnomaly ? '0 0 8px #ff6b81' : 'none'
    }}></span>
  );
  
  const AiSummaryDisplay = () => {
    if (!aiSummary && !isAiLoading && !aiError) {
      return null; // Don't show anything before the button is clicked
    }

    return (
      <div style={{ backgroundColor: '#2c2c2c', padding: '1.5rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid #444' }}>
        <h3 style={{ margin: 0, color: '#aaa', marginBottom: '1rem' }}>AI Anomaly Analysis</h3>
        {isAiLoading && <p>Analyzing...</p>}
        {aiError && <p style={{ color: '#ff6b6b' }}>{aiError}</p>}
        {aiSummary && <ReactMarkdown components={{ p: ({...props}) => <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }} {...props} /> }}>{aiSummary}</ReactMarkdown>}
      </div>
    );
  };

  const lineColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>CI/CD Pipeline Metrics Dashboard</h1>
        {pipelines.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ fontWeight: 'bold' }}>Project:</label>
                <select 
                    value={selectedPipeline} 
                    onChange={(e) => {
                        setSelectedPipeline(e.target.value);
                        setCurrentPage(1); // Reset to first page on change
                    }}
                    style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}
                >
                    {pipelines.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
            </div>
        )}
      </div>

      {loading && <p>Loading dashboard...</p>}
      {error && <p style={{ color: '#ff6b6b' }}>Error fetching data: {error}</p>}

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard title="Total Runs" value={stats.total_runs} />
          <StatCard title="Success Rate" value={`${stats.success_rate}%`} />
          <StatCard title="Median Duration" value={`${stats.median_duration}s`} />
        </div>
      )}

      {analysisData.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2>Pipeline Duration Trend & Anomaly Detection</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={analysisData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                <XAxis dataKey="name" stroke="#ccc" tick={{ fontSize: 12 }} />
                <YAxis stroke="#ccc" />
                <Tooltip contentStyle={{ backgroundColor: '#333', border: '1px solid #555' }} />
                <Legend />
                <Line type="monotone" dataKey="duration" stroke="#54a0ff" name="Run Duration" dot={<CustomizedDot />} />
                <Line type="monotone" dataKey="rolling_avg" stroke="#feca57" name="5-Run Rolling Avg" dot={false} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {jobBreakdownData && jobBreakdownData.jobs.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Job Duration Breakdown (Most Recent Run)</h2>
            <button onClick={handleAnalyzeClick} disabled={isAiLoading || !jobBreakdownData} style={{padding: '10px 15px', cursor: 'pointer'}}>
              ✨ Analyze Anomalies
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #555' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Job Name</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Current Duration</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Historical Average</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Percent Change</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Anomaly</th>
              </tr>
            </thead>
            <tbody>
              {jobBreakdownData.jobs.map(job => (
                <tr key={job.job_name} style={{ borderBottom: '1px solid #444' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{job.job_name}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      color: job.status === 'success' ? '#86efac' : job.status === 'failure' ? '#f87171' : '#feca57',
                      fontWeight: 'bold'
                    }}>
                      {job.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>{job.current_duration === -1 ? '-' : `${job.current_duration}s`}</td>
                  <td style={{ padding: '12px' }}>{job.historical_avg ? `${job.historical_avg}s` : 'N/A'}</td>
                  <td style={{ padding: '12px', color: job.percent_change ? (job.percent_change > 0 ? '#ff6b81' : '#2ed573') : 'inherit' }}>
                    {job.percent_change ? `${job.percent_change > 0 ? '+' : ''}${job.percent_change}%` : 'N/A'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}><AnomalyIndicator isAnomaly={job.is_anomaly} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <AiSummaryDisplay />
        </div>
      )}

      {jobTrendsData.chartData.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2>Job Performance Trends</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={jobTrendsData.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                <XAxis dataKey="name" stroke="#ccc" tick={{ fontSize: 12 }} />
                <YAxis stroke="#ccc" />
                <Tooltip contentStyle={{ backgroundColor: '#333', border: '1px solid #555' }} />
                <Legend />
                {jobTrendsData.jobNames.map((jobName, index) => (
                  <Line 
                    key={jobName} 
                    type="monotone" 
                    dataKey={jobName} 
                    stroke={lineColors[index % lineColors.length]} 
                    name={jobName}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tableData && tableData.runs.length > 0 && (
        <div>
          <h2>Workflow Runs</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #555' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Run</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Commit</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Author</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Duration</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {tableData.runs.map(run => (
                <tr key={run.run_id} style={{ borderBottom: '1px solid #444' }}>
                  <td style={{ padding: '12px' }}>
                    <a href={run.html_url} target="_blank" rel="noopener noreferrer" style={{ color: '#8884d8', textDecoration: 'none' }}>
                      #{run.run_number}
                    </a>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      color: run.status === 'success' ? '#86efac' : '#f87171',
                      fontWeight: 'bold'
                    }}>
                      {run.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{run.commit_message.split('\n')[0]}</td>
                  <td style={{ padding: '12px' }}>{run.commit_author}</td>
                  <td style={{ padding: '12px' }}>{run.duration_seconds}s</td>
                  <td style={{ padding: '12px' }}>{new Date(run.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
              Previous
            </button>
            <span style={{padding: '0 1rem'}}>Page {tableData.currentPage} of {tableData.totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, tableData.totalPages))} disabled={currentPage === tableData.totalPages}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
