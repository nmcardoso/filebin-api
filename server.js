const fs = require('fs')
const path = require('path')
const express = require('express')
const cmd = require('node-cmd')
const crypto = require('crypto')
const bodyParser = require('body-parser')
const cors = require('cors')
const multer = require('multer')
const Database = require('./database')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '.data/files')
  },
  filename: (req, file, cb) => {
    cb(null, crypto.randomBytes(16).toString('hex') + path.extname(file.originalname))
  }
})
const upload = multer({ storage })

const app = express()
app.use(bodyParser.json())
app.use(cors())

const db = new Database()

const verifySignature = (req, res, next) => {
  const payload = JSON.stringify(req.body)
  const hmac = crypto.createHmac('sha1', process.env.GITHUB_SECRET)
  const digest = 'sha1=' + hmac.update(payload).digest('hex')
  const checksum = req.headers['x-hub-signature']

  if (!checksum || !digest || checksum !== digest) {
    return res.status(403).send('auth failed')
  }

  return next()
}

// Github webhook listener
app.post('/git', verifySignature, (req, res) => {
  if (req.headers['x-github-event'] == 'push') {
    cmd.get('bash git.sh', (err, data) => {
      if (err) return console.log(err)
      console.log(data)
      cmd.run('refresh')
      return res.status(200).send(data)
    })
  } else if (req.headers['x-github-event'] == 'ping') {
    return res.status(200).send('PONG')
  } else {
    return res.status(200).send('Unsuported Github event. Nothing done.')
  }
})

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

app.post('/api/upload', upload.single('file'), (req, res) => {
  db.insertFile(req.file.filename, req.file.originalname)
  res.send('OK')
})

app.get('/api/files', (req, res) => {
  res.json(db.getAllFiles())
})

app.delete('/api/file/:filename', (req, res) => {
  if (fs.existsSync(__dirname + '/.data/files/' + req.params.filename)) {
    db.deleteFile(req.params.filename)
    fs.unlinkSync(__dirname + '/.data/files/' + req.params.filename)
    res.json({ success: true })
  }
  res.status(404).json({ success: false })
})

app.get('/file/:filename', (req, res) => {
  res.sendFile(__dirname + '/.data/files/' + req.params.filename)
})

app.listen(process.env.PORT || 3000, () => {
  console.log(`Your app is listening on port ${process.env.PORT || 3000}`)
})
