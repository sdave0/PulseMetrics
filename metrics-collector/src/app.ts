import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { metricsRoutes } from './routes';
import { errorHandler } from './middleware';

const app = express();

app.use(helmet()); // Security headers
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:8080'], // Allow both dev and docker frontend
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.get('/', (req, res) => {
    res.send('Metrics Collector is running!');
});
app.use('/', metricsRoutes);

app.use(errorHandler);

export default app;
