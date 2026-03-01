const { spawn, execSync } = require('child_process');
const http = require('http');

console.log('\n🚀 Starting PulseAI Services...\n');

// 1. Check if Database is already running
let isDbAlreadyRunning = false;
try {
    const psOutput = execSync('docker-compose ps postgres').toString();
    if (psOutput.includes('Up') || psOutput.includes('running')) {
        isDbAlreadyRunning = true;
    }
} catch (e) {
    // Ignore error if docker-compose fails or container doesn't exist
}

// 2. Start Database (Postgres via Docker Compose)
console.log('📦 Starting Database (Docker)...');
const dbCmd = spawn('docker-compose', ['up', '-d', 'postgres'], { stdio: 'inherit', shell: true });

dbCmd.on('close', (code) => {
    if (code !== 0) {
        console.error('❌ Failed to start database. Make sure Docker is running.');
        process.exit(1);
    }

    if (isDbAlreadyRunning) {
        console.log('✅ Database is already running securely.');
    } else {
        console.log('✅ Database is up.');
    }

    console.log('⚙️  Starting Backend (Port 3000)...');
    console.log('🖥️  Starting Frontend (Port 5173)...');
    console.log('🌐 Starting Ngrok (Port 3000)...\n');

    // 3. Start Backend, Frontend, and Ngrok
    const backend = spawn('npm', ['run', 'dev'], { cwd: './metrics-collector', stdio: 'pipe', shell: true });
    const frontend = spawn('npm', ['run', 'dev'], { cwd: './dashboard-frontend', stdio: 'pipe', shell: true });

    // Run ngrok in headless mode or capture stdout so it doesn't take over the terminal
    const ngrok = spawn('npx', ['ngrok', 'http', '3000', '--log=stdout'], { stdio: 'pipe', shell: true });

    // Stream logs for debugging if needed, but we'll keep it quiet unless there's an error
    backend.stderr.on('data', data => console.error(`[Backend API] ${data.toString().trim()}`));
    frontend.stderr.on('data', data => console.error(`[Frontend UI] ${data.toString().trim()}`));

    // We can also pipe their stdout if we want, but it might get messy. Let's show specific markers.
    let backendStarted = false;
    backend.stdout.on('data', data => {
        const text = data.toString();
        if (!backendStarted && text.includes('Server running')) {
            backendStarted = true;
            console.log('✅ Backend API is ready.');
        }
    });

    let frontendStarted = false;
    frontend.stdout.on('data', data => {
        const text = data.toString();
        if (!frontendStarted && text.includes('Local:')) {
            frontendStarted = true;
            console.log('✅ Frontend UI is ready.');
        }
    });

    // 4. Fetch Ngrok URL once it starts
    const fetchNgrokUrl = () => {
        http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const tunnels = JSON.parse(data).tunnels;
                    if (tunnels && tunnels.length > 0) {
                        const url = tunnels.find(t => t.public_url.startsWith('https'))?.public_url || tunnels[0].public_url;
                        console.log('\n===================================================');
                        console.log('🎉 All PulseAI Services Are Running!');
                        console.log('===================================================');
                        console.log('🖥️  Frontend Dashboard:  http://localhost:5173');
                        console.log('⚙️  Backend API Server:  http://localhost:3000');
                        console.log(`🌐 Ngrok Webhook URL:    ${url}`);
                        console.log('   (Use this URL in your GitHub Webhooks config)');
                        console.log('===================================================\n');
                        console.log('Press Ctrl+C to stop all services.');
                    } else {
                        setTimeout(fetchNgrokUrl, 1000);
                    }
                } catch (e) {
                    setTimeout(fetchNgrokUrl, 1000);
                }
            });
        }).on('error', () => {
            setTimeout(fetchNgrokUrl, 1000);
        });
    };

    setTimeout(fetchNgrokUrl, 3000);

    // Cleanup on exit
    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping all services (this might take a few seconds)...');
        backend.kill('SIGINT');
        frontend.kill('SIGINT');
        ngrok.kill('SIGINT');

        if (isDbAlreadyRunning) {
            console.log('✅ Node Services stopped gracefully. (Left database running as it was started externally)');
            process.exit();
        } else {
            console.log('📦 Shutting down Database (Docker)...');
            const stopCmd = spawn('docker-compose', ['stop', 'postgres'], { stdio: 'inherit', shell: true });

            stopCmd.on('close', () => {
                console.log('✅ Services stopped gracefully.');
                process.exit();
            });
        }
    });
});
