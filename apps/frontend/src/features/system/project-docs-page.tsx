import { useQuery } from "@tanstack/react-query"
import { BookOpenText, ExternalLink, FileText, RefreshCw } from "lucide-react"

import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Spinner } from "src/components/ui/spinner"
import type { AuthSession } from "src/features/auth/auth-client"
import { getProjectDocsOverview, type ProjectDocEntry, type ProjectReadmeSource } from "./system-manager-client"

export default function ProjectDocsPage({ session }: { session: AuthSession }) {
  const docsQuery = useQuery({ queryKey: ["project-docs-overview"], queryFn: () => getProjectDocsOverview(session) })
  const overview = docsQuery.data

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dev Docs</h1>
          <p className="text-sm text-muted-foreground">Super-admin and devops documentation, with client user guides linked from the same docs app.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void docsQuery.refetch()} disabled={docsQuery.isFetching}>
            <RefreshCw className={docsQuery.isFetching ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </Button>
          {overview ? (
            <>
              <Button asChild type="button" variant="outline">
                <a href={overview.docsUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  User docs
                </a>
              </Button>
              <Button asChild type="button">
                <a href={overview.devDocsUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Dev docs
                </a>
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {docsQuery.isLoading ? (
        <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading project docs
        </div>
      ) : overview ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <InfoCard label="User docs" value={String(overview.userDocs.length)} detail={overview.docsUrl} />
            <InfoCard label="Dev docs" value={String(overview.developerDocs.length)} detail={overview.devDocsUrl} />
            <InfoCard label="Readme sources" value={String(overview.readmes.length)} detail="Repo README and module guide files connected to this page" />
          </div>

          <Card className="rounded-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpenText className="size-4" />
                User Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Document</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-left">Markdown</th>
                    <th className="px-3 py-2 text-left">Updated</th>
                    <th className="px-3 py-2 text-right">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.userDocs.map((doc) => (
                    <DocRow doc={doc} docsUrl={overview.docsUrl} key={doc.id} />
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="rounded-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpenText className="size-4" />
                Developer And Super-admin Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Document</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-left">Markdown</th>
                    <th className="px-3 py-2 text-left">Updated</th>
                    <th className="px-3 py-2 text-right">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.developerDocs.map((doc) => (
                    <DocRow doc={doc} docsUrl={overview.devDocsUrl} key={doc.id} />
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="rounded-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4" />
                Readme Sources
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Source</th>
                    <th className="px-3 py-2 text-left">Path</th>
                    <th className="px-3 py-2 text-left">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.readmes.map((source) => (
                    <ReadmeRow key={source.path} source={source} />
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="rounded-md">
          <CardContent className="grid min-h-40 place-items-center text-sm text-muted-foreground">
            Project docs are not available.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ReadmeRow({ source }: { source: ProjectReadmeSource }) {
  return (
    <tr className="border-b">
      <td className="px-3 py-2 font-medium">{source.title}</td>
      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{source.path}</td>
      <td className="px-3 py-2 text-muted-foreground">{formatDate(source.updatedAt)}</td>
    </tr>
  )
}

function DocRow({ doc, docsUrl }: { doc: ProjectDocEntry; docsUrl: string }) {
  return (
    <tr className="border-b">
      <td className="px-3 py-2 font-medium">
        <span className="inline-flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          {doc.title}
        </span>
      </td>
      <td className="px-3 py-2"><Badge variant="outline">{doc.category}</Badge></td>
      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{doc.path}</td>
      <td className="px-3 py-2 text-muted-foreground">{formatDate(doc.updatedAt)}</td>
      <td className="px-3 py-2 text-right">
        <Button asChild type="button" variant="outline" size="sm">
          <a href={docUrl(docsUrl, doc.route)} target="_blank" rel="noreferrer">
            <ExternalLink className="size-3.5" />
            Open
          </a>
        </Button>
      </td>
    </tr>
  )
}

function InfoCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="rounded-md">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className="mt-2 break-all text-xl font-semibold">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function docUrl(baseUrl: string, route: string) {
  try {
    const url = new URL(baseUrl)
    return `${url.origin}${route.startsWith("/") ? route : `/${route}`}`
  } catch {
    const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
    return `${base}${route.startsWith("/") ? route : `/${route}`}`
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
