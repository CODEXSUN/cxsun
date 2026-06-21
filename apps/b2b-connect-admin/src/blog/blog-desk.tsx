import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react"
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  Image,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { adminApi } from "../api"

type Row = Record<string, unknown>
type BlogView = { mode: "list" } | { mode: "show"; article: Row } | { mode: "upsert"; article: Row | null }
type BlogMediaAsset = {
  uuid: string
  original_name: string
  mime_type: string
  public_url: string
  alt_text?: string | null
  caption?: string | null
  created_at: string
}

const BlogRichEditor = lazy(() => import("./blog-rich-editor"))

export function BillingBlogDesk({ onNotice }: { onNotice(message: string): void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [categories, setCategories] = useState<Row[]>([])
  const [tags, setTags] = useState<Row[]>([])
  const [comments, setComments] = useState<Row[]>([])
  const [view, setView] = useState<BlogView>({ mode: "list" })
  const [status, setStatus] = useState("all")
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 20

  const load = () => Promise.all([
    adminApi<{ records: Row[] }>(`/content/article?limit=100${status !== "all" ? `&status=${status}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`),
    adminApi<{ records: Row[] }>("/blog/categories?limit=100"),
    adminApi<{ records: Row[] }>("/blog/tags?limit=100"),
    adminApi<{ records: Row[] }>("/blog/comments?limit=500"),
  ]).then(([articleRows, categoryRows, tagRows, commentRows]) => {
    setRows(articleRows.records)
    setCategories(categoryRows.records)
    setTags(tagRows.records)
    setComments(commentRows.records)
  })

  useEffect(() => {
    load().catch(() => undefined)
  }, [status])

  async function commentStatus(row: Row, nextStatus: string) {
    await adminApi(`/blog/comments/${row.uuid}/status`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) })
    await load()
    onNotice(nextStatus === "approved" ? "Comment approved for the public article." : "Comment hidden from the public article.")
  }

  async function changeArticleStatus(article: Row, nextStatus: string) {
    const updated = await saveBlogArticle(article, { status: nextStatus })
    await load()
    setView({ mode: "show", article: updated })
    onNotice(nextStatus === "published" ? "Blog article published." : nextStatus === "archived" ? "Blog article archived." : "Blog article moved to draft.")
  }

  if (view.mode === "upsert") {
    return (
      <BlogUpsertPage
        article={view.article}
        articles={rows}
        categories={categories}
        tags={tags}
        onBack={() => setView(view.article ? { mode: "show", article: view.article } : { mode: "list" })}
        onNotice={onNotice}
        onTaxonomySaved={load}
        onSaved={async (article) => {
          await load()
          setView({ mode: "show", article })
        }}
      />
    )
  }

  if (view.mode === "show") {
    const article = rows.find((row) => row.uuid === view.article.uuid) ?? view.article
    const articleComments = comments.filter((comment) => String(comment.article_slug) === String(article.slug))
    const index = rows.findIndex((row) => row.uuid === article.uuid)
    return (
      <BlogShowPage
        article={article}
        comments={articleComments}
        next={index >= 0 && index < rows.length - 1 ? rows[index + 1] : null}
        previous={index > 0 ? rows[index - 1] : null}
        onBack={() => setView({ mode: "list" })}
        onCommentStatus={commentStatus}
        onEdit={() => setView({ mode: "upsert", article })}
        onNew={() => setView({ mode: "upsert", article: null })}
        onNext={(next) => setView({ mode: "show", article: next })}
        onPrevious={(previous) => setView({ mode: "show", article: previous })}
        onStatusChange={changeArticleStatus}
      />
    )
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage))
  const pageRows = rows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  return (
    <section className="blog-module">
      <header className="blog-list-header">
        <div>
          <h2>Blog</h2>
          <p>Create, review, publish, and moderate Tirupur Connect articles.</p>
        </div>
        <div className="blog-header-actions">
          <button onClick={() => void load()} type="button"><RefreshCw size={16} />Refresh</button>
          <button className="primary" onClick={() => setView({ mode: "upsert", article: null })} type="button"><Plus size={16} />New Article</button>
        </div>
      </header>
      <div className="blog-list-toolbar">
        <label><Search size={17} /><input onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { setCurrentPage(1); void load() } }} placeholder="Search title, category, or content" value={search} /></label>
        <select onChange={(event) => { setStatus(event.target.value); setCurrentPage(1) }} value={status}>
          <option value="all">All articles</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <div className="blog-comment-badges">
          {commentStatusCounts(comments).map((item) => <span className={`is-${item.status}`} key={item.status}>{item.label}: <b>{item.count}</b></span>)}
        </div>
      </div>
      <BlogListTable
        comments={comments}
        currentPage={currentPage}
        rows={pageRows}
        onArchive={(article) => void changeArticleStatus(article, "archived")}
        onEdit={(article) => setView({ mode: "upsert", article })}
        onView={(article) => setView({ mode: "show", article })}
      />
      <footer className="blog-list-footer">
        <span>Total articles: <strong>{rows.length}</strong></span>
        <div>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} type="button"><ChevronLeft size={16} />Previous</button>
          <span>{currentPage} / {totalPages}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => page + 1)} type="button">Next<ChevronRight size={16} /></button>
        </div>
      </footer>
    </section>
  )
}

function BlogListTable({ comments, currentPage, rows, onArchive, onEdit, onView }: {
  comments: Row[]
  currentPage: number
  rows: Row[]
  onArchive(article: Row): void
  onEdit(article: Row): void
  onView(article: Row): void
}) {
  return (
    <div className="blog-list-table">
      <table>
        <thead><tr><th>#</th><th>Article</th><th>Category</th><th>Authoring</th><th>Comments</th><th>Status</th><th>Updated</th><th>Action</th></tr></thead>
        <tbody>
          {rows.map((article, index) => {
            const articleComments = comments.filter((comment) => String(comment.article_slug) === String(article.slug))
            const pending = articleComments.filter((comment) => String(comment.status) === "pending").length
            return (
              <tr key={String(article.uuid)}>
                <td>{(currentPage - 1) * 20 + index + 1}</td>
                <td>
                  <button className="blog-title-link" onClick={() => onView(article)} type="button">{textValue(article.title)}</button>
                  <small>/{textValue(article.slug)}</small>
                </td>
                <td>{textValue(article.category) || "Uncategorised"}</td>
                <td><span className="blog-mini-meta"><Clock3 size={14} />{textValue(article.reading_minutes) || "0"} min</span>{article.featured === 1 ? <small>Featured</small> : null}</td>
                <td><span className={pending ? "blog-comment-count has-pending" : "blog-comment-count"}><MessageSquare size={15} />{articleComments.length}{pending ? <b>{pending} pending</b> : null}</span></td>
                <td><BlogStatus status={textValue(article.status)} /></td>
                <td>{formatAdminDate(article.updated_at)}</td>
                <td><BlogRowActions article={article} onArchive={onArchive} onEdit={onEdit} onView={onView} /></td>
              </tr>
            )
          })}
          {!rows.length ? <tr><td className="blog-empty-row" colSpan={8}>No articles match this view.</td></tr> : null}
        </tbody>
      </table>
    </div>
  )
}

function BlogRowActions({ article, onArchive, onEdit, onView }: { article: Row; onArchive(article: Row): void; onEdit(article: Row): void; onView(article: Row): void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="blog-row-actions">
      <button aria-label={`Actions for ${textValue(article.title)}`} onClick={() => setOpen((value) => !value)} type="button"><MoreHorizontal size={18} /></button>
      {open ? <div>
        <button onClick={() => onView(article)} type="button"><Eye size={15} />View</button>
        <button onClick={() => onEdit(article)} type="button"><Pencil size={15} />Edit</button>
        <button className="danger" onClick={() => onArchive(article)} type="button"><Trash2 size={15} />Archive</button>
      </div> : null}
    </div>
  )
}

function BlogShowPage({ article, comments, next, previous, onBack, onCommentStatus, onEdit, onNew, onNext, onPrevious, onStatusChange }: {
  article: Row
  comments: Row[]
  next: Row | null
  previous: Row | null
  onBack(): void
  onCommentStatus(comment: Row, status: string): Promise<void>
  onEdit(): void
  onNew(): void
  onNext(article: Row): void
  onPrevious(article: Row): void
  onStatusChange(article: Row, status: string): Promise<void>
}) {
  const [commentFilter, setCommentFilter] = useState("all")
  const rootComments = comments.filter((comment) => !comment.parent_uuid)
  const replies = comments.filter((comment) => comment.parent_uuid)
  const approved = comments.filter((comment) => String(comment.status) === "approved").length
  const pending = comments.filter((comment) => String(comment.status) === "pending").length
  const visibleRootComments = rootComments.filter((comment) => commentFilter === "all" || textValue(comment.status) === commentFilter)
  const publicPath = `/blog/${textValue(article.slug)}`
  return (
    <section className="blog-show-page">
      <header className="blog-document-header">
        <div>
          <button className="blog-back-link" onClick={onBack} type="button"><ArrowLeft size={16} />Blog</button>
          <h2>{textValue(article.title)}</h2>
          <p>Review the public article and moderate its discussion before publication.</p>
        </div>
        <div className="blog-header-actions">
          <button disabled={!previous} onClick={() => previous && onPrevious(previous)} title="Previous article" type="button"><ChevronLeft size={16} /></button>
          <button disabled={!next} onClick={() => next && onNext(next)} title="Next article" type="button"><ChevronRight size={16} /></button>
          <button onClick={() => window.open(publicPath, "_blank", "noopener,noreferrer")} type="button"><ExternalLink size={16} />Open public</button>
          <button onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}${publicPath}`)} type="button"><Copy size={16} />Copy link</button>
          <button onClick={onEdit} type="button"><Pencil size={16} />Edit</button>
          <button className="primary" onClick={onNew} type="button"><Plus size={16} />New Article</button>
        </div>
      </header>

      <div className="blog-show-layout">
        <main className="blog-article-preview">
          {textValue(article.image_url) ? <img alt="" src={textValue(article.image_url)} /> : null}
          <div className="blog-preview-meta"><BlogStatus status={textValue(article.status)} /><span>{textValue(article.category) || "Uncategorised"}</span><span>{textValue(article.reading_minutes) || "0"} min read</span><span>{formatAdminDate(article.published_at || article.updated_at)}</span></div>
          <h1>{textValue(article.title)}</h1>
          {textValue(article.excerpt) ? <p className="blog-preview-excerpt">{textValue(article.excerpt)}</p> : null}
          <div className="blog-preview-body" dangerouslySetInnerHTML={{ __html: textValue(article.body) }} />
          <div className="blog-preview-tags">{articleTagNames(article).map((tag) => <span key={tag}>{tag}</span>)}</div>
        </main>

        <aside className="blog-publish-panel">
          <section>
            <h3>Publish</h3>
            <dl>
              <div><dt>Status</dt><dd><BlogStatus status={textValue(article.status)} /></dd></div>
              <div><dt>Visibility</dt><dd>{textValue(article.status) === "published" ? "Public" : "Private"}</dd></div>
              <div><dt>Comments</dt><dd>{article.allow_comments === 0 ? "Closed" : "Open"}</dd></div>
              <div><dt>Updated</dt><dd>{formatAdminDate(article.updated_at)}</dd></div>
            </dl>
            <div className="blog-publish-actions">
              {textValue(article.status) !== "published" ? <button className="primary" onClick={() => void onStatusChange(article, "published")} type="button"><Check size={16} />Publish</button> : <button onClick={() => void onStatusChange(article, "draft")} type="button">Move to draft</button>}
              {textValue(article.status) !== "archived" ? <button className="danger-text" onClick={() => void onStatusChange(article, "archived")} type="button">Archive</button> : null}
            </div>
          </section>
          <section>
            <h3>SEO preview</h3>
            <strong className="blog-seo-title">{textValue(article.seo_title) || textValue(article.title)}</strong>
            <span className="blog-seo-url">{textValue(article.canonical_url) || `/blog/${textValue(article.slug)}`}</span>
            <p>{textValue(article.seo_description) || textValue(article.excerpt) || textValue(article.summary)}</p>
          </section>
        </aside>
      </div>

      <section className="blog-moderation">
        <header>
          <div><small>Discussion moderation</small><h2>Comments and replies</h2><p>Only approved comments with approved parent threads are visible on the public article.</p></div>
          <div><span><MessageSquare size={16} />{comments.length} total</span><span className={pending ? "warning" : ""}><CircleAlert size={16} />{pending} pending</span><span><Check size={16} />{approved} approved</span></div>
        </header>
        <div className="blog-comment-filter">
          {["all", "pending", "approved", "spam", "archived"].map((item) => (
            <button className={commentFilter === item ? "active" : ""} key={item} onClick={() => setCommentFilter(item)} type="button">
              {item}<b>{item === "all" ? comments.length : comments.filter((comment) => textValue(comment.status) === item).length}</b>
            </button>
          ))}
        </div>
        <div className="blog-thread-list">
          {visibleRootComments.map((comment) => (
            <BlogModerationComment
              comment={comment}
              key={String(comment.uuid)}
              replies={replies.filter((reply) => String(reply.parent_uuid) === String(comment.uuid))}
              onStatus={onCommentStatus}
            />
          ))}
          {!visibleRootComments.length ? <div className="blog-moderation-empty">No comments match this filter.</div> : null}
        </div>
      </section>
    </section>
  )
}

function BlogModerationComment({ comment, replies, onStatus }: { comment: Row; replies: Row[]; onStatus(comment: Row, status: string): Promise<void> }) {
  return (
    <article className="blog-moderation-comment">
      <BlogCommentBody comment={comment} onStatus={onStatus} />
      {replies.length ? <div className="blog-moderation-replies">{replies.map((reply) => <BlogCommentBody comment={reply} key={String(reply.uuid)} onStatus={onStatus} reply />)}</div> : null}
    </article>
  )
}

function BlogCommentBody({ comment, onStatus, reply = false }: { comment: Row; onStatus(comment: Row, status: string): Promise<void>; reply?: boolean }) {
  const status = textValue(comment.status)
  return (
    <div className={reply ? "blog-comment-body is-reply" : "blog-comment-body"}>
      <div className="blog-comment-avatar">{textValue(comment.author_name).slice(0, 1).toUpperCase()}</div>
      <div>
        <header><strong>{textValue(comment.author_name)}</strong><span>{formatAdminDate(comment.created_at)}</span><BlogStatus status={status} /></header>
        <p>{textValue(comment.body)}</p>
        <div className="blog-comment-moderation-actions">
          {status !== "approved" ? <button className="approve" onClick={() => void onStatus(comment, "approved")} type="button"><Check size={15} />Approve</button> : null}
          {status !== "pending" ? <button onClick={() => void onStatus(comment, "pending")} type="button">Pending</button> : null}
          {status !== "spam" ? <button className="danger-text" onClick={() => void onStatus(comment, "spam")} type="button">Mark spam</button> : null}
          {status !== "archived" ? <button className="danger-text" onClick={() => void onStatus(comment, "archived")} type="button">Archive</button> : null}
        </div>
      </div>
    </div>
  )
}

function BlogUpsertPage({ article, articles, categories, tags, onBack, onNotice, onSaved, onTaxonomySaved }: {
  article: Row | null
  articles: Row[]
  categories: Row[]
  tags: Row[]
  onBack(): void
  onNotice(message: string): void
  onSaved(article: Row): Promise<void>
  onTaxonomySaved(): Promise<void>
}) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [saving, setSaving] = useState(false)
  const [featuredImage, setFeaturedImage] = useState(textValue(article?.image_url))
  const [mediaOpen, setMediaOpen] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState(() => articleCategorySlugs(article))
  const [selectedTags, setSelectedTags] = useState(() => articleTagNames(article))
  const [seoTitle, setSeoTitle] = useState(textValue(article?.seo_title))
  const [seoDescription, setSeoDescription] = useState(textValue(article?.seo_description))
  const [canonicalUrl, setCanonicalUrl] = useState(textValue(article?.canonical_url))
  const [slug, setSlug] = useState(textValue(article?.slug))
  const [summary, setSummary] = useState(textValue(article?.summary))
  const [excerpt, setExcerpt] = useState(textValue(article?.excerpt))
  const articleMetadata = metadataValue(article)
  const [publicShow, setPublicShow] = useState(articleMetadata.publicShow !== false)
  const [publicOrder, setPublicOrder] = useState(textValue(articleMetadata.publicOrder))
  const [publicRoom, setPublicRoom] = useState(textValue(articleMetadata.publicRoom))
  const [bodyHtml, setBodyHtml] = useState(() => textValue(article?.body) || "<p>Write the blog article here...</p>")
  const [autoSaveLabel, setAutoSaveLabel] = useState("")
  const [selectedRelated, setSelectedRelated] = useState<string[]>(() => relatedSlugs(article))
  const draftKey = `tc-blog-draft:${textValue(article?.uuid) || "new"}`

  useEffect(() => {
    const stored = localStorage.getItem(draftKey)
    if (!stored) return
    try {
      const draft = JSON.parse(stored) as Record<string, string>
      if (!article && draft.bodyHtml) setBodyHtml(draft.bodyHtml)
      if (!article && draft.summary) setSummary(draft.summary)
      if (!article && draft.excerpt) setExcerpt(draft.excerpt)
      if (!article && draft.seoTitle) setSeoTitle(draft.seoTitle)
      if (!article && draft.seoDescription) setSeoDescription(draft.seoDescription)
      if (!article && draft.slug) setSlug(draft.slug)
      if (!article && draft.canonicalUrl) setCanonicalUrl(draft.canonicalUrl)
      if (!article) setAutoSaveLabel("Local draft restored")
    } catch {
      localStorage.removeItem(draftKey)
    }
  }, [article, draftKey])

  useEffect(() => {
    const timer = window.setInterval(() => {
      saveLocalDraft()
    }, 30000)
    return () => window.clearInterval(timer)
  }, [bodyHtml, canonicalUrl, draftKey, excerpt, seoDescription, seoTitle, slug, summary])

  function saveLocalDraft() {
    const form = formRef.current
    const title = form ? textValue(new FormData(form).get("title")) : ""
    localStorage.setItem(draftKey, JSON.stringify({ bodyHtml, canonicalUrl, excerpt, seoDescription, seoTitle, slug, summary, title }))
    setAutoSaveLabel(`Draft saved ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget).entries())
      const saved = await saveBlogArticle(article, {
        ...data,
        allowComments: data.allowComments === "on",
        body: bodyHtml,
        categories: selectedCategories,
        featured: data.featured === "on",
        publicOrder,
        publicRoom,
        publicShow,
        relatedSlugs: selectedRelated,
        tags: selectedTags,
      })
      localStorage.removeItem(draftKey)
      onNotice(article ? "Blog article updated." : "Blog article created.")
      await onSaved(saved)
    } finally {
      setSaving(false)
    }
  }

  async function saveTaxonomy(kind: "categories" | "tags", name: string) {
    const saved = await adminApi<Row>(`/blog/${kind}`, { method: "POST", body: JSON.stringify({ name, status: "active" }) })
    await onTaxonomySaved()
    onNotice(kind === "categories" ? "Blog category saved." : "Blog tag saved.")
    return saved
  }

  function generateSeo(form: HTMLFormElement) {
    const data = new FormData(form)
    const title = textValue(data.get("title")).trim()
    const summary = textValue(data.get("excerpt") || data.get("summary")).trim()
    const body = stripHtml(bodyHtml)
    const generatedSlug = slug || slugifyText(title)
    setSeoTitle(limitText(title, 60))
    setSeoDescription(limitText(summary || body, 160))
    setSlug(generatedSlug)
    setCanonicalUrl(`/blog/${generatedSlug}`)
    onNotice("SEO fields generated. Review them before saving.")
  }

  function generateSummaryAndExcerpt() {
    const body = stripHtml(bodyHtml)
    if (!body) {
      onNotice("Write some article content before generating the summary.")
      return
    }
    setSummary(limitText(body, 320))
    setExcerpt(limitText(body, 160))
    onNotice("Summary and excerpt generated. Review them before saving.")
  }

  return (
    <section className="blog-upsert-page">
      <header className="blog-document-header">
        <div><button className="blog-back-link" onClick={onBack} type="button"><ArrowLeft size={16} />Blog</button><h2>{article ? "Edit Article" : "New Article"}</h2><p>Write, organise, preview, and publish with a focused editorial workflow.</p></div>
      </header>
      <form key={String(article?.uuid ?? "new")} onSubmit={submit} ref={formRef}>
        <div className="blog-upsert-layout">
          <main>
            <section className="blog-editor-section">
              <label>Article title<input defaultValue={textValue(article?.title)} name="title" placeholder="Add a clear article title" required /></label>
              <Suspense fallback={<div className="blog-editor-card blog-editor-loading">Loading editor...</div>}>
                <BlogRichEditor onChange={setBodyHtml} value={bodyHtml} />
              </Suspense>
            </section>
            <section className="blog-editor-section blog-writing-fields">
              <header className="blog-writing-heading">
                <div><h3>Article introduction</h3><p>Summary supports internal context; excerpt appears on public Blog cards.</p></div>
                <button aria-label="Generate summary and excerpt" onClick={generateSummaryAndExcerpt} title="Generate summary and excerpt" type="button"><Sparkles size={16} /></button>
              </header>
              <label>Summary<textarea maxLength={320} name="summary" onChange={(event) => setSummary(event.target.value)} rows={4} value={summary} /><small>{summary.length}/320</small></label>
              <label>Excerpt<textarea maxLength={160} name="excerpt" onChange={(event) => setExcerpt(event.target.value)} rows={3} value={excerpt} /><small>{excerpt.length}/160</small></label>
              <div className="blog-featured-image-field">
                <span>Featured image</span>
                <input name="imageUrl" type="hidden" value={featuredImage} />
                {featuredImage ? <img alt="" src={featuredImage} /> : <div><Image size={30} /><small>No featured image selected</small></div>}
                <div>
                  <button onClick={() => setMediaOpen(true)} type="button"><Image size={16} />Choose from Media</button>
                  {featuredImage ? <button onClick={() => setFeaturedImage("")} type="button"><Trash2 size={16} />Remove</button> : null}
                </div>
              </div>
            </section>
            <section className="blog-editor-section">
              <header className="blog-seo-heading">
                <div><h3>Search appearance</h3><p>Preview and refine how this article appears in search results.</p></div>
                <button aria-label="Generate SEO" onClick={(event) => generateSeo(event.currentTarget.form!)} title="Generate SEO" type="button"><Sparkles size={16} /></button>
              </header>
              <div className="blog-field-grid">
                <label>SEO title<input maxLength={60} name="seoTitle" onChange={(event) => setSeoTitle(event.target.value)} value={seoTitle} /><small>{seoTitle.length}/60</small></label>
                <label>Permalink<input name="slug" onChange={(event) => setSlug(event.target.value)} placeholder="article-url-slug" value={slug} /></label>
                <label>Canonical URL<input name="canonicalUrl" onChange={(event) => setCanonicalUrl(event.target.value)} value={canonicalUrl} /></label>
                <label className="wide">Meta description<textarea maxLength={160} name="seoDescription" onChange={(event) => setSeoDescription(event.target.value)} rows={3} value={seoDescription} /><small>{seoDescription.length}/160</small></label>
              </div>
            </section>
          </main>
          <aside className="blog-editor-sidebar">
            <section>
              <h3>Publish</h3>
              <label>Status<select defaultValue={textValue(article?.status) || "draft"} name="status"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
              <label>Reading time<input defaultValue={textValue(article?.reading_minutes)} min="1" name="readingMinutes" type="number" /></label>
              <label className="blog-check"><input defaultChecked={article?.featured === 1} name="featured" type="checkbox" />Feature this article</label>
              <label className="blog-check"><input defaultChecked={article?.allow_comments !== 0} name="allowComments" type="checkbox" />Allow moderated comments</label>
            </section>
            <section>
              <h3>Public page</h3>
              <label className="blog-check"><input checked={publicShow} onChange={(event) => setPublicShow(event.target.checked)} type="checkbox" />Show on public Blog area</label>
              <label>Order<input min="1" onChange={(event) => setPublicOrder(event.target.value)} placeholder="Auto" type="number" value={publicOrder} /></label>
              <label>Room<select onChange={(event) => setPublicRoom(event.target.value)} value={publicRoom}><option value="">Random room</option><option value="1">Room 1</option><option value="2">Room 2</option><option value="3">Room 3</option></select></label>
              <small className="blog-sidebar-note">Current public home uses 3 rooms. Future rooms can be added without changing article data.</small>
            </section>
            <section>
              <h3>Categories</h3>
              <TaxonomyMultiLookup
                createLabel="category"
                onChange={setSelectedCategories}
                onCreate={(name) => saveTaxonomy("categories", name)}
                options={categories}
                placeholder="Search or create category"
                values={selectedCategories}
              />
            </section>
            <section>
              <h3>Tags</h3>
              <TaxonomyMultiLookup
                createLabel="tag"
                onChange={setSelectedTags}
                onCreate={(name) => saveTaxonomy("tags", name)}
                options={tags}
                placeholder="Search or create tag"
                valueMode="name"
                values={selectedTags}
              />
            </section>
            <section>
              <h3>Related articles</h3>
              <RelatedArticlePicker articles={articles} currentArticle={article} onChange={setSelectedRelated} values={selectedRelated} />
            </section>
          </aside>
        </div>
        <footer className="blog-editor-footer">
          <span>{autoSaveLabel || "Autosave every 30 seconds"}</span>
          <button onClick={saveLocalDraft} type="button"><RefreshCw size={16} />Save Draft Copy</button>
          <button disabled={saving} onClick={onBack} type="button"><X size={16} />Cancel</button>
          <button className="primary" disabled={saving} type="submit">{saving ? <RefreshCw className="spin" size={16} /> : <Check size={16} />}{article ? "Update Article" : "Save Article"}</button>
        </footer>
      </form>
      <BlogMediaPicker
        onClose={() => setMediaOpen(false)}
        onSelect={(asset) => {
          setFeaturedImage(asset.public_url)
          setMediaOpen(false)
        }}
        open={mediaOpen}
      />
    </section>
  )
}

function TaxonomyMultiLookup({ createLabel, onChange, onCreate, options, placeholder, valueMode = "slug", values }: {
  createLabel: string
  onChange(values: string[]): void
  onCreate(name: string): Promise<Row>
  options: Row[]
  placeholder: string
  valueMode?: "name" | "slug"
  values: string[]
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const normalized = query.trim().toLowerCase()
  const filtered = options.filter((option) => {
    const value = taxonomyValue(option, valueMode)
    return !values.includes(value) && (!normalized || textValue(option.name).toLowerCase().includes(normalized) || textValue(option.slug).toLowerCase().includes(normalized))
  })
  const exact = options.some((option) => textValue(option.name).trim().toLowerCase() === normalized)
  const canCreate = Boolean(normalized && !exact && !creating)

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  function select(option: Row) {
    const value = taxonomyValue(option, valueMode)
    if (!values.includes(value)) onChange([...values, value])
    setQuery("")
    setOpen(true)
  }

  async function create() {
    const name = query.trim()
    if (!name || !canCreate) return
    setCreating(true)
    try {
      const option = await onCreate(name)
      select(option)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="taxonomy-lookup" ref={rootRef}>
      <div className="taxonomy-selection">
        {values.map((value) => {
          const option = options.find((item) => taxonomyValue(item, valueMode) === value)
          return <span key={value}>{textValue(option?.name) || value}<button aria-label={`Remove ${textValue(option?.name) || value}`} onClick={() => onChange(values.filter((item) => item !== value))} type="button"><X size={13} /></button></span>
        })}
        <div className="taxonomy-input-row">
          <Search size={16} />
          <input
            aria-autocomplete="list"
            aria-expanded={open}
            onChange={(event) => { setQuery(event.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                if (filtered[0]) select(filtered[0])
                else if (canCreate) void create()
              }
              if (event.key === "Escape") setOpen(false)
              if (event.key === "Backspace" && !query && values.length) onChange(values.slice(0, -1))
            }}
            placeholder={values.length ? "Add another" : placeholder}
            role="combobox"
            value={query}
          />
        </div>
      </div>
      {open ? (
        <div className="taxonomy-options" role="listbox">
          {filtered.map((option) => (
            <button key={textValue(option.uuid)} onMouseDown={(event) => event.preventDefault()} onClick={() => select(option)} role="option" type="button">
              <span>{textValue(option.name)}</span>
              <small>{textValue(option.slug)}</small>
            </button>
          ))}
          {canCreate ? <button className="create" onMouseDown={(event) => event.preventDefault()} onClick={() => void create()} type="button"><Plus size={16} />Create {createLabel} "{query.trim()}"</button> : null}
          {!filtered.length && !canCreate ? <p>No more {createLabel}s found.</p> : null}
        </div>
      ) : null}
    </div>
  )
}

export function BlogTaxonomyPage({ kind, onNotice }: { kind: "categories" | "tags"; onNotice(message: string): void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [editing, setEditing] = useState<Row | null>(null)
  const [popupOpen, setPopupOpen] = useState(false)
  const title = kind === "categories" ? "Categories" : "Tags"
  const singular = kind === "categories" ? "Category" : "Tag"

  const filteredRows = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesSearch = !normalized || textValue(row.name).toLowerCase().includes(normalized) || textValue(row.slug).toLowerCase().includes(normalized) || textValue(row.description).toLowerCase().includes(normalized)
      const matchesStatus = status === "all" || textValue(row.status) === status
      return matchesSearch && matchesStatus
    })
  }, [rows, search, status])

  const load = () => adminApi<{ records: Row[] }>(`/blog/${kind}?limit=500`).then((result) => setRows(result.records))

  useEffect(() => {
    load().catch(() => undefined)
  }, [kind])

  function openNew() {
    setEditing(null)
    setPopupOpen(true)
  }

  function openEdit(row: Row) {
    setEditing(row)
    setPopupOpen(true)
  }

  async function saveTaxonomy(data: Record<string, FormDataEntryValue>) {
    const uuid = textValue(editing?.uuid)
    await adminApi(`/blog/${kind}${uuid ? `/${uuid}` : ""}`, {
      method: uuid ? "PUT" : "POST",
      body: JSON.stringify({
        color: data.color,
        description: data.description,
        name: data.name,
        slug: data.slug,
        sortOrder: data.sortOrder,
        status: data.status || "active",
      }),
    })
    setPopupOpen(false)
    setEditing(null)
    await load()
    onNotice(`${singular} ${uuid ? "updated" : "created"}.`)
  }

  return (
    <section className="blog-module blog-taxonomy-page">
      <header className="blog-list-header">
        <div>
          <h2>Blog {title}</h2>
          <p>Maintain reusable {title.toLowerCase()} for Blog Post assignment and public article filtering.</p>
        </div>
        <div className="blog-header-actions">
          <button onClick={() => void load()} type="button"><RefreshCw size={16} />Refresh</button>
          <button className="primary" onClick={openNew} type="button"><Plus size={16} />New {singular}</button>
        </div>
      </header>
      <div className="blog-list-toolbar">
        <label><Search size={17} /><input onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${title.toLowerCase()}, slug, or description`} value={search} /></label>
        <select onChange={(event) => setStatus(event.target.value)} value={status}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="blog-list-table">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{singular}</th>
              <th>Description</th>
              {kind === "categories" ? <th>Color</th> : null}
              {kind === "categories" ? <th>Sort</th> : null}
              <th>Status</th>
              <th>Updated</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <tr key={textValue(row.uuid)}>
                <td>{index + 1}</td>
                <td>
                  <button className="blog-title-link" onClick={() => openEdit(row)} type="button">{textValue(row.name)}</button>
                  <small>/{textValue(row.slug)}</small>
                </td>
                <td>{textValue(row.description) || "-"}</td>
                {kind === "categories" ? <td><span className="taxonomy-color-chip" style={{ "--taxonomy-color": textValue(row.color) || "#0ea5e9" } as CSSProperties}>{textValue(row.color) || "#0ea5e9"}</span></td> : null}
                {kind === "categories" ? <td>{textValue(row.sort_order) || "0"}</td> : null}
                <td><BlogStatus status={textValue(row.status) || "active"} /></td>
                <td>{formatAdminDate(row.updated_at)}</td>
                <td><button className="taxonomy-edit-button" onClick={() => openEdit(row)} type="button"><Pencil size={15} />Edit</button></td>
              </tr>
            ))}
            {!filteredRows.length ? <tr><td className="blog-empty-row" colSpan={kind === "categories" ? 8 : 6}>No {title.toLowerCase()} found.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <footer className="blog-list-footer">
        <span>Total {title.toLowerCase()}: <strong>{filteredRows.length}</strong></span>
      </footer>
      {popupOpen ? (
        <TaxonomyUpsertPopup
          kind={kind}
          row={editing}
          onClose={() => { setPopupOpen(false); setEditing(null) }}
          onSave={saveTaxonomy}
        />
      ) : null}
    </section>
  )
}

