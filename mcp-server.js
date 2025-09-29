// mcp-server.js
// Minimal MCP-like server for exposing hostexecs/*.sh as tools.
// WARNING: Minimal example. Use whitelists & limits before using broadly.

const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const HOSTEXECS_DIR = path.resolve(__dirname, 'hostexecs');
const PORT = process.env.MCP_PORT || 8376;
const ALLOWED = fs.readdirSync(HOSTEXECS_DIR).filter(f => f.endsWith('.sh'));

// Build simple manifest of tools
function buildManifest() {
    return {
        name: "local-hostexecs-mcp",
        version: "0.1.0",
        description: "Expose whitelisted hostexecs/*.sh as MCP tools (dev only).",
        tools: ALLOWED.map(fname => {
            const id = path.basename(fname, '.sh');
            return {
                id,
                name: id,
                description: `Run ${fname}`,
                // optional: schema for args you accept
                inputs: {
                    type: "object",
                    properties: {
                        args: { type: "array", items: { type: "string" } }
                    }
                }
            };
        })
    };
}

const app = express();
app.use(express.json({ limit: '50kb' }));

// Simple health
app.get('/', (req, res) => res.send('mcp server ok'));

// Advertise manifest (used by client to discover tools)
app.get('/mcp/manifest', (req, res) => {
    res.json(buildManifest());
});

// Execute a tool
app.post('/mcp/execute', async (req, res) => {
    try {
        const { tool, inputs } = req.body;
        if (!tool) return res.status(400).json({ error: 'tool required' });

        // Whitelist check
        const scriptName = `${tool}.sh`;
        if (!ALLOWED.includes(scriptName)) {
            return res.status(403).json({ error: 'tool not allowed' });
        }

        const scriptPath = path.join(HOSTEXECS_DIR, scriptName);

        // Basic additional safety: ensure script is inside hostexecs
        if (!scriptPath.startsWith(HOSTEXECS_DIR)) {
            return res.status(403).json({ error: 'invalid script path' });
        }

        const args = (inputs && Array.isArray(inputs.args)) ? inputs.args : [];

        // Spawn the script with timeout and buffer control
        const child = spawn('bash', [scriptPath, ...args], {
            cwd: HOSTEXECS_DIR,
            env: Object.assign({}, process.env, { PATH: process.env.PATH }), // keep env minimal
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';
        const MAX_BYTES = 200 * 1024; // 200KB

        const killTimer = setTimeout(() => {
            child.kill('SIGKILL');
        }, 30_000); // 30s timeout

        child.stdout.on('data', d => {
            stdout += d.toString();
            if (stdout.length > MAX_BYTES) {
                stdout = stdout.slice(0, MAX_BYTES) + '\n...[truncated]';
            }
        });
        child.stderr.on('data', d => {
            stderr += d.toString();
            if (stderr.length > MAX_BYTES) {
                stderr = stderr.slice(0, MAX_BYTES) + '\n...[truncated]';
            }
        });

        child.on('error', e => {
            clearTimeout(killTimer);
            res.status(500).json({ error: 'spawn error', detail: e.message });
        });

        child.on('exit', (code, signal) => {
            clearTimeout(killTimer);
            res.json({
                tool,
                exitCode: code,
                signal,
                stdout,
                stderr,
                timestamp: new Date().toISOString()
            });
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`MCP-like server listening on http://localhost:${PORT}`);
    console.log('Allowed tools:', ALLOWED.map(f => path.basename(f, '.sh')).join(', '));
});
