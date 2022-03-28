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

function checkRepo(repoName, repoUrl) {
  fs.access(codeDir.path + '/' + repoName)
    .then(() => {
      exec('git pull --all', {
        cwd: codeDir.path + '/' + repoName,
        shell: '/bin/bash'
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
      fs.mkdir(codeDir.path + '/' + repoName)
        .then(() => {
          exec(`git clone ${repoUrl}`, {
            cwd: codeDir.path + repoName
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
  const repoName = event.payload.repository.name
  const repoUrl = event.payload.url
  const ref = event.payload.ref

  console.log('Received a push event for %s to %s',
    repoName,
    ref)

  checkRepo(repoName, repoUrl)
})
