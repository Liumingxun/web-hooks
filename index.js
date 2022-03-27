import { createServer } from 'http'
import createHandler from 'github-webhook-handler'
import * as fs from 'fs/promises'
import { exec } from 'child_process'
import config from './config.js'

const handler = createHandler({path: config.webhooksPath, secret: config.secret})
const codeDir = await fs.opendir(config.codeDir)

createServer((req, res) => {
  handler(req, res, (err) => {
    res.statusCode = 404
    if (!err)
      res.end('no such location')
  })
}).listen(33345)

handler.on('error', (err) => {
  console.error(`Error: ${err.message}`)
})

function checkRepo(repoFullName, repoUrl) {
  fs.access(codeDir.path + repoFullName)
    .then(() => {
      exec('git pull -all', {
        cwd: codeDir.path + repoFullName
      }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Shell Error: ${error.message}`)
          return
        }
        console.log(`Git Log: ${stdout}`)
        console.error(`Git Error: ${stderr}`)
      })
    })
    .catch(reason => {
      console.error(`Error: Have no git repository ${reason.path}`)
      fs.mkdir(codeDir.path + repoFullName)
        .then(() => {
          exec(`git clone ${repoUrl}`, {
            cwd: codeDir.path + repoFullName
          }, (error, stdout, stderr) => {
            if (error) {
              console.error(`Shell Error: ${error.message}`)
              return
            }
            console.log(`Git Log: ${stdout}`)
            console.error(`Git Error: ${stderr}`)
          })
        })
        .catch((reason) => {
          console.error(`Error: ${reason.message}`)
        })
    })
}

handler.on('push', function (event) {
  const repoFullName = event.payload.repository.full_name
  const repoUrl = event.payload.url
  const ref = event.payload.ref

  console.log('Received a push event for %s to %s',
    repoFullName,
    ref)

  checkRepo(repoFullName, repoUrl)
})
