'use client'

import { useEffect, useState } from 'react'
import { getPublishReadiness } from '@/lib/seo/publish-readiness'

type Post = {
  id: string
  title: string
  status: string
  content: string
  faq_json: any
  featured_image_url?: string
  og_image_url?: string
  meta_title?: string
  meta_description?: string
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/posts') // FIXED
      .then((res) => res.json())
      .then((data) => {
        setPosts(data)
        setLoading(false)
      })
  }, [])

  async function publishPost(id: string) {
    await fetch('/api/admin/publish-post', {
      method: 'POST',
      body: JSON.stringify({ id }),
    })
    location.reload()
  }

  async function regeneratePost(id: string) {
  await fetch('/api/admin/auto-fix-post', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
  location.reload()
  }

  if (loading) return <div>Loading...</div>

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Dashboard</h1>

      <table style={{ width: '100%', marginTop: 20, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">Title</th>
            <th>Status</th>
            <th>Readiness</th>
            <th>Details</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {posts.map((post) => {
            const readiness = getPublishReadiness(post)

            return (
              <tr key={post.id} style={{ borderTop: '1px solid #ddd' }}>
                <td>{post.title}</td>

                <td>{post.status}</td>

                <td>
                  {readiness.status === 'ready' && (
                    <span style={{ color: 'green' }}>Ready</span>
                  )}
                  {readiness.status === 'needs_review' && (
                    <span style={{ color: 'orange' }}>Needs Review</span>
                  )}
                  {readiness.status === 'failed' && (
                    <span style={{ color: 'red' }}>Failed</span>
                  )}
                </td>

                <td>
                  {readiness.blockers.map((b: string) => (
                    <div key={b} style={{ color: 'red', fontSize: 12 }}>
                      {b}
                    </div>
                  ))}

                  {readiness.warnings.map((w: string) => (
                    <div key={w} style={{ color: 'orange', fontSize: 12 }}>
                      {w}
                    </div>
                  ))}
                </td>

                <td>
                  <button
                    disabled={readiness.status !== 'ready'}
                    onClick={() => publishPost(post.id)}
                    style={{ marginRight: 8 }}
                  >
                    Publish
                  </button>

                  <button onClick={() => regeneratePost(post.id)}>
                    Auto-fix
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}