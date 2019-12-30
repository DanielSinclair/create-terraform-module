
import chalk from 'chalk'
import program from 'commander'
import fs from 'fs'
import path from 'path'
import inquirer from 'inquirer'
import open from 'open'
import preferences from '@danielsinclair/preferences'
import packageJSON from './package.json'
import shell from 'shelljs'

const prefs = new preferences('com.danielsinclair.terraformscripts', {})

program
.name(packageJSON.name)
.version(packageJSON.version)

program
.command('token <value>')
.description('set default terraform cloud user token')
.usage(`${chalk.green('token')} ${chalk.green('<value>')}`)
.action((t) => {
  prefs.token = t
  console.log(`Set default user token to ${chalk.green(t)}`)
  process.exit()
})

program
.command('organization <value>')
.description('set default terraform cloud organization')
.usage(`${chalk.green('organization')} ${chalk.green('<value>')}`)
.action((o) => {
  prefs.organization = o
  console.log(`Set default organization to ${chalk.green(o)}`)
  process.exit()
})

const parameters = `${chalk.green('<module-name>')} ${chalk.green('[provider]')}`
let moduleName, provider

program
.arguments('<module-name> [provider]')
.description('generate a terraform module and workflow')
.usage(`${parameters} [options]`)
.option('-o, --organization <string>', 'override terraform organization')
.option('-t, --token <string>', 'override terraform user token')
.action((m, p) => {
  moduleName = m
  provider = p || 'null'
})

program.parse(process.argv)

if (!moduleName) {
  console.log('Please specify:')
  console.log(`  ${parameters}`)
  console.log()
  console.log('For example:')
  console.log(`  ${chalk.cyan(program.name())} ${chalk.green('vpc')} ${chalk.green('aws')}`)
  console.log()
  console.log(`Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`)
  process.exit()
}

const option = async (key, option, message, prehook) => {
  if (!program[key] && !prefs[key]) {
    if (prehook) await prehook()
    return inquirer.prompt([{
      type: 'input',
      name: key,
      message
    }]).then(([t]) => {
      console.log(`${t} is now your default ${key}.`)
      console.log()
      console.log(`Override this value with ${chalk.green('-'+option)}`)
      console.log()
      console.log(`Change this value with ${chalk.green('npx create-terraform-module ' + key + ' <string>')}`)
      return t
    })
  } else {
    return program[key] || prefs[key]
  }
}

const main = async () => {
  const token = await option('token', 't', 'terraform cloud user token', async () => {
    console.log('Please generate an auth token for Terraform Cloud. Opening browser...')
    await open('https://app.terraform.io/app/settings/tokens')
  })
  const organization = await option('organization', 'o', 'terraform cloud organization')
  const fullModuleName = 'terraform-' + provider + '-' + moduleName
  const dir = `${process.cwd()}/` + fullModuleName
  if (!fs.existsSync(dir)) fs.mkdirSync(dir)
  const gitignore = fs.readFileSync(path.resolve(__dirname+'/template', '.gitignore'), 'utf8')
  fs.writeFileSync(`${dir}/.gitignore`, gitignore)
  fs.writeFileSync(`${dir}/package.json`, JSON.stringify({
    name: fullModuleName,
    version: '1.0.0',
    private: true,
    devDependencies: { 'terraform-scripts': 'latest' },
    scripts: { deploy: 'terraform-scripts deploy' }
  }, null, 2))
  shell.cd(dir)
  if (shell.which('yarn')) shell.exec('yarn')
  if (shell.which('git')) shell.exec('git init')
}

try {
  main()
} catch (e) {
  console.error(e)
}