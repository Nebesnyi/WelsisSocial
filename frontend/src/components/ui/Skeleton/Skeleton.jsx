export function Skeleton({ width, height, borderRadius = 6, className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width || '100%',
        height: height || 20,
        borderRadius: borderRadius,
        background: 'linear-gradient(90deg, var(--border) 25%, var(--border-light) 50%, var(--border) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-loading 1.5s infinite',
      }}
    />
  )
}

export function SkeletonPost() {
  return (
    <div className="card" style={{ padding: 16, height: 140 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <Skeleton width={38} height={38} borderRadius="50%" />
        <div style={{ flex: 1 }}>
          <Skeleton width="30%" height={12} style={{ marginBottom: 6 }} />
          <Skeleton width="15%" height={10} />
        </div>
      </div>
      <Skeleton height={10} style={{ marginBottom: 8 }} />
      <Skeleton width="80%" height={10} />
    </div>
  )
}

export function SkeletonChat() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px' }}>
      <Skeleton width={50} height={50} borderRadius="50%" />
      <div style={{ flex: 1 }}>
        <Skeleton width="40%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="60%" height={12} />
      </div>
    </div>
  )
}

export function SkeletonProfile() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 20px' }}>
      <div className="card" style={{ padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 32 }}>
        <Skeleton width={60} height={24} />
        <Skeleton width={60} height={24} />
        <Skeleton width={60} height={24} />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="card" style={{ padding: 16, height: 100, marginBottom: 12 }}>
          <Skeleton height={10} width="80%" style={{ marginBottom: 8 }} />
          <Skeleton height={10} width="55%" />
        </div>
      ))}
    </div>
  )
}

export default Skeleton