function TaxonomyUpsertPopup({ kind, onClose, onSave, row }: {
  kind: "categories" | "tags"
  onClose(): void
  onSave(data: Record<string, FormDataEntryValue>): Promise<void>
  row: Row | null
}) {
  const [saving, setSaving] = useState(false)
  const title = kind === "categories" ? "Category" : "Tag"

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave(Object.fromEntries(new FormData(event.currentTarget).entries()))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="taxonomy-popup-overlay" role="presentation">
      <section aria-label={`${row ? "Edit" : "New"} blog ${title.toLowerCase()}`} className="taxonomy-popup taxonomy-upsert-popup" role="dialog">
        <header>
          <div><small>Blog taxonomy</small><h2>{row ? "Edit" : "New"} {title}</h2></div>
          <button aria-label="Close taxonomy form" onClick={onClose} type="button"><X size={18} /></button>
        </header>
        <form className="taxonomy-manager-form" key={textValue(row?.uuid) || "new"} onSubmit={submit}>
          <label>Name<input defaultValue={textValue(row?.name)} name="name" placeholder={`${title} name`} required /></label>
          <label>Slug<input defaultValue={textValue(row?.slug)} name="slug" placeholder="auto-from-name" /></label>
          {kind === "categories" ? <label>Color<input defaultValue={textValue(row?.color) || "#0ea5e9"} name="color" placeholder="#0ea5e9" /></label> : null}
          {kind === "categories" ? <label>Sort order<input defaultValue={textValue(row?.sort_order)} name="sortOrder" type="number" /></label> : null}
          <label>Status<select defaultValue={textValue(row?.status) || "active"} name="status"><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
          <label>Description<textarea defaultValue={textValue(row?.description)} name="description" rows={3} /></label>
          <div>
            <button onClick={onClose} type="button">Cancel</button>
            <button className="primary" disabled={saving} type="submit">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function RelatedArticlePicker({ articles, currentArticle, onChange, values }: { articles: Row[]; currentArticle: Row | null; onChange(values: string[]): void; values: string[] }) {
  const [query, setQuery] = useState("")
  const available = useMemo(() => articles
    .filter((article) => textValue(article.uuid) !== textValue(currentArticle?.uuid))
    .filter((article) => {
      const normalized = query.trim().toLowerCase()
      return !normalized || textValue(article.title).toLowerCase().includes(normalized) || textValue(article.slug).toLowerCase().includes(normalized)
    })
    .slice(0, 8), [articles, currentArticle, query])

  function toggle(slug: string) {
    if (!slug) return
    if (values.includes(slug)) onChange(values.filter((item) => item !== slug))
    else onChange([...values, slug].slice(0, 6))
  }

  return (
    <div className="related-picker">
      <label><Search size={15} /><input onChange={(event) => setQuery(event.target.value)} placeholder="Search related articles" value={query} /></label>
      <div>
        {available.map((article) => {
          const slug = textValue(article.slug)
          return (
            <button className={values.includes(slug) ? "selected" : ""} key={textValue(article.uuid)} onClick={() => toggle(slug)} type="button">
              <span>{textValue(article.title)}</span>
              <small>/{slug}</small>
            </button>
          )
        })}
      </div>
      <small>{values.length ? `${values.length} related article${values.length === 1 ? "" : "s"} selected` : "Automatic category related articles will be used if none are selected."}</small>
    </div>
  )
}

function BlogMediaPicker({ onClose, onSelect, open }: { onClose(): void; onSelect(asset: BlogMediaAsset): void; open: boolean }) {
  const [assets, setAssets] = useState<BlogMediaAsset[]>([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<BlogMediaAsset | null>(null)
  const [altText, setAltText] = useState("")
  const [caption, setCaption] = useState("")
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const result = await adminApi<{ records: BlogMediaAsset[] }>(`/blog/media${search ? `?search=${encodeURIComponent(search)}` : ""}`)
      setAssets(result.records)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) void load()
  }, [open])

  async function upload(file: File) {
    setLoading(true)
    try {
      const asset = await adminApi<BlogMediaAsset>("/blog/media/upload", {
        method: "POST",
        body: JSON.stringify({
          base64: await fileToBase64(file),
          fileName: file.name,
          mimeType: file.type,
          altText: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
        }),
      })
      await load()
      setSelected(asset)
      setAltText(asset.alt_text || "")
      setCaption(asset.caption || "")
    } finally {
      setLoading(false)
    }
  }

  function choose(asset: BlogMediaAsset) {
    setSelected(asset)
    setAltText(asset.alt_text || "")
    setCaption(asset.caption || "")
  }

  async function saveDetails() {
    if (!selected) return
    setLoading(true)
    try {
      const updated = await adminApi<BlogMediaAsset>(`/blog/media/${selected.uuid}`, {
        method: "PUT",
        body: JSON.stringify({ altText, caption }),
      })
      setSelected(updated)
      setAssets((items) => items.map((item) => item.uuid === updated.uuid ? updated : item))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null
  return (
    <div className="blog-media-overlay" role="presentation">
      <section aria-label="Featured image media manager" className="blog-media-dialog" role="dialog">
        <header><div><small>Media Manager</small><h2>Choose featured image</h2><p>Public images are stored in <code>blog/featured-images</code>.</p></div><button aria-label="Close media manager" onClick={onClose} type="button"><X size={18} /></button></header>
        <div className="blog-media-toolbar">
          <label><Search size={17} /><input onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load() }} placeholder="Search media" value={search} /></label>
          <span>blog/featured-images</span>
          <label className="blog-media-upload"><Upload size={16} />{loading ? "Working..." : "Upload image"}<input accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" disabled={loading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file) }} type="file" /></label>
        </div>
        <div className="blog-media-grid">
          {assets.map((asset) => (
            <button className={selected?.uuid === asset.uuid ? "selected" : ""} key={asset.uuid} onClick={() => choose(asset)} onDoubleClick={() => onSelect(asset)} type="button">
              <img alt={asset.alt_text || asset.original_name} src={asset.public_url} />
              <span>{asset.original_name}</span>
              <small>{formatAdminDate(asset.created_at)}</small>
            </button>
          ))}
          {!loading && !assets.length ? <div className="blog-media-empty"><Image size={34} /><p>No Blog media found. Upload the first featured image.</p></div> : null}
        </div>
        {selected ? (
          <div className="blog-media-details">
            <label>Alt text<input onChange={(event) => setAltText(event.target.value)} value={altText} /></label>
            <label>Caption<input onChange={(event) => setCaption(event.target.value)} value={caption} /></label>
            <button disabled={loading} onClick={() => void saveDetails()} type="button"><Check size={16} />Save details</button>
          </div>
        ) : null}
        <footer><button onClick={onClose} type="button">Cancel</button><button className="primary" disabled={!selected} onClick={() => selected && onSelect(selected)} type="button"><Check size={16} />Use featured image</button></footer>
      </section>
    </div>
  )
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image."))
    reader.onload = () => resolve(String(reader.result ?? "").split(",").at(-1) ?? "")
    reader.readAsDataURL(file)
  })
}

