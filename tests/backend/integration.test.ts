import request from 'supertest';

const mockProcessMetricsFn = jest.fn();

jest.mock('../../metrics-collector/src/services/MetricsService', () => {
    return {
        MetricsService: jest.fn().mockImplementation(() => {
            return {
                processMetrics: mockProcessMetricsFn,
                getPipelines: jest.fn(),
                getStats: jest.fn(),
                getRunsTable: jest.fn(),
                getDurationAnalysis: jest.fn(),
                getJobBreakdown: jest.fn(),
                getJobTrends: jest.fn(),
                getChartData: jest.fn(),
            };
        }),
    };
});

jest.mock('../../metrics-collector/src/services/AiService', () => {
    return {
        AiService: jest.fn().mockImplementation(() => {
            return {
                generateSummary: jest.fn()
            };
        })
    };
});

import app from '../../metrics-collector/src/app';

describe('POST /metrics', () => {
    beforeEach(() => {
        mockProcessMetricsFn.mockClear();
    });

    it('should accept valid metrics payload', async () => {
        const payload = {
            workflow: {
                run_id: 123,
                name: 'CI Pipeline',
                status: 'completed',
                conclusion: 'success',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                html_url: 'http://github.com/owner/repo/actions/runs/123',
                jobs_url: 'http://api.github.com/repos/owner/repo/actions/runs/123/jobs',
                duration_seconds: 60
            },
            commit: {
                sha: 'abc1234',
                message: 'feat: add tests',
                author: 'DevOps Engineer',
                branch: 'main',
                files_changed: 5
            },
            jobs: []
        };

        mockProcessMetricsFn.mockResolvedValue(undefined);

        const response = await request(app)
            .post('/metrics')
            .send(payload)
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(201);
        expect(response.body).toEqual({ message: 'Metrics received and stored.' });
        expect(mockProcessMetricsFn).toHaveBeenCalledWith(expect.objectContaining({
            workflow: expect.objectContaining({ run_id: 123 })
        }));
    });

    it('should return 400 if workflow data is missing', async () => {
        const payload = {
            commit: {}
        };

        const response = await request(app)
            .post('/metrics')
            .send(payload)
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Invalid payload: Missing workflow data.' });
        expect(mockProcessMetricsFn).not.toHaveBeenCalled();
    });
});
