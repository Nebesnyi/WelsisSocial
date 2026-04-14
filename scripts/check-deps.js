#!/usr/bin/env node
/**
 * Проверяет наличие node_modules в backend/ и frontend/.
 * Если папки нет — запускает npm install автоматически.
 */
const { execSync } = require('child_process')
const fs   = require('fs')
const path = require('path')

const root     = path.join(__dirname, '..')
const dirs     = ['backend', 'frontend']
const missing  = dirs.filter(d => !fs.existsSync(path.join(root, d, 'node_modules')))

if (missing.length === 0) {
  console.log('✅  Зависимости установлены')
  process.exit(0)
}

console.log(`📦  Устанавливаем зависимости: ${missing.join(', ')} ...`)
for (const dir of missing) {
  console.log(`\n→ npm install в ${dir}/`)
  execSync('npm install', { cwd: path.join(root, dir), stdio: 'inherit' })
}
console.log('\n✅  Готово — запускаем сервер\n')