async function saveBlogArticle(article: Row | null, changes: Record<string, unknown>) {
  const uuid = textValue(article?.uuid)
  const tags = changes.tags ?? articleTagNames(article)
  const metadata = metadataValue(article)
  const publicOrder = Object.hasOwn(changes, "publicOrder") ? nullableNumberValue(changes.publicOrder) : nullableNumberValue(metadata.publicOrder)
  const publicRoom = Object.hasOwn(changes, "publicRoom") ? nullableNumberValue(changes.publicRoom) : nullableNumberValue(metadata.publicRoom)
  const publicShow = Object.hasOwn(changes, "publicShow") ? changes.publicShow !== false : metadata.publicShow !== false
  return adminApi<Row>(uuid ? `/content/article/${uuid}` : "/content/article", {
    method: uuid ? "PUT" : "POST",
    body: JSON.stringify({
      title: textValue(changes.title ?? article?.title),
      slug: textValue(changes.slug ?? article?.slug),
      category: Array.isArray(changes.categories) ? textValue(changes.categories[0]) : textValue(changes.category ?? article?.category),
      categories: changes.categories ?? articleCategorySlugs(article),
      status: textValue(changes.status ?? article?.status) || "draft",
      imageUrl: textValue(changes.imageUrl ?? article?.image_url),
      readingMinutes: changes.readingMinutes ?? article?.reading_minutes,
      summary: textValue(changes.summary ?? article?.summary),
      excerpt: textValue(changes.excerpt ?? article?.excerpt),
      body: textValue(changes.body ?? article?.body),
      seoTitle: textValue(changes.seoTitle ?? article?.seo_title),
      seoDescription: textValue(changes.seoDescription ?? article?.seo_description),
      canonicalUrl: textValue(changes.canonicalUrl ?? article?.canonical_url),
      allowComments: changes.allowComments ?? article?.allow_comments !== 0,
      featured: changes.featured ?? article?.featured === 1,
      tags,
      metadata: {
        ...metadata,
        editor: "tiptap",
        publicOrder,
        publicRoom,
        publicShow,
        relatedSlugs: Array.isArray(changes.relatedSlugs) ? changes.relatedSlugs : relatedSlugs(article),
        tags,
      },
    }),
  })
}

