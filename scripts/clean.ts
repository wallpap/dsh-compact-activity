import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

// 递归删除只允许作用于构建目录。先解析绝对路径，避免变量异常时扩大到项目根目录。
rmSync(resolve('lib'), { recursive: true, force: true })
