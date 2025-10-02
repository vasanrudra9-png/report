const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('.'));

// Load configuration
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// Load or initialize reports
function loadReports() {
    try {
        if (fs.existsSync('reports.json')) {
            return JSON.parse(fs.readFileSync('reports.json', 'utf8'));
        }
        return [];
    } catch (error) {
        return [];
    }
}

function saveReports(reports) {
    fs.writeFileSync('reports.json', JSON.stringify(reports, null, 2));
}

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.cookies.auth === 'true') {
        next();
    } else {
        res.redirect('/');
    }
}

// Routes
app.get('/', (req, res) => {
    if (req.cookies.auth === 'true') {
        res.redirect('/dashboard');
    } else {
        res.sendFile(path.join(__dirname, 'views/login.html'));
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === config.username && password === config.password) {
        res.cookie('auth', 'true', { maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Invalid credentials' });
    }
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views/dashboard.html'));
});

app.get('/new-report', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views/new-report.html'));
});

app.get('/total-count', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views/total-count.html'));
});

app.get('/report-history', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views/report-history.html'));
});

app.get('/report/:id', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views/report-detail.html'));
});

app.post('/logout', (req, res) => {
    res.clearCookie('auth');
    res.json({ success: true });
});

// API Routes
app.post('/api/reports', requireAuth, (req, res) => {
    const { name, reason, date } = req.body;
    const reports = loadReports();
    
    const newReport = {
        id: Date.now().toString(),
        name: name,
        reason: reason,
        date: date
    };
    
    reports.unshift(newReport);
    saveReports(reports);
    
    res.json({ success: true, report: newReport });
});

app.get('/api/reports', requireAuth, (req, res) => {
    const reports = loadReports();
    res.json(reports);
});

app.get('/api/reports/:id', requireAuth, (req, res) => {
    const reports = loadReports();
    const report = reports.find(r => r.id === req.params.id);
    
    if (report) {
        res.json({ success: true, report });
    } else {
        res.status(404).json({ success: false, message: 'Report not found' });
    }
});

app.get('/api/reports-count', requireAuth, (req, res) => {
    const reports = loadReports();
    res.json({ count: reports.length });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);

});
