const https = require('https')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const TOKEN = process.env.VERCEL_TOKEN
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_Zlkhi87S8rAwseG62zoEJ7ybRUGe'
const DIST = path.join(__dirname, 'dist-vercel')

function apiRequest(method, urlPath, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? (Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body))) : null
    const options = {
      hostname: 'api.vercel.com',
      path: urlPath,
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        ...extraHeaders,
        ...(data ? { 'Content-Length': data.length } : {}),
      },
    }
    const req = https.request(options, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString()
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }) }
        catch { resolve({ status: res.statusCode, body: raw }) }
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

function getAllFiles(dir, base = dir) {
  const result = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) result.push(...getAllFiles(full, base))
    else result.push({ full, rel: path.relative(base, full).replace(/\\/g, '/') })
  }
  return result
}

function mimeType(file) {
  const ext = path.extname(file).toLowerCase()
  return { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff' }[ext] || 'application/octet-stream'
}

async function deploy() {
  const files = getAllFiles(DIST)
  console.log(`Uploading ${files.length} files...`)

  const fileList = []
  for (const { full, rel } of files) {
    const content = fs.readFileSync(full)
    const sha = crypto.createHash('sha1').update(content).digest('hex')

    const res = await apiRequest('POST', '/v2/files', content, {
      'Content-Type': mimeType(full),
      'x-vercel-digest': sha,
    })
    if (res.status !== 200 && res.status !== 201) {
      console.log(`Upload ${rel}: ${res.status}`, res.body)
    }
    fileList.push({ file: rel, sha, size: content.length })
  }

  console.log('Creating deployment...')
  const deployBody = {
    name: 'equalizador-pq',
    files: fileList,
    target: 'production',
    projectSettings: {
      framework: null,
      outputDirectory: '.',
    },
    routes: [
      { handle: 'filesystem' },
      { src: '/.*', dest: '/index.html' },
    ],
  }

  const dep = await apiRequest('POST', `/v13/deployments?projectId=${PROJECT_ID}&forceNew=1`, deployBody, {
    'Content-Type': 'application/json',
  })

  if (dep.status !== 200 && dep.status !== 201) {
    console.error('Deployment failed:', JSON.stringify(dep.body, null, 2))
    process.exit(1)
  }

  const depId = dep.body.id
  const depUrl = dep.body.url
  console.log(`Deployment created: ${depId}`)
  console.log(`URL: https://${depUrl}`)

  // Poll for ready
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const status = await apiRequest('GET', `/v13/deployments/${depId}`, null, {})
    const st = status.body.readyState || status.body.status
    console.log(`Status: ${st}`)
    if (st === 'READY') {
      console.log(`\nDeployment ready! https://${depUrl}`)
      console.log('Live at: https://equalizador-pq.vercel.app')
      break
    }
    if (st === 'ERROR' || st === 'CANCELED') {
      console.error('Deployment error:', JSON.stringify(status.body, null, 2))
      process.exit(1)
    }
  }
}

deploy().catch(console.error)
