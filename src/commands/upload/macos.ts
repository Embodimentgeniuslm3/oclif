import {Command, flags} from '@oclif/command'
import * as qq from 'qqjs'

import aws from '../../aws'
import {log} from '../../log'
import * as Tarballs from '../../tarballs'
import {commitAWSDir, templateShortKey} from '../../upload-util'

export default class UploadMacos extends Command {
  static hidden = true

  static description = 'upload macos installers built with pack:macos'

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
  }

  async run() {
    const {flags} = this.parse(UploadMacos)
    const buildConfig = await Tarballs.buildConfig(flags.root)
    const {s3Config, version, config, dist} = buildConfig
    const S3Options = {
      Bucket: s3Config.bucket!,
      ACL: s3Config.acl || 'public-read',
    }
    const cloudKeyBase = commitAWSDir(config.pjson.version, buildConfig.gitSha, s3Config)
    const templateKey = templateShortKey('macos', {bin: config.bin, version, sha: buildConfig.gitSha})
    const cloudKey = `${cloudKeyBase}/${templateKey}`
    const localPkg = dist(`macos/${templateKey}`)

    if (await qq.exists(localPkg)) await aws.s3.uploadFile(localPkg, {...S3Options, CacheControl: 'max-age=86400', Key: cloudKey})
    else this.error('Cannot find MacOS pkg', {
      suggestions: ['Run "oclif-dev pack:macos" before uploading'],
    })

    log(`uploaded ${templateKey}`)
  }
}
