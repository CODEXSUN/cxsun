import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { relative, resolve } from 'path'

import { Injectable } from '../../decorators/injectable.js'
import { settings } from '../../../framework/config/settings.js'

export interface ProjectDocEntry {
  id: string
  title: string
  category: string
  audience: 'user' | 'developer'
  path: string
  route: string
  updatedAt: string
}

export interface ProjectReadmeSource {
  title: string
  path: string
  updatedAt: string
}

@Injectable()
export class ProjectDocsService {
  overview() {
    const userDocs = this.listDocs('user', docsRoot('docs'), '/docs')
    const developerDocs = this.listDocs('developer', docsRoot('devdocs'), '/devdocs')
    const docs = [...userDocs, ...developerDocs]
    return {
      docsUrl: docsUrl('/docs/'),
      devDocsUrl: docsUrl('/devdocs/'),
      docsRoot: docsRoot('docs'),
      devDocsRoot: docsRoot('devdocs'),
      total: docs.length,
      categories: groupByCategory(docs),
      userDocs,
      developerDocs,
      docs,
      readmes: listReadmeSources(),
    }
  }

  private listDocs(audience: ProjectDocEntry['audience'], root: string, routeBasePath: string): ProjectDocEntry[] {
    if (!existsSync(root)) return []

    return walkMarkdown(root)
      .map((file) => toDocEntry(root, file, audience, routeBasePath))
      .sort((left, right) => left.category.localeCompare(right.category) || left.title.localeCompare(right.title))
  }
}

function docsUrl(path: '/docs/' | '/devdocs/') {
  const configured = settings.urls.docs ?? 'http://localhost:6020'
  const base = configured.endsWith('/') ? configured.slice(0, -1) : configured
  if (base.endsWith('/docs') || base.endsWith('/devdocs')) return `${base}/`
  return `${base}${path}`
}

function workspaceRoot() {
  return resolve(process.cwd(), process.cwd().replaceAll('\\', '/').endsWith('/apps/server') ? '../..' : '.')
}

function docsRoot(folder: 'docs' | 'devdocs') {
  return resolve(workspaceRoot(), 'apps', 'docs', folder)
}

function listReadmeSources(): ProjectReadmeSource[] {
  const root = workspaceRoot()
  const sourceRoots = [
    resolve(root, 'README.md'),
    resolve(root, 'assist', 'README.md'),
    resolve(root, 'assist', 'rules', 'versioning.md'),
    resolve(root, 'apps', 'frontend', 'src', 'features'),
    resolve(root, 'apps', 'server', 'src', 'modules'),
    resolve(root, 'apps', 'server', 'src', 'core'),
  ]

  return sourceRoots
    .flatMap((source) => {
      if (!existsSync(source)) return []
      const stats = statSync(source)
      return stats.isDirectory() ? walkReadmes(source) : [source]
    })
    .map((file) => {
      const stats = statSync(file)
      const relativePath = relative(root, file).replaceAll('\\', '/')
      return {
        title: readmeTitle(file) ?? titleCase(relativePath.replace(/\.md$/i, '').split('/').pop() ?? relativePath),
        path: relativePath,
        updatedAt: stats.mtime.toISOString(),
      }
    })
    .sort((left, right) => left.path.localeCompare(right.path))
}

function walkReadmes(root: string): string[] {
  const entries = readdirSync(root, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const path = resolve(root, entry.name)
    if (entry.isDirectory()) return walkReadmes(path)
    return entry.isFile() && isReadmeSource(entry.name) ? [path] : []
  })
}

function isReadmeSource(fileName: string) {
  return fileName === 'README.md' || /^[A-Z0-9-]+\.md$/.test(fileName)
}

function readmeTitle(file: string) {
  try {
    const heading = readFileSync(file, 'utf8').split(/\r?\n/).find((line) => line.startsWith('# '))
    return heading?.replace(/^#\s+/, '').trim() || null
  } catch {
    return null
  }
}

function walkMarkdown(root: string): string[] {
  const entries = readdirSync(root, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const path = resolve(root, entry.name)
    if (entry.isDirectory()) return walkMarkdown(path)
    return entry.isFile() && /\.mdx?$/.test(entry.name) ? [path] : []
  })
}

function toDocEntry(root: string, file: string, audience: ProjectDocEntry['audience'], routeBasePath: string): ProjectDocEntry {
  const relativePath = relative(root, file).replaceAll('\\', '/')
  const content = readFileSync(file, 'utf8')
  const id = relativePath.replace(/\.mdx?$/, '')
  const route = routeFromDocId(id, content, routeBasePath)
  const category = id.includes('/') ? titleCase(id.split('/')[0]) : 'Root'
  const stats = statSync(file)

  return {
    id,
    title: frontmatterValue(content, 'title') ?? titleCase(id.split('/').pop() ?? id),
    category,
    audience,
    path: relativePath,
    route,
    updatedAt: stats.mtime.toISOString(),
  }
}

function routeFromDocId(id: string, content: string, routeBasePath: string) {
  const slug = frontmatterValue(content, 'slug')
  const base = routeBasePath.startsWith('/') ? routeBasePath : `/${routeBasePath}`
  if (slug === '/') return base
  if (slug) return `${base}${slug.startsWith('/') ? slug : `/${slug}`}`
  return `${base}/${id}`
}

function frontmatterValue(content: string, key: string) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null
  const line = match[1].split(/\r?\n/).find((item) => item.trim().startsWith(`${key}:`))
  return line?.split(':').slice(1).join(':').trim().replace(/^['"]|['"]$/g, '') || null
}

function groupByCategory(docs: ProjectDocEntry[]) {
  return docs.reduce<Array<{ category: string; count: number }>>((groups, doc) => {
    const existing = groups.find((group) => group.category === doc.category)
    if (existing) {
      existing.count += 1
    } else {
      groups.push({ category: doc.category, count: 1 })
    }
    return groups
  }, [])
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
