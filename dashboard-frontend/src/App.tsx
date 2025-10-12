import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Dot } from 'recharts';
import './App.css';

// --- Data Interfaces ---
interface Stats {
  total_runs: number;
  success_rate: number;
  median_duration: number;
}

interface TableRun {
  run_id: number;
  run_number: number;
  html_url: string;
  status: string;
  duration_seconds: number;
  created_at: string;
  commit_author: string;
  commit_message: string;
}

interface TableData {
  runs: TableRun[];
  totalPages: number;
  currentPage: number;
}

interface AnomalyData {
  name: string;
  duration: number;
  rolling_avg: number | null;
  is_anomaly: boolean;
}

interface JobBreakdownData {
  job_name: string;
  current_duration: number;
  historical_avg: number | null;
  percent_change: number | null;
  is_anomaly: boolean;
}

interface JobTrendsData {
  chartData: Array<Record<string, string | number>>;
  jobNames: string[];
}

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
  const [jobBreakdownData, setJobBreakdownData] = useState<JobBreakdownData[]>([]);
  const [jobTrendsData, setJobTrendsData] = useState<JobTrendsData>({ chartData: [], jobNames: [] });
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [statsRes, tableRes, analysisRes, jobBreakdownRes, jobTrendsRes] = await Promise.all([
          axios.get('http://localhost:3000/api/stats'),
          axios.get(`http://localhost:3000/api/runs/table?page=${currentPage}&limit=5`),
          axios.get('http://localhost:3000/api/runs/duration-analysis'),
          axios.get('http://localhost:3000/api/jobs/breakdown'),
          axios.get('http://localhost:3000/api/jobs/trends')
        ]);

        setStats(statsRes.data);
        setTableData(tableRes.data);
        setAnalysisData(analysisRes.data);
        setJobBreakdownData(jobBreakdownRes.data.filter((job: JobBreakdownData) => job.job_name !== 'Check for Application Changes'));

        const trendsData = jobTrendsRes.data;
        if (trendsData && trendsData.jobNames) {
          trendsData.jobNames = trendsData.jobNames.filter((name: string) => name !== 'Check for Application Changes');
        }
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
  }, [currentPage]);

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

  const lineColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>CI/CD Pipeline Metrics Dashboard</h1>

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

      {jobBreakdownData.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2>Job Duration Breakdown (Most Recent Run)</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #555' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Job Name</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Current Duration</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Historical Average (5 runs)</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Percent Change</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Anomaly</th>
              </tr>
            </thead>
            <tbody>
              {jobBreakdownData.map(job => (
                <tr key={job.job_name} style={{ borderBottom: '1px solid #444' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{job.job_name}</td>
                  <td style={{ padding: '12px' }}>{job.current_duration}s</td>
                  <td style={{ padding: '12px' }}>{job.historical_avg ? `${job.historical_avg}s` : 'N/A'}</td>
                  <td style={{ padding: '12px', color: job.percent_change ? (job.percent_change > 0 ? '#ff6b81' : '#2ed573') : 'inherit' }}>
                    {job.percent_change ? `${job.percent_change > 0 ? '+' : ''}${job.percent_change}%` : 'N/A'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}><AnomalyIndicator isAnomaly={job.is_anomaly} /></td>
                </tr>
              ))}
            </tbody>
          </table>
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