function articleTagNames(article: Row | null) {
  return Array.isArray(article?.tags) ? (article.tags as Array<{ name?: string }>).map((tag) => String(tag.name ?? "")).filter(Boolean) : []
}

function relatedSlugs(article: Row | null) {
  const metadata = metadataValue(article)
  return Array.isArray(metadata.relatedSlugs) ? metadata.relatedSlugs.map((item) => String(item)).filter(Boolean) : []
}

function articleCategorySlugs(article: Row | null) {
  if (Array.isArray(article?.categories)) {
    return (article.categories as Array<{ slug?: string }>).map((category) => String(category.slug ?? "")).filter(Boolean)
  }
  return textValue(article?.category) ? [textValue(article?.category)] : []
}

function taxonomyValue(option: Row, mode: "name" | "slug") {
  return textValue(option[mode] ?? option.name)
}

function metadataValue(article: Row | null) {
  if (!article?.metadata) return {} as Record<string, unknown>
  if (typeof article.metadata === "object") return article.metadata as Record<string, unknown>
  try {
    return JSON.parse(String(article.metadata)) as Record<string, unknown>
  } catch {
    return {}
  }
}

function nullableNumberValue(value: unknown) {
  if (value === "" || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function commentStatusCounts(comments: Row[]) {
  return ["pending", "approved", "spam", "archived"].map((status) => ({
    count: comments.filter((comment) => textValue(comment.status) === status).length,
    label: status,
    status,
  }))
}

function BlogStatus({ status }: { status: string }) {
  return <span className={`blog-status is-${status || "draft"}`}>{status || "draft"}</span>
}

function formatAdminDate(value: unknown) {
  if (!value) return "-"
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function slugifyText(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function limitText(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim()
  if (normalized.length <= limit) return normalized
  const shortened = normalized.slice(0, limit).replace(/\s+\S*$/, "").trim()
  return `${(shortened || normalized.slice(0, limit - 1)).slice(0, limit - 1).trim()}...`
}

function textValue(value: unknown) {
  return value == null ? "" : String(value)
}
